import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import * as THREE from "three";
import { DDSLoader } from "three/examples/jsm/loaders/DDSLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { TGALoader } from "three/examples/jsm/loaders/TGALoader.js";
import {
  applyPlaceableTexturesToModel,
  ensureNormalizedPlaceableModel,
  ensurePlaceableTexturesByReference,
  PLACEABLE_PREVIEW_MODEL_TARGET_MAX_AXIS_FACTOR,
  type PlaceableModelRuntimeCache,
  type PlaceableTextureRuntimeCache
} from "../../placeables/adapters/three/placeableThreeAssetLoader";
import type { PlaceableViewportRenderPayload } from "../../placeables/application/placeableRenderPayloadResolver";
import {
  applyPlaceableAssetRequestHeaders,
  createAuroraGltfLoadingManager,
  type PlaceableAssetRequestHeaderRuntime
} from "../adapters/three/workspaceThreeRuntime";
import type { SceneObject, SceneObjectKind } from "../contracts";
import {
  resolvePlaceableModelResolution,
  resolvePlaceableTextureDeliveryUrlsByReference
} from "../application/workspacePlaceableRenderContracts";
import {
  type ItemRenderArmorPartModelResolution,
  resolveItemArmorPartModelResolutions,
  resolveItemModelPartResolutions,
  resolveItemTextureDeliveryUrlsByReference
} from "../../items/application/itemRenderAssetResolver";
import { composeItemIconPreview } from "../../items/application/itemIconComposer";
import {
  buildItemPltPaletteRowsByLayer,
  resolveItemArmorMaterialColorSlot,
  resolveItemMaterialColorHex
} from "../../items/application/itemPresentation";
import { resolveItemThumbnail2dContract } from "../../items/application/itemThumbnail2dContract";
import { resolveItemThumbnailFrontConvention } from "../../items/application/itemThumbnailFrontConvention";
import { ThumbnailHoverPreview } from "./ThumbnailHoverPreview";

interface SceneObjectThumbnailProps {
  object: SceneObject;
  fallbackLabel: string;
  renderPayload?: PlaceableViewportRenderPayload | null;
  placeableAssetAccessToken?: string | null;
  onRenderPayloadNeeded?: (object: SceneObject) => void;
  thumbnailRenderEnabled?: boolean;
  allowGeneratedFallback?: boolean;
  preferModelPreview?: boolean;
  forceRender?: boolean;
}

type ThumbnailRuntime = PlaceableModelRuntimeCache & PlaceableTextureRuntimeCache;
type ThumbnailMaterial = THREE.Material & {
  color?: THREE.Color;
  emissive?: THREE.Color;
  emissiveIntensity?: number;
};
type TightItemThumbnailImage = {
  dataUrl: string;
  width: number;
  height: number;
};

const THUMBNAIL_IMAGE_SIZE = 48;
const THUMBNAIL_RENDER_SIZE = 256;
const THUMBNAIL_HOVER_PREVIEW_SIZE = 240;
const ITEM_THUMBNAIL_MODEL_FRAME_SIZE = 54;
const ITEM_THUMBNAIL_CONTENT_ALPHA_THRESHOLD = 8;
const ITEM_THUMBNAIL_CROP_EDGE_PADDING_PX = 2;
const ITEM_THUMBNAIL_MIN_SAFE_OUTPUT_PADDING_PX = 4;
const ITEM_THUMBNAIL_WEAPON_MIN_SAFE_OUTPUT_PADDING_PX = 8;
const ITEM_THUMBNAIL_WEAPON_SAFE_OUTPUT_PADDING_RATIO = 0.085;
const ITEM_THUMBNAIL_WEAPON_MAX_SAFE_OUTPUT_PADDING_PX = 28;
const ITEM_THUMBNAIL_ARMOR_TARGETS: Record<string, [number, number, number]> = {
  rFoot: [0.12, -1.18, 0.08],
  lFoot: [-0.12, -1.18, 0.08],
  rShin: [0.11, -0.88, 0],
  lShin: [-0.11, -0.88, 0],
  rThigh: [0.12, -0.42, 0],
  lThigh: [-0.12, -0.42, 0],
  pelvis: [0, -0.08, 0],
  belt: [0, 0.1, 0.015],
  torso: [0, 0.38, 0],
  robe: [0, 0.12, 0],
  neck: [0, 0.72, 0],
  rShoul: [0.3, 0.58, 0.015],
  lShoul: [-0.3, 0.58, 0.015],
  rBicep: [0.38, 0.34, 0.015],
  lBicep: [-0.38, 0.34, 0.015],
  rFArm: [0.44, 0.05, 0.015],
  lFArm: [-0.44, 0.05, 0.015],
  rHand: [0.46, -0.18, 0.015],
  lHand: [-0.46, -0.18, 0.015]
};
const ITEM_THUMBNAIL_ARMOR_WAIST_SEAM_PELVIS_OVERLAP_Y = 0.026;
const ITEM_THUMBNAIL_ARMOR_SKELETON_MODE = "pmh0-sourcehierarchy-anchors";
const ITEM_THUMBNAIL_ARMOR_ATTACHMENT_TARGETS: Record<string, string> = {
  torso: "torso_g",
  robe: "torso_g",
  pelvis: "pelvis_g",
  belt: "belt_g",
  neck: "neck_g",
  lShoul: "lshoulder_g",
  rShoul: "rshoulder_g",
  lBicep: "lbicep_g",
  rBicep: "rbicep_g",
  lFArm: "lforearm_g",
  rFArm: "rforearm_g",
  lHand: "lhand_g",
  rHand: "rhand_g",
  lThigh: "lthigh_g",
  rThigh: "rthigh_g",
  lShin: "lshin_g",
  rShin: "rshin_g",
  lFoot: "lfoot_g",
  rFoot: "rfoot_g"
};
const ITEM_THUMBNAIL_ARMOR_SYNTHETIC_SKELETON_NODES: ReadonlyArray<{
  name: string;
  parentName?: string;
  sourcePosition: [number, number, number];
}> = [
  { name: "rootdummy", sourcePosition: [-0.000405171, 0.020006901, 1.20720005] },
  { name: "torso_g", parentName: "rootdummy", sourcePosition: [0.000405168, 0.0108289, 0.000205994] },
  { name: "neck_g", parentName: "torso_g", sourcePosition: [0, -0.081052803, 0.468950003] },
  { name: "pelvis_g", parentName: "rootdummy", sourcePosition: [0.000405168, 0.0108289, 0.000205994] },
  { name: "belt_g1", parentName: "rootdummy", sourcePosition: [0.00356029, 0.0103383, 0.000206528] },
  { name: "belt_g", parentName: "belt_g1", sourcePosition: [0, 0, 0] },
  { name: "lbicep_g", parentName: "torso_g", sourcePosition: [-0.201004997, -0.079490297, 0.349985003] },
  { name: "lshoulder_g", parentName: "lbicep_g", sourcePosition: [0, 0, 0] },
  { name: "lforearm_g", parentName: "lbicep_g", sourcePosition: [-0.039034601, 0.021219101, -0.30192101] },
  { name: "lhand_g", parentName: "lforearm_g", sourcePosition: [-0.033089999, 0.0228936, -0.291763008] },
  { name: "rbicep_g", parentName: "torso_g", sourcePosition: [0.201010004, -0.079490297, 0.349985987] },
  { name: "rshoulder_g", parentName: "rbicep_g", sourcePosition: [0, 0, 0] },
  { name: "rforearm_g", parentName: "rbicep_g", sourcePosition: [0.039030001, 0.021219101, -0.30192101] },
  { name: "rhand_g", parentName: "rforearm_g", sourcePosition: [0.033089999, 0.0228936, -0.291763008] },
  { name: "lthigh_g", parentName: "pelvis_g", sourcePosition: [-0.108069003, -0.0234426, -0.182440996] },
  { name: "lshin_g", parentName: "lthigh_g", sourcePosition: [0.030621801, -0.016471099, -0.46093601] },
  { name: "lfoot_g", parentName: "lshin_g", sourcePosition: [0.020427, -0.066626601, -0.42740801] },
  { name: "rthigh_g", parentName: "pelvis_g", sourcePosition: [0.108070001, -0.0234426, -0.182440996] },
  { name: "rshin_g", parentName: "rthigh_g", sourcePosition: [-0.030619999, -0.016471099, -0.46093601] },
  { name: "rfoot_g", parentName: "rshin_g", sourcePosition: [-0.02043, -0.066626698, -0.42740801] }
];

const KIND_BADGE: Record<SceneObjectKind, string> = {
  placeables: "PLC",
  creatures: "CRT",
  doors: "DOR",
  encounters: "ENC",
  items: "ITM",
  sounds: "SND",
  stores: "STO",
  triggers: "TRG",
  waypoints: "WPT"
};

const KIND_COLORS: Record<SceneObjectKind, string> = {
  placeables: "#5f9cff",
  creatures: "#ff8e78",
  doors: "#ffc980",
  encounters: "#e9ca5f",
  items: "#91e8a5",
  sounds: "#bba0ff",
  stores: "#8fd8ca",
  triggers: "#f482bd",
  waypoints: "#8fd8ff"
};

let sharedThumbnailRuntime: ThumbnailRuntime | null = null;

function encodeSvg(value: string): string {
  return value
    .replace(/"/g, "'")
    .replace(/%/g, "%25")
    .replace(/#/g, "%23")
    .replace(/{/g, "%7B")
    .replace(/}/g, "%7D")
    .replace(/</g, "%3C")
    .replace(/>/g, "%3E")
    .replace(/\s+/g, " ");
}

function createFallbackPreviewDataUrl(kind: SceneObjectKind, label: string): string {
  const tint = KIND_COLORS[kind];
  const badge = KIND_BADGE[kind];
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
      <rect x="1" y="1" width="46" height="46" rx="8" fill="#0b1728" stroke="#34557d" stroke-width="2" />
      <rect x="4" y="4" width="40" height="18" rx="5" fill="${tint}" fill-opacity="0.35" />
      <text x="24" y="17" text-anchor="middle" font-family="Segoe UI" font-size="9" fill="#f0f6ff" font-weight="700">${badge}</text>
      <text x="24" y="34" text-anchor="middle" font-family="Segoe UI" font-size="8" fill="#c8d9ee">${label}</text>
    </svg>
  `;
  return `data:image/svg+xml,${encodeSvg(svg)}`;
}

function shouldUseProvidedPreviewImageUrl(
  url: string | undefined,
  kind: SceneObjectKind
): url is string {
  const normalizedUrl = url?.trim() ?? "";
  if (normalizedUrl.length < 1) {
    return false;
  }
  if (kind === "items") {
    return (
      !/^\/api\/v1\/catalog\/items\/[^/?#]+\/thumbnail(?:[?#].*)?$/iu.test(normalizedUrl) &&
      !normalizedUrl.startsWith("/assets/previews/items/")
    );
  }
  if (kind === "placeables" || kind === "doors") {
    return (
      !/^\/api\/v1\/catalog\/placeables\/[^/?#]+\/thumbnail(?:[?#].*)?$/iu.test(normalizedUrl) &&
      !normalizedUrl.startsWith("/assets/previews/placeables/")
    );
  }
  return true;
}

function isPlaceableThumbnailCandidate(object: SceneObject): boolean {
  return object.kind === "placeables" || object.kind === "doors";
}

function isItemThumbnailCandidate(object: SceneObject): boolean {
  return object.kind === "items" && collectItemThumbnailModelSources(object).length > 0;
}

function isRenderableThumbnailCandidate(object: SceneObject): boolean {
  return isPlaceableThumbnailCandidate(object) || isItemThumbnailCandidate(object);
}

function canRenderWebGlThumbnail(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof document !== "undefined" &&
    typeof window.WebGLRenderingContext !== "undefined"
  );
}

function getThumbnailRuntime(): ThumbnailRuntime {
  if (sharedThumbnailRuntime) {
    return sharedThumbnailRuntime;
  }

  sharedThumbnailRuntime = {
    placeableModelLoader: new GLTFLoader(createAuroraGltfLoadingManager()),
    placeableModelCacheByUrl: new Map(),
    placeableModelPendingByUrl: new Map(),
    placeableNormalizedModelCacheByKey: new Map(),
    placeableNormalizedModelPendingByKey: new Map(),
    placeableModelLoadConcurrencyLimit: 2,
    placeableModelLoadStartsPerFrameLimit: 1,
    placeableTextureLoader: new THREE.TextureLoader(),
    placeableDdsTextureLoader: new DDSLoader(),
    placeableTgaTextureLoader: new TGALoader(),
    placeableTextureFetch:
      typeof window !== "undefined" ? window.fetch.bind(window) : undefined,
    placeableTextureRequestHeader: {},
    placeableTextureCacheByUrl: new Map(),
    placeableTexturePendingByUrl: new Map(),
    container: {
      dataset: {},
      dispatchEvent: () => false
    }
  };
  return sharedThumbnailRuntime;
}

function disposeRenderedClone(root: THREE.Object3D): void {
  root.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) {
      return;
    }
    node.geometry?.dispose();
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    materials.forEach((material) => {
      material.dispose();
    });
  });
}

function disposeThumbnailRenderer(renderer: THREE.WebGLRenderer | null): void {
  if (!renderer) {
    return;
  }
  renderer.dispose();
}

function frameModelForThumbnail(model: THREE.Object3D): void {
  const bounds = new THREE.Box3().setFromObject(model);
  const center = bounds.getCenter(new THREE.Vector3());
  model.position.sub(center);
  model.rotation.y = -Math.PI / 5;
  model.rotation.x = -Math.PI / 18;
}

function frameItemModelForFrontThumbnail(model: THREE.Object3D, object: SceneObject): void {
  model.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(model);
  if (bounds.isEmpty()) {
    return;
  }
  const center = bounds.getCenter(new THREE.Vector3());
  model.position.sub(center);
  const convention = resolveItemThumbnailFrontConvention(object);
  model.rotation.set(
    convention.modelRotation.x,
    convention.modelRotation.y,
    convention.modelRotation.z
  );
  model.userData = {
    ...model.userData,
    itemThumbnailFrontFamily: convention.family,
    itemThumbnailFrontSource: convention.source,
    itemThumbnailFrontRotation: [
      convention.modelRotation.x,
      convention.modelRotation.y,
      convention.modelRotation.z
    ]
      .map((value) => value.toFixed(4))
      .join(",")
  };
  model.updateMatrixWorld(true);
}

function fitFrontThumbnailCamera(
  camera: THREE.OrthographicCamera,
  model: THREE.Object3D,
  object: SceneObject
): void {
  model.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(model);
  if (bounds.isEmpty()) {
    camera.left = -1;
    camera.right = 1;
    camera.top = 1;
    camera.bottom = -1;
    camera.position.set(0, 0, 4);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    return;
  }

  const center = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3());
  const convention = resolveItemThumbnailFrontConvention(object);
  const widthSize = convention.widthAxis === "z" ? size.z : size.x;
  const depthSize = convention.depthAxis === "x" ? size.x : size.z;
  const halfWidth = Math.max(
    widthSize * 0.5 * convention.padding,
    0.18
  );
  const halfHeight = Math.max(size.y * 0.5 * convention.padding, 0.18);
  const halfDepth = Math.max(depthSize * 0.5, 0.18);
  camera.left = -halfWidth;
  camera.right = halfWidth;
  camera.top = halfHeight;
  camera.bottom = -halfHeight;
  camera.near = 0.01;
  camera.far = Math.max(20, halfDepth * 8);
  const distanceBase =
    convention.family === "armor" ? Math.max(size.x, size.y, size.z) : halfDepth;
  const distance = Math.max(2.2, distanceBase * convention.distanceScale);
  const verticalOffset = Math.max(size.y, 0.35) * convention.verticalBias;
  switch (convention.cameraAxis) {
    case "negative-x":
      camera.position.set(center.x - distance, center.y + verticalOffset, center.z);
      break;
    case "positive-x":
      camera.position.set(center.x + distance, center.y + verticalOffset, center.z);
      break;
    case "positive-z":
    default:
      camera.position.set(center.x, center.y + verticalOffset, center.z + distance);
      break;
  }
  camera.up.set(0, 1, 0);
  camera.lookAt(center);
  camera.userData = {
    ...camera.userData,
    itemThumbnailFrontFamily: convention.family,
    itemThumbnailFrontSource: convention.source,
    itemThumbnailFrontCameraAxis: convention.cameraAxis
  };
  camera.updateProjectionMatrix();
}

function collectItemThumbnailModelSources(object: SceneObject): string[] {
  const armorSources = resolveItemArmorPartModelResolutions(object)
    .map((candidate) => candidate.modelUrl.trim())
    .filter((url) => url.length > 0);
  if (armorSources.length > 0) {
    return [...new Set(armorSources)];
  }
  return [
    ...new Set(
      resolveItemModelPartResolutions(object)
        .map((candidate) => candidate.modelUrl.trim())
        .filter((url) => url.length > 0)
    )
  ];
}

function normalizeItemArmorThumbnailNodeName(value: string): string {
  return value.trim().toLowerCase();
}

function mapItemArmorThumbnailSourceMdlPositionToThree(
  position: [number, number, number]
): THREE.Vector3 {
  const [x, y, z] = position;
  return new THREE.Vector3(x, z, y);
}

function resolveItemArmorThumbnailAttachmentTarget(
  resolution: ItemRenderArmorPartModelResolution
): string {
  if (resolution.slot === "robe") {
    return "";
  }
  const canonicalTarget = ITEM_THUMBNAIL_ARMOR_ATTACHMENT_TARGETS[resolution.slot] ?? "";
  if (
    canonicalTarget &&
    (resolution.slot === "belt" || resolution.slot === "lShoul" || resolution.slot === "rShoul")
  ) {
    return canonicalTarget;
  }
  return resolution.nodeName?.trim() || canonicalTarget;
}

function applyItemArmorThumbnailWaistSeamOverlap(
  loadedEntries: Array<{ resolution: ItemRenderArmorPartModelResolution; model: THREE.Object3D }>
): void {
  const slots = new Set(loadedEntries.map((entry) => entry.resolution.slot));
  if (!slots.has("torso") || !slots.has("pelvis") || slots.has("belt")) {
    return;
  }
  const pelvisEntry = loadedEntries.find((entry) => entry.resolution.slot === "pelvis");
  if (!pelvisEntry) {
    return;
  }
  pelvisEntry.model.position.y += ITEM_THUMBNAIL_ARMOR_WAIST_SEAM_PELVIS_OVERLAP_Y;
  pelvisEntry.model.userData = {
    ...pelvisEntry.model.userData,
    itemThumbnailArmorWaistSeamOverlap: true,
    itemThumbnailArmorWaistSeamOverlapY: ITEM_THUMBNAIL_ARMOR_WAIST_SEAM_PELVIS_OVERLAP_Y
  };
}

function applyItemArmorThumbnailSkeletonLayout(
  modelRoot: THREE.Object3D,
  loadedEntries: Array<{ resolution: ItemRenderArmorPartModelResolution; model: THREE.Object3D }>
): boolean {
  if (loadedEntries.length < 2) {
    return false;
  }

  const skeletonModel = new THREE.Group();
  skeletonModel.name = "item_thumbnail_armor_synthetic_capart_skeleton";
  const anchors = new Map<string, THREE.Object3D>();
  ITEM_THUMBNAIL_ARMOR_SYNTHETIC_SKELETON_NODES.forEach((sourceNode) => {
    const anchor = new THREE.Group();
    anchor.name = sourceNode.name;
    anchor.position.copy(mapItemArmorThumbnailSourceMdlPositionToThree(sourceNode.sourcePosition));
    anchor.userData = {
      itemThumbnailArmorSkeletonAnchor: true,
      itemThumbnailArmorSkeletonMode: ITEM_THUMBNAIL_ARMOR_SKELETON_MODE,
      itemThumbnailArmorSkeletonParentName: sourceNode.parentName ?? ""
    };
    anchors.set(normalizeItemArmorThumbnailNodeName(sourceNode.name), anchor);
  });

  ITEM_THUMBNAIL_ARMOR_SYNTHETIC_SKELETON_NODES.forEach((sourceNode) => {
    const anchor = anchors.get(normalizeItemArmorThumbnailNodeName(sourceNode.name));
    if (!anchor) {
      return;
    }
    const parent = sourceNode.parentName
      ? anchors.get(normalizeItemArmorThumbnailNodeName(sourceNode.parentName))
      : undefined;
    (parent ?? skeletonModel).add(anchor);
  });

  const targetNames = loadedEntries
    .map(({ resolution }) => resolveItemArmorThumbnailAttachmentTarget(resolution))
    .filter((target) => target.length > 0)
    .map(normalizeItemArmorThumbnailNodeName);
  const coveredCount = targetNames.filter((target) => anchors.has(target)).length;
  if (targetNames.length < 1 || coveredCount !== targetNames.length) {
    return false;
  }

  let attachedCount = 0;
  loadedEntries.forEach(({ resolution, model }) => {
    const attachmentTarget = resolveItemArmorThumbnailAttachmentTarget(resolution);
    const anchor = anchors.get(normalizeItemArmorThumbnailNodeName(attachmentTarget));
    if (!anchor) {
      return;
    }
    anchor.add(model);
    model.position.set(0, 0, 0);
    model.userData = {
      ...model.userData,
      itemThumbnailArmorLayoutSlot: resolution.slot,
      itemThumbnailArmorLayoutMode: "skeleton-anchors",
      itemThumbnailArmorSkeletonMode: ITEM_THUMBNAIL_ARMOR_SKELETON_MODE,
      itemThumbnailArmorAttachmentTarget: attachmentTarget,
      itemThumbnailArmorSkeletonAnchorName: anchor.name
    };
    attachedCount += 1;
  });

  if (attachedCount < 1) {
    return false;
  }

  skeletonModel.userData = {
    ...skeletonModel.userData,
    itemThumbnailArmorSkeleton: true,
    itemThumbnailArmorSkeletonMode: ITEM_THUMBNAIL_ARMOR_SKELETON_MODE,
    itemThumbnailArmorSkeletonCoveredCount: coveredCount,
    itemThumbnailArmorSkeletonTargetCount: targetNames.length
  };
  modelRoot.add(skeletonModel);
  modelRoot.userData = {
    ...modelRoot.userData,
    itemThumbnailArmorAssemblyMode: "skeleton-anchors",
    itemThumbnailArmorSkeletonMode: ITEM_THUMBNAIL_ARMOR_SKELETON_MODE
  };
  applyItemArmorThumbnailWaistSeamOverlap(loadedEntries);
  return true;
}

function applyItemArmorThumbnailFallbackLayout(
  loadedEntries: Array<{ resolution: ItemRenderArmorPartModelResolution; model: THREE.Object3D }>
): void {
  if (loadedEntries.length < 2) {
    return;
  }
  loadedEntries.forEach(({ resolution, model }) => {
    const target = ITEM_THUMBNAIL_ARMOR_TARGETS[resolution.slot];
    if (!target) {
      return;
    }
    model.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(model);
    if (bounds.isEmpty()) {
      return;
    }
    const center = bounds.getCenter(new THREE.Vector3());
    model.position.add(new THREE.Vector3(target[0], target[1], target[2]).sub(center));
    model.userData = {
      ...model.userData,
      itemThumbnailArmorLayoutSlot: resolution.slot,
      itemThumbnailArmorLayoutMode: "slot-targets"
    };
  });
  applyItemArmorThumbnailWaistSeamOverlap(loadedEntries);
}

function applyItemArmorThumbnailLayout(
  modelRoot: THREE.Object3D,
  loadedEntries: Array<{ resolution: ItemRenderArmorPartModelResolution; model: THREE.Object3D }>
): void {
  if (applyItemArmorThumbnailSkeletonLayout(modelRoot, loadedEntries)) {
    return;
  }
  applyItemArmorThumbnailFallbackLayout(loadedEntries);
}

function resolveVisibleArmorThumbnailTint(
  tintSlot: keyof NonNullable<NonNullable<SceneObject["itemProperties"]>["materialColors"]>,
  tintValue: number
): THREE.Color {
  return new THREE.Color(resolveItemMaterialColorHex(tintSlot, tintValue));
}

function isItemPaletteTextureMap(texture: THREE.Texture | null | undefined): boolean {
  return Boolean(
    texture?.userData?.isPLT === true ||
      texture?.userData?.auroraIsPlt === true ||
      texture?.userData?.itemPropertiesPreviewRawTextureExtension === "plt"
  );
}

function applyItemArmorThumbnailTints(
  object: SceneObject,
  loadedEntries: Array<{ resolution: ItemRenderArmorPartModelResolution; model: THREE.Object3D }>
): void {
  const materialColors = object.itemProperties?.materialColors;
  if (!materialColors) {
    return;
  }
  loadedEntries.forEach(({ resolution, model }) => {
    const tintSlot = resolveItemArmorMaterialColorSlot(resolution.slot);
    const tintValue = materialColors[tintSlot];
    if (typeof tintValue !== "number" || !Number.isFinite(tintValue)) {
      return;
    }
    const tint = resolveVisibleArmorThumbnailTint(tintSlot, tintValue);
    model.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) {
        return;
      }
      const materials = Array.isArray(node.material) ? node.material : [node.material];
      materials.forEach((material) => {
        const previewMaterial = material as ThumbnailMaterial;
        const textureMap =
          "map" in previewMaterial && previewMaterial.map instanceof THREE.Texture
            ? previewMaterial.map
            : null;
        const preservesPaletteColor = isItemPaletteTextureMap(textureMap);
        previewMaterial.color?.copy(
          preservesPaletteColor ? new THREE.Color(0xffffff) : tint
        );
        if (previewMaterial.emissive) {
          previewMaterial.emissive.copy(
            preservesPaletteColor ? new THREE.Color(0x000000) : tint
          );
          previewMaterial.emissiveIntensity = preservesPaletteColor
            ? 0
            : Math.max(previewMaterial.emissiveIntensity ?? 0, 0.04);
        }
        previewMaterial.userData = {
          ...previewMaterial.userData,
          itemThumbnailMaterialColorSlot: tintSlot,
          itemThumbnailMaterialColorValue: tintValue,
          itemThumbnailMaterialColorPreservedByPalette: preservesPaletteColor
        };
        previewMaterial.needsUpdate = true;
      });
    });
  });
}

function boostThumbnailMaterialVisibility(model: THREE.Object3D): void {
  model.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) {
      return;
    }
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    materials.forEach((material) => {
      const previewMaterial = material as ThumbnailMaterial;
      previewMaterial.side = THREE.DoubleSide;
      previewMaterial.color?.lerp(new THREE.Color(0xffffff), 0.2);
      previewMaterial.emissive?.lerp(new THREE.Color(0xffffff), 0.28);
      if (typeof previewMaterial.emissiveIntensity === "number") {
        previewMaterial.emissiveIntensity = Math.max(previewMaterial.emissiveIntensity, 0.4);
      }
      previewMaterial.needsUpdate = true;
    });
  });
}

function createStableThumbnailMaterial(material: THREE.Material): THREE.MeshBasicMaterial {
  const source = material as ThumbnailMaterial & { map?: THREE.Texture | null };
  const stableMaterial = new THREE.MeshBasicMaterial({
    color: source.color instanceof THREE.Color ? source.color.clone() : new THREE.Color(0xdfe7f2),
    map: source.map instanceof THREE.Texture ? source.map : null,
    transparent: material.transparent,
    opacity: material.opacity,
    alphaTest: material.alphaTest,
    side: THREE.DoubleSide,
    depthWrite: material.depthWrite
  });
  stableMaterial.name = material.name ? `${material.name}_thumbnail_stable` : "thumbnail_stable";
  return stableMaterial;
}

function stabilizeThumbnailMaterialsForRender(model: THREE.Object3D): void {
  model.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) {
      return;
    }
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    const stableMaterials = materials.map((material) => createStableThumbnailMaterial(material));
    node.material = Array.isArray(node.material) ? stableMaterials : stableMaterials[0];
  });
}

function resolveItemThumbnailIconRotationRadians(object: SceneObject): number {
  if (object.kind !== "items") {
    return 0;
  }
  return resolveItemThumbnail2dContract(object).renderedImageRotationRadians;
}

function resolveTightItemThumbnailOutputPaddingPixels(
  object: SceneObject,
  rotatedWidth: number,
  rotatedHeight: number
): number {
  if (object.kind !== "items") {
    return ITEM_THUMBNAIL_MIN_SAFE_OUTPUT_PADDING_PX;
  }
  const contract = resolveItemThumbnail2dContract(object);
  if (contract.family === "weapon") {
    return Math.max(
      ITEM_THUMBNAIL_WEAPON_MIN_SAFE_OUTPUT_PADDING_PX,
      Math.min(
        ITEM_THUMBNAIL_WEAPON_MAX_SAFE_OUTPUT_PADDING_PX,
        Math.ceil(
          Math.max(rotatedWidth, rotatedHeight) * ITEM_THUMBNAIL_WEAPON_SAFE_OUTPUT_PADDING_RATIO
        )
      )
    );
  }
  return ITEM_THUMBNAIL_MIN_SAFE_OUTPUT_PADDING_PX;
}

function createTightItemThumbnailDataUrl(
  canvas: HTMLCanvasElement,
  object: SceneObject
): TightItemThumbnailImage | null {
  if (typeof document === "undefined") {
    return null;
  }

  const sourceWidth = canvas.width;
  const sourceHeight = canvas.height;
  if (sourceWidth < 1 || sourceHeight < 1) {
    return null;
  }

  const sourceCanvas = document.createElement("canvas");
  sourceCanvas.width = sourceWidth;
  sourceCanvas.height = sourceHeight;
  const sourceContext = sourceCanvas.getContext("2d");
  if (!sourceContext) {
    return null;
  }

  try {
    sourceContext.clearRect(0, 0, sourceWidth, sourceHeight);
    sourceContext.drawImage(canvas, 0, 0, sourceWidth, sourceHeight);
    const pixels = sourceContext.getImageData(0, 0, sourceWidth, sourceHeight).data;
    let minX = sourceWidth;
    let minY = sourceHeight;
    let maxX = -1;
    let maxY = -1;

    for (let y = 0; y < sourceHeight; y += 1) {
      for (let x = 0; x < sourceWidth; x += 1) {
        const alpha = pixels[(y * sourceWidth + x) * 4 + 3];
        if (alpha <= ITEM_THUMBNAIL_CONTENT_ALPHA_THRESHOLD) {
          continue;
        }
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }

    if (maxX < minX || maxY < minY) {
      return null;
    }

    minX = Math.max(0, minX - ITEM_THUMBNAIL_CROP_EDGE_PADDING_PX);
    minY = Math.max(0, minY - ITEM_THUMBNAIL_CROP_EDGE_PADDING_PX);
    maxX = Math.min(sourceWidth - 1, maxX + ITEM_THUMBNAIL_CROP_EDGE_PADDING_PX);
    maxY = Math.min(sourceHeight - 1, maxY + ITEM_THUMBNAIL_CROP_EDGE_PADDING_PX);

    const cropWidth = maxX - minX + 1;
    const cropHeight = maxY - minY + 1;
    const rotationRadians = resolveItemThumbnailIconRotationRadians(object);
    const normalizedRotationRadians =
      Math.abs(rotationRadians) > Number.EPSILON ? rotationRadians : 0;
    const rotatedWidth = Math.ceil(
      Math.abs(cropWidth * Math.cos(normalizedRotationRadians)) +
        Math.abs(cropHeight * Math.sin(normalizedRotationRadians))
    );
    const rotatedHeight = Math.ceil(
      Math.abs(cropWidth * Math.sin(normalizedRotationRadians)) +
        Math.abs(cropHeight * Math.cos(normalizedRotationRadians))
    );
    const outputPadding = resolveTightItemThumbnailOutputPaddingPixels(
      object,
      rotatedWidth,
      rotatedHeight
    );
    const outputCanvas = document.createElement("canvas");
    outputCanvas.width = Math.max(1, rotatedWidth + outputPadding * 2);
    outputCanvas.height = Math.max(1, rotatedHeight + outputPadding * 2);
    const outputContext = outputCanvas.getContext("2d");
    if (!outputContext) {
      return null;
    }

    outputContext.clearRect(0, 0, outputCanvas.width, outputCanvas.height);
    outputContext.imageSmoothingEnabled = true;
    outputContext.imageSmoothingQuality = "high";
    if (normalizedRotationRadians !== 0) {
      outputContext.translate(outputCanvas.width / 2, outputCanvas.height / 2);
      outputContext.rotate(normalizedRotationRadians);
      outputContext.translate(-cropWidth / 2, -cropHeight / 2);
    }
    outputContext.drawImage(
      sourceCanvas,
      minX,
      minY,
      cropWidth,
      cropHeight,
      normalizedRotationRadians === 0 ? outputPadding : 0,
      normalizedRotationRadians === 0 ? outputPadding : 0,
      cropWidth,
      cropHeight
    );
    return {
      dataUrl: outputCanvas.toDataURL("image/png"),
      width: outputCanvas.width,
      height: outputCanvas.height
    };
  } catch {
    return null;
  }
}

export function SceneObjectThumbnail({
  object,
  fallbackLabel,
  renderPayload,
  placeableAssetAccessToken,
  onRenderPayloadNeeded,
  thumbnailRenderEnabled = true,
  allowGeneratedFallback = true,
  preferModelPreview = false,
  forceRender = false
}: SceneObjectThumbnailProps) {
  const rootRef = useRef<HTMLSpanElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [status, setStatus] = useState<"fallback" | "loading" | "rendered">("fallback");
  const [isThumbnailVisible, setIsThumbnailVisible] = useState(false);
  const [useCanvasPreview, setUseCanvasPreview] = useState(false);
  const generatedFallbackPreviewImageUrl = useMemo(
    () => createFallbackPreviewDataUrl(object.kind, fallbackLabel),
    [fallbackLabel, object.kind]
  );
  const canUseGeneratedFallback = allowGeneratedFallback && object.kind !== "items";
  const itemThumbnailModelUrls = useMemo(() => collectItemThumbnailModelSources(object), [object]);
  const itemThumbnailModelUrlSummary = itemThumbnailModelUrls.join("|");
  const itemIconPreview = useMemo(
    () => (object.kind === "items" ? composeItemIconPreview(object) : null),
    [object]
  );
  const itemThumbnail2dContract = useMemo(
    () => (object.kind === "items" ? resolveItemThumbnail2dContract(object) : null),
    [object]
  );
  const providedPreviewImageUrl = useMemo(
    () =>
      shouldUseProvidedPreviewImageUrl(object.previewImageUrl, object.kind)
        ? object.previewImageUrl.trim()
        : "",
    [object.kind, object.previewImageUrl]
  );
  const itemIconPreviewImageUrl = itemIconPreview?.previewImageUrl?.trim() ?? "";
  const preferredItemPreviewImageUrl =
    object.kind === "items" ? providedPreviewImageUrl || itemIconPreviewImageUrl : "";
  const hasAuroraItemIconSource = object.kind === "items" && itemIconPreview !== null;
  const itemThumbnailAppearanceSignature = useMemo(() => {
    if (object.kind !== "items") {
      return "";
    }
    const modelSignature = resolveItemModelPartResolutions(object)
      .map(
        (entry) =>
          `${entry.partIndex}:${entry.partId ?? ""}:${entry.role ?? ""}:${entry.modelUrl}`
      )
      .join("|");
    const armorSignature = resolveItemArmorPartModelResolutions(object)
      .map(
        (entry) =>
          `${entry.slot}:${entry.partId}:${entry.modelResRef ?? ""}:${entry.nodeName ?? ""}:${
            entry.modelUrl
          }`
      )
      .join("|");
    const textureSignature = [...resolveItemTextureDeliveryUrlsByReference(object).entries()]
      .map(([reference, url]) => `${reference}:${url}`)
      .sort()
      .join("|");
    const materialColorSignature = JSON.stringify(object.itemProperties?.materialColors ?? {});
    return `${modelSignature}||${armorSignature}||${textureSignature}||${materialColorSignature}`;
  }, [object]);
  const shouldRenderItemModelThumbnail =
    thumbnailRenderEnabled &&
    object.kind === "items" &&
    itemThumbnailModelUrls.length > 0;
  const initialPreviewImageUrl = useMemo(
    () => {
      if (object.kind === "items" && shouldRenderItemModelThumbnail) {
        return "";
      }
      if (object.kind === "items") {
        return preferredItemPreviewImageUrl;
      }
      return providedPreviewImageUrl || (canUseGeneratedFallback ? generatedFallbackPreviewImageUrl : "");
    },
    [
      canUseGeneratedFallback,
      generatedFallbackPreviewImageUrl,
      object.kind,
      preferredItemPreviewImageUrl,
      providedPreviewImageUrl,
      shouldRenderItemModelThumbnail
    ]
  );
  const [previewImageUrl, setPreviewImageUrl] = useState(initialPreviewImageUrl);
  const [renderedPreviewImageUrl, setRenderedPreviewImageUrl] = useState<string | null>(null);
  const [renderedPreviewSize, setRenderedPreviewSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [itemThumbnailLoadError, setItemThumbnailLoadError] = useState("");
  const objectThumbnailIdentity = `${object.kind}:${object.id}:${object.resRef}:${fallbackLabel}`;

  useEffect(() => {
    setPreviewImageUrl(initialPreviewImageUrl);
    if (
      object.kind === "items" &&
      !shouldRenderItemModelThumbnail &&
      initialPreviewImageUrl.startsWith("data:image/")
    ) {
      setRenderedPreviewImageUrl(null);
      setRenderedPreviewSize(null);
      setUseCanvasPreview(false);
      setStatus("rendered");
    }
  }, [initialPreviewImageUrl, object.kind, shouldRenderItemModelThumbnail]);

  useEffect(() => {
    setRenderedPreviewImageUrl(null);
    setRenderedPreviewSize(null);
    setUseCanvasPreview(false);
    setIsThumbnailVisible(false);
    setStatus("fallback");
    setItemThumbnailLoadError("");
  }, [objectThumbnailIdentity]);

  useEffect(() => {
    if (forceRender) {
      setIsThumbnailVisible(true);
      return;
    }
    if (!isRenderableThumbnailCandidate(object)) {
      return;
    }
    const element = rootRef.current;
    if (!element || typeof window === "undefined") {
      return;
    }
    if (typeof IntersectionObserver === "undefined") {
      setIsThumbnailVisible(true);
      return;
    }
    let didMarkVisible = false;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          didMarkVisible = true;
          setIsThumbnailVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "180px" }
    );
    observer.observe(element);
    return () => {
      if (!didMarkVisible) {
        observer.disconnect();
      }
    };
  }, [forceRender, objectThumbnailIdentity, object]);

  useEffect(() => {
    if (
      !thumbnailRenderEnabled ||
      !isThumbnailVisible ||
      !isPlaceableThumbnailCandidate(object) ||
      renderPayload ||
      !onRenderPayloadNeeded
    ) {
      return;
    }
    if (object.source?.type === "aurora_git") {
      return;
    }
    onRenderPayloadNeeded(object);
  }, [isThumbnailVisible, object, onRenderPayloadNeeded, renderPayload, thumbnailRenderEnabled]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const armorResolutions = resolveItemArmorPartModelResolutions(object);
    if (
      !thumbnailRenderEnabled ||
      !isThumbnailVisible ||
      !canvas ||
      object.kind !== "items" ||
      itemThumbnailModelUrls.length === 0 ||
      !shouldRenderItemModelThumbnail
    ) {
      if (object.kind === "items" && itemThumbnailModelUrls.length > 0) {
        setItemThumbnailLoadError(
          hasAuroraItemIconSource
            ? "aurora-icon-preferred"
            : preferredItemPreviewImageUrl
              ? "provided-preview-preferred"
              : !thumbnailRenderEnabled
            ? "thumbnail-render-disabled"
            : !isThumbnailVisible
              ? "thumbnail-not-visible"
              : !canvas
                ? "missing-canvas"
                : object.kind !== "items"
                  ? "not-item"
                  : "no-model-urls"
        );
      }
      return;
    }
    if (!canRenderWebGlThumbnail()) {
      setItemThumbnailLoadError("webgl-unavailable");
      return;
    }

    let cancelled = false;
    let renderer: THREE.WebGLRenderer | null = null;
    const loadedModels: THREE.Object3D[] = [];
    const loadedArmorEntries: Array<{
      resolution: ItemRenderArmorPartModelResolution;
      model: THREE.Object3D;
    }> = [];
    setStatus("loading");
    setUseCanvasPreview(false);
    setItemThumbnailLoadError("");

    void (async () => {
      const loader = new GLTFLoader(createAuroraGltfLoadingManager());
      if (placeableAssetAccessToken) {
        loader.setRequestHeader({ Authorization: `Bearer ${placeableAssetAccessToken}` });
        loader.setWithCredentials(false);
      }
      const modelRoot = new THREE.Group();
      for (const [index, url] of itemThumbnailModelUrls.entries()) {
        try {
          const loaded = await new Promise<THREE.Object3D>((resolve, reject) => {
            loader.load(url, (gltf) => resolve(gltf.scene), undefined, reject);
          });
          if (cancelled) {
            disposeRenderedClone(loaded);
            return;
          }
          loadedModels.push(loaded);
          const armorResolution = armorResolutions[index];
          if (armorResolution) {
            loadedArmorEntries.push({ resolution: armorResolution, model: loaded });
          }
          modelRoot.add(loaded);
        } catch (error) {
          if (!cancelled) {
            const message = error instanceof Error ? error.message : "load-failed";
            setItemThumbnailLoadError(message.slice(0, 180));
          }
          // Keep later model parts renderable; one missing GLB must not blank the thumbnail.
        }
      }
      if (cancelled) {
        return;
      }
      if (loadedModels.length === 0) {
        setItemThumbnailLoadError((current) => current || "no-models-loaded");
        setStatus("fallback");
        return;
      }
      applyItemArmorThumbnailLayout(modelRoot, loadedArmorEntries);
      frameItemModelForFrontThumbnail(modelRoot, object);

      const textureUrlsByReference = resolveItemTextureDeliveryUrlsByReference(object);
      if (textureUrlsByReference.size > 0) {
        try {
          const runtime = getThumbnailRuntime();
          applyPlaceableAssetRequestHeaders(
            runtime as unknown as PlaceableAssetRequestHeaderRuntime,
            placeableAssetAccessToken
          );
          const paletteRowsByLayer = buildItemPltPaletteRowsByLayer(
            object.itemProperties?.materialColors
          );
          const texturesByReference = await ensurePlaceableTexturesByReference(
            runtime,
            textureUrlsByReference,
            { paletteRowsByLayer }
          );
          if (!cancelled && texturesByReference.size > 0) {
            applyPlaceableTexturesToModel(modelRoot, texturesByReference);
          }
        } catch (error) {
          if (!cancelled) {
            const message = error instanceof Error ? error.message : "texture-load-failed";
            setItemThumbnailLoadError(`texture:${message}`.slice(0, 180));
          }
        }
      }
      if (cancelled) {
        return;
      }

      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        preserveDrawingBuffer: true
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(THUMBNAIL_RENDER_SIZE, THUMBNAIL_RENDER_SIZE, false);
      renderer.setClearColor(0x071426, 0);

      const scene = new THREE.Scene();
      scene.add(new THREE.AmbientLight(0xffffff, 1.85));
      const keyLight = new THREE.DirectionalLight(0xffffff, 2.8);
      keyLight.position.set(0.2, 2.2, 3.4);
      scene.add(keyLight);
      const fillLight = new THREE.DirectionalLight(0xe8f0ff, 1.2);
      fillLight.position.set(-2, 1.4, 2.2);
      scene.add(fillLight);
      boostThumbnailMaterialVisibility(modelRoot);
      applyItemArmorThumbnailTints(object, loadedArmorEntries);
      stabilizeThumbnailMaterialsForRender(modelRoot);
      scene.add(modelRoot);

      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 20);
      fitFrontThumbnailCamera(camera, modelRoot, object);
      renderer.render(scene, camera);
      let renderedImageUrl = "";
      let renderedImageSize: { width: number; height: number } | null = null;
      try {
        const tightThumbnail = createTightItemThumbnailDataUrl(canvas, object);
        renderedImageUrl = tightThumbnail?.dataUrl || canvas.toDataURL("image/png");
        renderedImageSize = tightThumbnail
          ? { width: tightThumbnail.width, height: tightThumbnail.height }
          : null;
      } catch {
        renderedImageUrl = "";
        renderedImageSize = null;
      }
      disposeRenderedClone(modelRoot);
      if (renderedImageUrl) {
        disposeThumbnailRenderer(renderer);
        renderer = null;
        setRenderedPreviewImageUrl(renderedImageUrl);
        setRenderedPreviewSize(renderedImageSize);
        setUseCanvasPreview(false);
      } else {
        setRenderedPreviewImageUrl(null);
        setRenderedPreviewSize(null);
        setUseCanvasPreview(true);
      }
      setStatus("rendered");
    })().catch((error) => {
      if (!cancelled) {
        const message =
          error instanceof Error
            ? `${error.message}${error.stack ? ` | ${error.stack.split("\n").slice(0, 3).join(" <- ")}` : ""}`
            : "render-failed";
        setItemThumbnailLoadError(`render:${message}`.slice(0, 180));
        setStatus("fallback");
      }
    });

    return () => {
      cancelled = true;
      disposeThumbnailRenderer(renderer);
      loadedModels.forEach((model) => disposeRenderedClone(model));
    };
  }, [
    isThumbnailVisible,
    itemThumbnailAppearanceSignature,
    itemThumbnailModelUrlSummary,
    object.kind,
    objectThumbnailIdentity,
    placeableAssetAccessToken,
    preferredItemPreviewImageUrl,
    hasAuroraItemIconSource,
    preferModelPreview,
    shouldRenderItemModelThumbnail,
    thumbnailRenderEnabled
  ]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (
      !thumbnailRenderEnabled ||
      !isThumbnailVisible ||
      !canvas ||
      !renderPayload ||
      !isPlaceableThumbnailCandidate(object)
    ) {
      setStatus((current) =>
        current === "rendered" ? "rendered" : current === "loading" ? "fallback" : current
      );
      return;
    }
    if (!canRenderWebGlThumbnail()) {
      setStatus((current) =>
        current === "rendered" ? "rendered" : current === "loading" ? "fallback" : current
      );
      return;
    }

    const modelResolution = resolvePlaceableModelResolution(renderPayload);
    const modelUrl = modelResolution.modelUrl;
    if (!modelUrl) {
      setStatus((current) =>
        current === "rendered" ? "rendered" : current === "loading" ? "fallback" : current
      );
      return;
    }

    let cancelled = false;
    let renderer: THREE.WebGLRenderer | null = null;
    let renderedModel: THREE.Object3D | null = null;
    setStatus("loading");

    void (async () => {
      const runtime = getThumbnailRuntime();
      applyPlaceableAssetRequestHeaders(
        runtime as unknown as PlaceableAssetRequestHeaderRuntime,
        placeableAssetAccessToken
      );
      const model = await ensureNormalizedPlaceableModel(
        runtime,
        modelUrl,
        0.5,
        {
          cacheKey: modelResolution.modelCacheKey,
          targetMaxAxisFactor: PLACEABLE_PREVIEW_MODEL_TARGET_MAX_AXIS_FACTOR,
          cloneMaterials: true
        }
      );
      if (!model || cancelled) {
        setStatus("fallback");
        return;
      }
      renderedModel = model;

      const textureUrlsByReference = resolvePlaceableTextureDeliveryUrlsByReference(renderPayload);
      if (textureUrlsByReference.size > 0) {
        const texturesByReference = await ensurePlaceableTexturesByReference(
          runtime,
          textureUrlsByReference
        );
        if (!cancelled && texturesByReference.size > 0) {
          applyPlaceableTexturesToModel(model, texturesByReference, undefined, {
            textureBindings: renderPayload.renderPackage?.textureBindings
          });
        }
      }

      if (cancelled) {
        return;
      }

      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        preserveDrawingBuffer: true
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(THUMBNAIL_RENDER_SIZE, THUMBNAIL_RENDER_SIZE, false);
      renderer.setClearColor(0xdbe5ef, 1);

      const scene = new THREE.Scene();
      scene.add(new THREE.AmbientLight(0xffffff, 1.7));
      const keyLight = new THREE.DirectionalLight(0xffffff, 2.8);
      keyLight.position.set(2.4, 3, 3.2);
      scene.add(keyLight);
      const fillLight = new THREE.DirectionalLight(0xdde9ff, 1.2);
      fillLight.position.set(-2, 1.4, -2.4);
      scene.add(fillLight);
      frameModelForThumbnail(model);
      boostThumbnailMaterialVisibility(model);
      scene.add(model);

      const camera = new THREE.OrthographicCamera(-1.25, 1.25, 1.25, -1.25, 0.01, 20);
      camera.position.set(2.1, 1.6, 2.4);
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
      const renderedImageUrl = canvas.toDataURL("image/png");
      disposeThumbnailRenderer(renderer);
      renderer = null;
      disposeRenderedClone(model);
      renderedModel = null;
      setRenderedPreviewImageUrl(renderedImageUrl);
      setStatus("rendered");
    })().catch(() => {
      if (!cancelled) {
        setStatus((current) =>
          current === "rendered" ? "rendered" : current === "loading" ? "fallback" : current
        );
      }
    });

    return () => {
      cancelled = true;
      disposeThumbnailRenderer(renderer);
      if (renderedModel) {
        disposeRenderedClone(renderedModel);
      }
    };
  }, [
    isThumbnailVisible,
    object,
    placeableAssetAccessToken,
    renderPayload,
    thumbnailRenderEnabled
  ]);

  const displayPreviewImageUrl =
    shouldRenderItemModelThumbnail && !renderedPreviewImageUrl
      ? ""
      : renderedPreviewImageUrl ?? previewImageUrl;
  const hasCanvasPreview = useCanvasPreview && status === "rendered";
  const hasDisplayPreviewImage = displayPreviewImageUrl.trim().length > 0;
  const hasVisiblePreview = hasDisplayPreviewImage || hasCanvasPreview;
  const thumbnailStatus =
    hasDisplayPreviewImage && !shouldRenderItemModelThumbnail && status === "fallback"
      ? "rendered"
      : status;
  const thumbnailRenderMode = shouldRenderItemModelThumbnail
    ? "model-3d"
    : hasDisplayPreviewImage
      ? "image"
      : hasAuroraItemIconSource
        ? "icon-pending"
        : "none";
  const renderedPreviewAspectRatio =
    renderedPreviewSize && renderedPreviewSize.height > 0
      ? renderedPreviewSize.width / renderedPreviewSize.height
      : null;
  const renderedPreviewFitSize = renderedPreviewAspectRatio
    ? {
        width:
          renderedPreviewAspectRatio >= 1
            ? ITEM_THUMBNAIL_MODEL_FRAME_SIZE
            : ITEM_THUMBNAIL_MODEL_FRAME_SIZE * renderedPreviewAspectRatio,
        height:
          renderedPreviewAspectRatio >= 1
            ? ITEM_THUMBNAIL_MODEL_FRAME_SIZE / renderedPreviewAspectRatio
            : ITEM_THUMBNAIL_MODEL_FRAME_SIZE
      }
    : null;
  const thumbnailStyle =
    shouldRenderItemModelThumbnail && renderedPreviewAspectRatio && renderedPreviewFitSize
      ? ({
          "--scene-object-thumbnail-image-aspect": `${renderedPreviewAspectRatio}`,
          "--scene-object-thumbnail-fit-width": `${renderedPreviewFitSize.width}px`,
          "--scene-object-thumbnail-fit-height": `${renderedPreviewFitSize.height}px`
        } as CSSProperties)
      : undefined;

  if (object.kind === "items" && !hasVisiblePreview && !shouldRenderItemModelThumbnail) {
    return null;
  }

  return (
    <ThumbnailHoverPreview
      ref={rootRef}
      className={`scene-object-thumbnail scene-object-thumbnail-${hasVisiblePreview ? thumbnailStatus : "missing"} ${
        shouldRenderItemModelThumbnail ? "scene-object-thumbnail-item-model" : ""
      } ${hasCanvasPreview ? "scene-object-thumbnail-canvas-preview" : ""}`}
      data-thumbnail-model-source-count={itemThumbnailModelUrls.length}
      data-thumbnail-render-enabled={thumbnailRenderEnabled ? "true" : "false"}
      data-thumbnail-prefer-model-preview={preferModelPreview ? "true" : "false"}
      data-thumbnail-force-render={forceRender ? "true" : "false"}
      data-thumbnail-visible={isThumbnailVisible ? "true" : "false"}
      data-thumbnail-status={thumbnailStatus}
      data-thumbnail-load-error={itemThumbnailLoadError}
      data-thumbnail-render-mode={thumbnailRenderMode}
      data-thumbnail-item-icon-resref={itemIconPreview?.iconResRef ?? ""}
      data-thumbnail-item-icon-source={itemIconPreview?.source ?? ""}
      data-thumbnail-aurora-2d-source={itemThumbnail2dContract?.source ?? ""}
      data-thumbnail-aurora-2d-family={itemThumbnail2dContract?.family ?? ""}
      data-thumbnail-aurora-2d-default-icon={itemThumbnail2dContract?.defaultIcon ?? ""}
      data-thumbnail-aurora-2d-slot-width={itemThumbnail2dContract?.slotWidth ?? ""}
      data-thumbnail-aurora-2d-slot-height={itemThumbnail2dContract?.slotHeight ?? ""}
      data-thumbnail-aurora-2d-can-rotate-icon={itemThumbnail2dContract?.canRotateIcon ?? ""}
      data-thumbnail-aurora-2d-image-rotation-deg={
        itemThumbnail2dContract?.renderedImageRotationDegrees ?? ""
      }
      data-thumbnail-aurora-2d-rotation-reason={
        itemThumbnail2dContract?.rotationReason ?? ""
      }
      data-thumbnail-image-width={renderedPreviewSize?.width ?? ""}
      data-thumbnail-image-height={renderedPreviewSize?.height ?? ""}
      style={thumbnailStyle}
      expandedImageUrl={displayPreviewImageUrl}
      previewSize={THUMBNAIL_HOVER_PREVIEW_SIZE}
    >
      {hasDisplayPreviewImage ? (
        <img
          src={displayPreviewImageUrl}
          width={THUMBNAIL_IMAGE_SIZE}
          height={THUMBNAIL_IMAGE_SIZE}
          loading="lazy"
          alt={`${object.tag} 2D preview`}
          onError={() => {
            if (renderedPreviewImageUrl) {
              setRenderedPreviewImageUrl(null);
              setRenderedPreviewSize(null);
              return;
            }
            if (canUseGeneratedFallback && previewImageUrl !== generatedFallbackPreviewImageUrl) {
              setPreviewImageUrl(generatedFallbackPreviewImageUrl);
            } else {
              setPreviewImageUrl("");
            }
          }}
        />
      ) : hasCanvasPreview ? null : (
        <span
          className="scene-object-thumbnail-missing-preview"
          aria-label={`${object.tag} real preview unavailable`}
        />
      )}
      <canvas
        ref={canvasRef}
        width={THUMBNAIL_RENDER_SIZE}
        height={THUMBNAIL_RENDER_SIZE}
        aria-label={`${object.tag} rendered preview`}
      />
    </ThumbnailHoverPreview>
  );
}
