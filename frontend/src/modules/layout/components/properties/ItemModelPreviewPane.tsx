import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { decodeRawTextureToRgba } from "../../../items/application/itemRawTextureDecoder";
import {
  buildItemPltPaletteRowsByLayer,
  resolveItemArmorMaterialColorSlot,
  resolveItemMaterialColorHex
} from "../../../items/application/itemPresentation";
import { ensureAuroraPltPaletteDataLoaded } from "../../../placeables/adapters/aurora/auroraPltPalette";
import type { AuroraPltPaletteRowsByLayer } from "../../../placeables/adapters/aurora/auroraPltTextureDecoder";
import { applyPlaceableTexturesToModel } from "../../../placeables/adapters/three/placeableThreeAssetLoader";
import { resolvePlaceableAssetDeliveryUrl } from "../../../placeables/application/placeableRenderAssetResolver";
import { normalizePlaceableTextureReference } from "../../../placeables/application/placeableTextureReferences";
import type {
  SceneObject,
  SceneObjectItemMaterialColors,
  SceneObjectItemModelAssetCandidate
} from "../../../scene/contracts";

interface ItemModelPreviewPaneProps {
  object: SceneObject;
  previewImageUrl?: string;
  previewImageAlt?: string;
  assetAccessToken?: string | null;
  processingStatus?: "idle" | "processing" | "ready" | "error";
}

interface ItemPreviewModelSource {
  key: string;
  url: string;
  label: string;
  slot?: string;
  nodeName?: string;
}

interface ItemPreviewTextureSource {
  reference: string;
  url: string;
  extension: string;
}

const ITEM_MODEL_PREVIEW_MIN_HEIGHT_PX = 320;
const ITEM_MODEL_PREVIEW_TEXTURE_EXTENSIONS = new Set([
  "png",
  "jpg",
  "jpeg",
  "webp",
  "bmp",
  "tga",
  "dds",
  "tpc",
  "plt"
]);
const ITEM_MODEL_PREVIEW_RAW_TEXTURE_EXTENSIONS = new Set(["bmp", "tga", "dds", "tpc", "plt"]);
const ITEM_ARMOR_PREVIEW_BODY_CENTER_Y = 0.34;
const ITEM_ARMOR_PREVIEW_BODY_Z = 0;
const ITEM_ARMOR_PREVIEW_OVERLAP = 0.025;
const ITEM_ARMOR_PREVIEW_FOOT_FRONT_Z = 0.11;
const ITEM_ARMOR_PREVIEW_ARM_Z = 0.015;
const ITEM_ARMOR_WAIST_SEAM_PELVIS_OVERLAP_Y = 0.026;
const ITEM_ARMOR_PREVIEW_FALLBACK_SLOT_TARGETS: Record<string, [number, number, number]> = {
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
const ITEM_ARMOR_PREVIEW_SKELETON_MODE = "pmh0-sourcehierarchy-anchors";
const ITEM_ARMOR_PREVIEW_ATTACHMENT_TARGETS: Record<string, string> = {
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
const ITEM_ARMOR_PREVIEW_SYNTHETIC_SKELETON_NODES: ReadonlyArray<{
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

function collectItemPreviewModelSources(object: SceneObject): ItemPreviewModelSource[] {
  const properties = object.itemProperties;
  const armorSources =
    properties?.armorPartModelCandidates
      ?.map((candidate) => {
        const url = (candidate.glbUrl ?? candidate.modelUrl ?? "").trim();
        if (!url) {
          return null;
        }
        return {
          key: `armor:${candidate.slot}:${candidate.partId}:${url}`,
          url,
          label: candidate.modelResRef,
          slot: candidate.slot,
          nodeName: candidate.nodeName
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry)) ?? [];

  if (armorSources.length > 0) {
    return armorSources;
  }

  return (
    properties?.modelPartCandidates
      ?.map((candidate, index) => {
        const url = (candidate.glbUrl ?? candidate.modelUrl ?? "").trim();
        if (!url) {
          return null;
        }
        return {
          key: `part:${index}:${candidate.resRef}:${url}`,
          url,
          label: candidate.resRef
        };
      })
      .filter((entry): entry is ItemPreviewModelSource => Boolean(entry)) ?? []
  );
}

function collectItemPreviewTextureSources(object: SceneObject): ItemPreviewTextureSource[] {
  return (
    object.itemProperties?.modelAssetCandidates
      ?.map((candidate: SceneObjectItemModelAssetCandidate): ItemPreviewTextureSource | null => {
        if (candidate.role !== "texture") {
          return null;
        }
        const extension = candidate.extension.trim().toLowerCase();
        const url = resolvePlaceableAssetDeliveryUrl(candidate.assetUrl.trim());
        if (!url || !ITEM_MODEL_PREVIEW_TEXTURE_EXTENSIONS.has(extension)) {
          return null;
        }
        const reference = normalizePlaceableTextureReference(
          candidate.reference || candidate.fileName || candidate.objectKey
        );
        return reference ? { reference, url, extension } : null;
      })
      .filter((entry): entry is ItemPreviewTextureSource => Boolean(entry)) ?? []
  );
}

function disposePreviewObject(root: THREE.Object3D): void {
  root.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) {
      return;
    }
    node.geometry?.dispose();
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    materials.forEach((material) => material.dispose());
  });
}

function fitCameraToObject(
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  object: THREE.Object3D
): void {
  object.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(object);
  if (bounds.isEmpty()) {
    camera.position.set(0, 0.8, 2.2);
    controls.target.set(0, 0.35, 0);
    controls.update();
    return;
  }

  const center = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3());
  const maxAxis = Math.max(size.x, size.y, size.z, 0.35);
  const halfFov = THREE.MathUtils.degToRad(camera.fov) * 0.5;
  const fitHeightDistance = size.y > 0 ? size.y * 0.5 / Math.tan(halfFov) : 0;
  const fitWidthDistance =
    size.x > 0 ? size.x * 0.5 / (Math.tan(halfFov) * Math.max(camera.aspect, 0.1)) : 0;
  const distance =
    Math.max(fitHeightDistance, fitWidthDistance, maxAxis * 1.05, 0.8) * 1.58;
  controls.target.copy(center);
  camera.near = Math.max(0.01, distance / 80);
  camera.far = Math.max(20, distance * 12);
  const viewDirection = new THREE.Vector3(0.48, 0.22, 1).normalize();
  camera.position.copy(center).add(viewDirection.multiplyScalar(distance));
  camera.updateProjectionMatrix();
  controls.update();
}

function normalizeItemArmorPreviewNodeName(value: string): string {
  return value.trim().toLowerCase();
}

function mapItemArmorPreviewSourceMdlPositionToThree(
  position: [number, number, number]
): THREE.Vector3 {
  const [x, y, z] = position;
  return new THREE.Vector3(x, z, y);
}

function resolveItemArmorPreviewAttachmentTarget(source: ItemPreviewModelSource): string {
  const slot = source.slot ?? "";
  if (slot === "robe") {
    return "";
  }
  const canonicalTarget = ITEM_ARMOR_PREVIEW_ATTACHMENT_TARGETS[slot] ?? "";
  if (canonicalTarget && (slot === "belt" || slot === "lShoul" || slot === "rShoul")) {
    return canonicalTarget;
  }
  const nodeName = source.nodeName?.trim();
  return nodeName || canonicalTarget;
}

function createItemArmorPreviewSyntheticSkeleton(
  loadedEntries: Array<{ source: ItemPreviewModelSource; model: THREE.Object3D }>
): { model: THREE.Group; anchors: Map<string, THREE.Object3D>; coveredCount: number; targetCount: number } {
  const skeletonModel = new THREE.Group();
  skeletonModel.name = "item_properties_armor_preview_synthetic_capart_skeleton";
  const anchors = new Map<string, THREE.Object3D>();
  ITEM_ARMOR_PREVIEW_SYNTHETIC_SKELETON_NODES.forEach((sourceNode) => {
    const anchor = new THREE.Group();
    anchor.name = sourceNode.name;
    anchor.position.copy(mapItemArmorPreviewSourceMdlPositionToThree(sourceNode.sourcePosition));
    anchor.userData = {
      itemPropertiesPreviewSkeletonAnchor: true,
      itemPropertiesPreviewSkeletonMode: ITEM_ARMOR_PREVIEW_SKELETON_MODE,
      itemPropertiesPreviewSkeletonParentName: sourceNode.parentName ?? ""
    };
    anchors.set(normalizeItemArmorPreviewNodeName(sourceNode.name), anchor);
  });

  ITEM_ARMOR_PREVIEW_SYNTHETIC_SKELETON_NODES.forEach((sourceNode) => {
    const anchor = anchors.get(normalizeItemArmorPreviewNodeName(sourceNode.name));
    if (!anchor) {
      return;
    }
    const parent = sourceNode.parentName
      ? anchors.get(normalizeItemArmorPreviewNodeName(sourceNode.parentName))
      : undefined;
    (parent ?? skeletonModel).add(anchor);
  });

  const targetNames = loadedEntries
    .map(({ source }) => resolveItemArmorPreviewAttachmentTarget(source))
    .filter((target) => target.length > 0)
    .map(normalizeItemArmorPreviewNodeName);
  const coveredCount = targetNames.filter((target) => anchors.has(target)).length;
  skeletonModel.userData = {
    ...skeletonModel.userData,
    itemPropertiesPreviewSkeleton: true,
    itemPropertiesPreviewSkeletonMode: ITEM_ARMOR_PREVIEW_SKELETON_MODE,
    itemPropertiesPreviewSkeletonNodeCount: anchors.size,
    itemPropertiesPreviewSkeletonCoveredCount: coveredCount,
    itemPropertiesPreviewSkeletonTargetCount: targetNames.length
  };
  return {
    model: skeletonModel,
    anchors,
    coveredCount,
    targetCount: targetNames.length
  };
}

interface ItemArmorPreviewLayoutBox {
  model: THREE.Object3D;
  center: THREE.Vector3;
  halfSize: THREE.Vector3;
}

function collectItemArmorPreviewLayoutBoxes(
  loadedEntries: Array<{ source: ItemPreviewModelSource; model: THREE.Object3D }>
): Map<string, ItemArmorPreviewLayoutBox> {
  const boxesBySlot = new Map<string, ItemArmorPreviewLayoutBox>();
  loadedEntries.forEach(({ source, model }) => {
    const slot = source.slot ?? "";
    if (!slot) {
      return;
    }
    model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model);
    if (box.isEmpty()) {
      return;
    }
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    boxesBySlot.set(slot, {
      model,
      center,
      halfSize: size.multiplyScalar(0.5)
    });
  });
  return boxesBySlot;
}

function resolveItemArmorPreviewLayoutTargets(
  boxesBySlot: Map<string, ItemArmorPreviewLayoutBox>
): Map<string, THREE.Vector3> {
  const targets = new Map<string, THREE.Vector3>();
  const setTarget = (slot: string, center: THREE.Vector3): void => {
    if (boxesBySlot.has(slot)) {
      targets.set(slot, center);
    }
  };
  const setFallbackTargets = (): void => {
    boxesBySlot.forEach((_box, slot) => {
      const target = ITEM_ARMOR_PREVIEW_FALLBACK_SLOT_TARGETS[slot];
      if (target) {
        targets.set(slot, new THREE.Vector3(target[0], target[1], target[2]));
      }
    });
  };

  const centralSlot = boxesBySlot.has("torso")
    ? "torso"
    : boxesBySlot.has("robe")
      ? "robe"
      : boxesBySlot.has("pelvis")
        ? "pelvis"
        : null;
  const centralBox = centralSlot ? boxesBySlot.get(centralSlot) : null;
  if (!centralSlot || !centralBox) {
    setFallbackTargets();
    return targets;
  }

  const bodyTarget = new THREE.Vector3(
    0,
    centralSlot === "pelvis" ? 0.05 : ITEM_ARMOR_PREVIEW_BODY_CENTER_Y,
    ITEM_ARMOR_PREVIEW_BODY_Z
  );
  setTarget(centralSlot, bodyTarget);

  const torsoBox = boxesBySlot.get("torso") ?? centralBox;
  const torsoTarget = targets.get("torso") ?? bodyTarget;
  const torsoTopY = torsoTarget.y + torsoBox.halfSize.y;
  const torsoBottomY = torsoTarget.y - torsoBox.halfSize.y;
  const torsoHalfX = Math.max(torsoBox.halfSize.x, 0.18);
  const pelvisBox = boxesBySlot.get("pelvis");

  if (pelvisBox && centralSlot !== "pelvis") {
    setTarget(
      "pelvis",
      new THREE.Vector3(
        0,
        torsoBottomY - pelvisBox.halfSize.y + ITEM_ARMOR_PREVIEW_OVERLAP,
        ITEM_ARMOR_PREVIEW_BODY_Z
      )
    );
  }

  const beltBox = boxesBySlot.get("belt");
  if (beltBox) {
    const pelvisTarget = targets.get("pelvis");
    const beltY = pelvisTarget
      ? pelvisTarget.y + (pelvisBox?.halfSize.y ?? 0) - beltBox.halfSize.y * 0.45
      : torsoBottomY + beltBox.halfSize.y * 0.35;
    setTarget("belt", new THREE.Vector3(0, beltY, ITEM_ARMOR_PREVIEW_BODY_Z + 0.015));
  }

  const neckBox = boxesBySlot.get("neck");
  if (neckBox) {
    setTarget(
      "neck",
      new THREE.Vector3(
        0,
        torsoTopY + neckBox.halfSize.y - ITEM_ARMOR_PREVIEW_OVERLAP,
        ITEM_ARMOR_PREVIEW_BODY_Z
      )
    );
  }

  const placeLegChain = (
    side: "l" | "r",
    thighSlot: string,
    shinSlot: string,
    footSlot: string
  ): void => {
    const sign = side === "l" ? -1 : 1;
    const thighBox = boxesBySlot.get(thighSlot);
    const shinBox = boxesBySlot.get(shinSlot);
    const footBox = boxesBySlot.get(footSlot);
    const pelvisTarget = targets.get("pelvis") ?? bodyTarget;
    const pelvisBottomY =
      pelvisTarget.y - (pelvisBox?.halfSize.y ?? Math.max(centralBox.halfSize.y * 0.45, 0.12));
    const legX = sign * Math.max(0.12, (pelvisBox?.halfSize.x ?? torsoHalfX) * 0.58);
    if (thighBox) {
      setTarget(
        thighSlot,
        new THREE.Vector3(
          legX,
          pelvisBottomY - thighBox.halfSize.y + ITEM_ARMOR_PREVIEW_OVERLAP,
          ITEM_ARMOR_PREVIEW_BODY_Z
        )
      );
    }
    const thighTarget = targets.get(thighSlot);
    if (shinBox && thighBox && thighTarget) {
      setTarget(
        shinSlot,
        new THREE.Vector3(
          legX,
          thighTarget.y - thighBox.halfSize.y - shinBox.halfSize.y + ITEM_ARMOR_PREVIEW_OVERLAP,
          ITEM_ARMOR_PREVIEW_BODY_Z
        )
      );
    }
    const shinTarget = targets.get(shinSlot);
    if (footBox && shinBox && shinTarget) {
      setTarget(
        footSlot,
        new THREE.Vector3(
          legX,
          shinTarget.y - shinBox.halfSize.y - footBox.halfSize.y + ITEM_ARMOR_PREVIEW_OVERLAP,
          ITEM_ARMOR_PREVIEW_FOOT_FRONT_Z
        )
      );
    }
  };

  const placeArmChain = (
    side: "l" | "r",
    shoulderSlot: string,
    bicepSlot: string,
    forearmSlot: string,
    handSlot: string
  ): void => {
    const sign = side === "l" ? -1 : 1;
    const shoulderBox = boxesBySlot.get(shoulderSlot);
    const bicepBox = boxesBySlot.get(bicepSlot);
    const forearmBox = boxesBySlot.get(forearmSlot);
    const handBox = boxesBySlot.get(handSlot);
    if (shoulderBox) {
      const shoulderX =
        sign * (torsoHalfX + shoulderBox.halfSize.x - ITEM_ARMOR_PREVIEW_OVERLAP);
      setTarget(
        shoulderSlot,
        new THREE.Vector3(
          shoulderX,
          torsoTopY - shoulderBox.halfSize.y * 0.42,
          ITEM_ARMOR_PREVIEW_ARM_Z
        )
      );
    }
    const shoulderTarget = targets.get(shoulderSlot);
    if (bicepBox && shoulderBox && shoulderTarget) {
      setTarget(
        bicepSlot,
        new THREE.Vector3(
          shoulderTarget.x + sign * Math.max(0.015, shoulderBox.halfSize.x * 0.14),
          shoulderTarget.y -
            shoulderBox.halfSize.y -
            bicepBox.halfSize.y +
            ITEM_ARMOR_PREVIEW_OVERLAP,
          ITEM_ARMOR_PREVIEW_ARM_Z
        )
      );
    }
    const bicepTarget = targets.get(bicepSlot);
    if (forearmBox && bicepBox && bicepTarget) {
      setTarget(
        forearmSlot,
        new THREE.Vector3(
          bicepTarget.x + sign * Math.max(0.012, bicepBox.halfSize.x * 0.12),
          bicepTarget.y -
            bicepBox.halfSize.y -
            forearmBox.halfSize.y +
            ITEM_ARMOR_PREVIEW_OVERLAP,
          ITEM_ARMOR_PREVIEW_ARM_Z
        )
      );
    }
    const forearmTarget = targets.get(forearmSlot);
    if (handBox && forearmBox && forearmTarget) {
      setTarget(
        handSlot,
        new THREE.Vector3(
          forearmTarget.x,
          forearmTarget.y -
            forearmBox.halfSize.y -
            handBox.halfSize.y +
            ITEM_ARMOR_PREVIEW_OVERLAP,
          ITEM_ARMOR_PREVIEW_ARM_Z
        )
      );
    }
  };

  placeLegChain("l", "lThigh", "lShin", "lFoot");
  placeLegChain("r", "rThigh", "rShin", "rFoot");
  placeArmChain("l", "lShoul", "lBicep", "lFArm", "lHand");
  placeArmChain("r", "rShoul", "rBicep", "rFArm", "rHand");

  boxesBySlot.forEach((_box, slot) => {
    if (targets.has(slot)) {
      return;
    }
    const target = ITEM_ARMOR_PREVIEW_FALLBACK_SLOT_TARGETS[slot];
    if (target) {
      targets.set(slot, new THREE.Vector3(target[0], target[1], target[2]));
    }
  });

  return targets;
}

function applyItemArmorWaistSeamOverlap(
  loadedEntries: Array<{ source: ItemPreviewModelSource; model: THREE.Object3D }>
): boolean {
  const slots = new Set(loadedEntries.map((entry) => entry.source.slot ?? ""));
  if (!slots.has("torso") || !slots.has("pelvis") || slots.has("belt")) {
    return false;
  }
  const pelvisEntry = loadedEntries.find((entry) => entry.source.slot === "pelvis");
  if (!pelvisEntry) {
    return false;
  }
  pelvisEntry.model.position.y += ITEM_ARMOR_WAIST_SEAM_PELVIS_OVERLAP_Y;
  pelvisEntry.model.userData = {
    ...pelvisEntry.model.userData,
    itemPropertiesPreviewWaistSeamOverlap: true,
    itemPropertiesPreviewWaistSeamOverlapY: ITEM_ARMOR_WAIST_SEAM_PELVIS_OVERLAP_Y
  };
  return true;
}

function applyItemArmorPreviewSkeletonLayout(input: {
  modelRoot: THREE.Object3D;
  loadedEntries: Array<{ source: ItemPreviewModelSource; model: THREE.Object3D }>;
}): { adjustedCount: number; attachedModels: Set<THREE.Object3D>; mode: string } {
  const armorEntries = input.loadedEntries.filter((entry) => entry.source.slot);
  if (armorEntries.length < 2) {
    return {
      adjustedCount: 0,
      attachedModels: new Set(),
      mode: "not-applicable"
    };
  }
  const skeleton = createItemArmorPreviewSyntheticSkeleton(armorEntries);
  if (skeleton.targetCount === 0 || skeleton.coveredCount !== skeleton.targetCount) {
    return {
      adjustedCount: 0,
      attachedModels: new Set(),
      mode: "missing-anchors"
    };
  }

  const attachedModels = new Set<THREE.Object3D>();
  armorEntries.forEach(({ source, model }) => {
    const attachmentTarget = resolveItemArmorPreviewAttachmentTarget(source);
    const anchor = skeleton.anchors.get(normalizeItemArmorPreviewNodeName(attachmentTarget));
    if (!anchor) {
      return;
    }
    anchor.add(model);
    model.position.set(0, 0, 0);
    model.quaternion.identity();
    model.userData = {
      ...model.userData,
      itemPropertiesPreviewLayoutSlot: source.slot ?? "",
      itemPropertiesPreviewLayoutMode: "skeleton-anchors",
      itemPropertiesPreviewSkeletonMode: ITEM_ARMOR_PREVIEW_SKELETON_MODE,
      itemPropertiesPreviewAttachmentTarget: attachmentTarget,
      itemPropertiesPreviewSkeletonAnchorName: anchor.name
    };
    attachedModels.add(model);
  });

  if (attachedModels.size === 0) {
    return {
      adjustedCount: 0,
      attachedModels,
      mode: "missing-anchors"
    };
  }

  input.modelRoot.add(skeleton.model);
  applyItemArmorWaistSeamOverlap(armorEntries);
  input.modelRoot.userData = {
    ...input.modelRoot.userData,
    itemPropertiesPreviewArmorAssemblyMode: "skeleton-anchors",
    itemPropertiesPreviewSkeletonMode: ITEM_ARMOR_PREVIEW_SKELETON_MODE,
    itemPropertiesPreviewSkeletonCoveredCount: skeleton.coveredCount,
    itemPropertiesPreviewSkeletonTargetCount: skeleton.targetCount
  };
  return {
    adjustedCount: attachedModels.size,
    attachedModels,
    mode: "skeleton-anchors"
  };
}

function applyItemArmorPreviewFallbackLayout(
  loadedEntries: Array<{ source: ItemPreviewModelSource; model: THREE.Object3D }>
): number {
  if (loadedEntries.filter((entry) => entry.source.slot).length < 2) {
    return 0;
  }
  const boxesBySlot = collectItemArmorPreviewLayoutBoxes(loadedEntries);
  const targetsBySlot = resolveItemArmorPreviewLayoutTargets(boxesBySlot);
  let adjustedCount = 0;
  loadedEntries.forEach(({ source, model }) => {
    const slot = source.slot ?? "";
    const targetCenter = targetsBySlot.get(slot);
    const layoutBox = boxesBySlot.get(slot);
    if (!targetCenter || !layoutBox) {
      return;
    }
    const offset = targetCenter.clone().sub(layoutBox.center);
    model.position.add(offset);
    model.userData = {
      ...model.userData,
      itemPropertiesPreviewLayoutSlot: slot,
      itemPropertiesPreviewLayoutMode: "bbox-humanoid-chain",
      itemPropertiesPreviewLayoutTarget: [targetCenter.x, targetCenter.y, targetCenter.z]
        .map((value) => value.toFixed(4))
        .join(","),
      itemPropertiesPreviewLayoutOffset: [offset.x, offset.y, offset.z]
        .map((value) => value.toFixed(4))
        .join(",")
    };
    adjustedCount += 1;
  });
  applyItemArmorWaistSeamOverlap(loadedEntries);
  return adjustedCount;
}

function findExactTextureReferenceForSource(
  source: ItemPreviewModelSource,
  texturesByReference: Map<string, THREE.Texture>
): string | null {
  const candidates = [
    source.label,
    source.label.replace(/_?\d+$/u, ""),
    source.slot ?? ""
  ]
    .map(normalizePlaceableTextureReference)
    .filter(Boolean);

  for (const candidate of candidates) {
    if (texturesByReference.has(candidate)) {
      return candidate;
    }
  }

  const normalizedLabel = normalizePlaceableTextureReference(source.label);
  if (!normalizedLabel) {
    return null;
  }
  const matchingReference = Array.from(texturesByReference.keys()).find(
    (reference) =>
      normalizedLabel === reference ||
      normalizedLabel.startsWith(`${reference}_`) ||
      reference.startsWith(`${normalizedLabel}_`)
  );
  return matchingReference ?? null;
}

function applyItemPreviewTextures(
  model: THREE.Object3D,
  source: ItemPreviewModelSource,
  texturesByReference: Map<string, THREE.Texture>
): number {
  if (texturesByReference.size === 0) {
    return 0;
  }
  const exactReference = findExactTextureReferenceForSource(source, texturesByReference);
  const texture = exactReference ? texturesByReference.get(exactReference) : undefined;
  if (exactReference && texture) {
    applyPlaceableTexturesToModel(model, new Map([[exactReference, texture]]), texture);
    return 1;
  }
  applyPlaceableTexturesToModel(model, texturesByReference);
  return texturesByReference.size;
}

function resolvePreviewTintSlot(
  source: ItemPreviewModelSource
): keyof SceneObjectItemMaterialColors {
  return resolveItemArmorMaterialColorSlot(source.slot);
}

function resolveVisibleItemPreviewTint(
  tintSlot: keyof SceneObjectItemMaterialColors,
  tintValue: number
): THREE.Color {
  return new THREE.Color(resolveItemMaterialColorHex(tintSlot, tintValue));
}

function isItemPreviewPaletteTextureMap(texture: THREE.Texture | null | undefined): boolean {
  return Boolean(
    texture?.userData?.isPLT === true ||
      texture?.userData?.auroraIsPlt === true ||
      texture?.userData?.itemPropertiesPreviewRawTextureExtension === "plt"
  );
}

function applyItemPreviewMaterialTint(
  model: THREE.Object3D,
  object: SceneObject,
  source: ItemPreviewModelSource
): number {
  const tintSlot = resolvePreviewTintSlot(source);
  const tintValue = object.itemProperties?.materialColors?.[tintSlot];
  if (typeof tintValue !== "number" || !Number.isFinite(tintValue)) {
    return 0;
  }
  const tint = resolveVisibleItemPreviewTint(tintSlot, tintValue);
  let appliedCount = 0;
  model.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) {
      return;
    }
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    materials.forEach((material) => {
      if (!("color" in material) || !(material.color instanceof THREE.Color)) {
        return;
      }
      const textureMap =
        "map" in material && material.map instanceof THREE.Texture ? material.map : null;
      const preservesPaletteColor = isItemPreviewPaletteTextureMap(textureMap);
      material.color.copy(preservesPaletteColor ? new THREE.Color(0xffffff) : tint);
      if ("emissive" in material && material.emissive instanceof THREE.Color) {
        material.emissive.copy(preservesPaletteColor ? new THREE.Color(0x000000) : tint);
        if ("emissiveIntensity" in material && typeof material.emissiveIntensity === "number") {
          material.emissiveIntensity = preservesPaletteColor
            ? 0
            : Math.max(material.emissiveIntensity, 0.04);
        }
      }
      material.userData = {
        ...material.userData,
        itemPropertiesPreviewTintApplied: true,
        itemPropertiesPreviewTintSlot: tintSlot,
        itemPropertiesPreviewTintValue: tintValue,
        itemPropertiesPreviewTintHex: `#${tint.getHexString()}`,
        itemPropertiesPreviewTintPreservedByPalette: preservesPaletteColor
      };
      if ("roughness" in material && typeof material.roughness === "number") {
        material.roughness = Math.min(0.92, Math.max(0.38, material.roughness));
      }
      if ("metalness" in material && typeof material.metalness === "number") {
        material.metalness = Math.min(0.65, Math.max(0.02, material.metalness));
      }
      material.needsUpdate = true;
      appliedCount += 1;
    });
  });
  return appliedCount;
}

async function loadItemPreviewTexture(
  loader: THREE.TextureLoader,
  source: ItemPreviewTextureSource,
  assetAccessToken: string | null,
  pltPaletteRows?: AuroraPltPaletteRowsByLayer
): Promise<[string, THREE.Texture] | null> {
  if (ITEM_MODEL_PREVIEW_RAW_TEXTURE_EXTENSIONS.has(source.extension)) {
    try {
      if (source.extension === "plt") {
        await ensureAuroraPltPaletteDataLoaded();
      }
      const response = await fetch(source.url, {
        headers: assetAccessToken ? { Authorization: `Bearer ${assetAccessToken}` } : undefined
      });
      if (!response.ok) {
        return null;
      }
      const decoded = decodeRawTextureToRgba(
        await response.arrayBuffer(),
        source.extension,
        source.extension === "plt" ? pltPaletteRows : undefined
      );
      const texture = new THREE.DataTexture(
        new Uint8Array(decoded.rgba),
        decoded.width,
        decoded.height,
        THREE.RGBAFormat
      );
      texture.name = source.reference;
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.flipY = false;
      texture.needsUpdate = true;
      texture.userData = {
        ...texture.userData,
        itemPropertiesPreviewTextureReference: source.reference,
        itemPropertiesPreviewRawTextureExtension: source.extension,
        itemPropertiesPreviewPaletteRows: source.extension === "plt" ? pltPaletteRows : undefined
      };
      return [source.reference, texture];
    } catch {
      return null;
    }
  }

  const textureUrl =
    assetAccessToken && !source.url.startsWith("blob:")
      ? await fetch(source.url, {
          headers: { Authorization: `Bearer ${assetAccessToken}` }
        })
          .then((response) => {
            if (!response.ok) {
              throw new Error(`Texture request failed with ${response.status}`);
            }
            return response.blob();
          })
          .then((blob) => URL.createObjectURL(blob))
      : source.url;

  return new Promise((resolve) => {
    loader.load(
      textureUrl,
      (texture) => {
        texture.name = source.reference;
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.flipY = false;
        texture.userData = {
          ...texture.userData,
          itemPropertiesPreviewTextureReference: source.reference
        };
        if (textureUrl !== source.url && textureUrl.startsWith("blob:")) {
          URL.revokeObjectURL(textureUrl);
        }
        resolve([source.reference, texture]);
      },
      undefined,
      () => {
        if (textureUrl !== source.url && textureUrl.startsWith("blob:")) {
          URL.revokeObjectURL(textureUrl);
        }
        resolve(null);
      }
    );
  });
}

export function ItemModelPreviewPane({
  object,
  previewImageUrl,
  previewImageAlt,
  assetAccessToken = null,
  processingStatus = "idle"
}: ItemModelPreviewPaneProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "fallback" | "error">("fallback");
  const [message, setMessage] = useState("Model unavailable");
  const [coloredMaterialCount, setColoredMaterialCount] = useState(0);
  const [texturedMaterialCount, setTexturedMaterialCount] = useState(0);
  const [loadedModelPartCount, setLoadedModelPartCount] = useState(0);
  const [failedModelPartCount, setFailedModelPartCount] = useState(0);
  const [failedTextureCount, setFailedTextureCount] = useState(0);
  const [layoutAdjustedCount, setLayoutAdjustedCount] = useState(0);
  const [layoutMode, setLayoutMode] = useState("none");
  const [resolvedPreviewImageUrl, setResolvedPreviewImageUrl] = useState<string | null>(
    previewImageUrl ?? null
  );
  const [fallbackImageStatus, setFallbackImageStatus] = useState<
    "none" | "loading" | "ready" | "error"
  >(previewImageUrl ? "ready" : "none");
  const modelSources = useMemo(() => collectItemPreviewModelSources(object), [object]);
  const textureSources = useMemo(() => collectItemPreviewTextureSources(object), [object]);
  const sourceSignature = useMemo(
    () => modelSources.map((source) => source.key).join("|"),
    [modelSources]
  );
  const textureSignature = useMemo(
    () => textureSources.map((source) => `${source.reference}:${source.url}`).join("|"),
    [textureSources]
  );
  const materialColorSignature = useMemo(
    () => JSON.stringify(object.itemProperties?.materialColors ?? {}),
    [object.itemProperties?.materialColors]
  );
  const pltPaletteRows = useMemo(
    () => buildItemPltPaletteRowsByLayer(object.itemProperties?.materialColors),
    [object.itemProperties?.materialColors]
  );

  useEffect(() => {
    if (modelSources.length > 0 || !previewImageUrl) {
      setResolvedPreviewImageUrl(null);
      setFallbackImageStatus("none");
      return;
    }
    const resolvedUrl = resolvePlaceableAssetDeliveryUrl(previewImageUrl);
    if (
      !assetAccessToken ||
      resolvedUrl.startsWith("blob:") ||
      resolvedUrl.startsWith("data:")
    ) {
      setResolvedPreviewImageUrl(resolvedUrl);
      setFallbackImageStatus("ready");
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;
    setFallbackImageStatus("loading");
    void fetch(resolvedUrl, {
      headers: { Authorization: `Bearer ${assetAccessToken}` }
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Preview image request failed with ${response.status}.`);
        }
        return response.blob();
      })
      .then((blob) => {
        if (cancelled) {
          return;
        }
        objectUrl = URL.createObjectURL(blob);
        setResolvedPreviewImageUrl(objectUrl);
        setFallbackImageStatus("ready");
      })
      .catch(() => {
        if (!cancelled) {
          setResolvedPreviewImageUrl(null);
          setFallbackImageStatus("error");
        }
      });

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [assetAccessToken, modelSources.length, previewImageUrl]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || modelSources.length === 0) {
      setStatus("fallback");
      setMessage(
        processingStatus === "processing" ? "Preparing 3D model..." : "3D model unsupported"
      );
      setColoredMaterialCount(0);
      setTexturedMaterialCount(0);
      setLoadedModelPartCount(0);
      setFailedModelPartCount(0);
      setFailedTextureCount(0);
      setLayoutAdjustedCount(0);
      setLayoutMode("none");
      return;
    }

    let cancelled = false;
    let frameId = 0;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x77828c);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 100);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.minDistance = 0.8;
    controls.maxDistance = 8;

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    keyLight.position.set(3, 4, 5);
    scene.add(keyLight);
    scene.add(new THREE.AmbientLight(0xffffff, 1.4));

    const modelRoot = new THREE.Group();
    scene.add(modelRoot);
    mount.replaceChildren(renderer.domElement);

    const resize = () => {
      const width = Math.max(1, mount.clientWidth);
      const height = Math.max(ITEM_MODEL_PREVIEW_MIN_HEIGHT_PX, mount.clientHeight || 1);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    resize();
    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(resize)
        : null;
    resizeObserver?.observe(mount);

    const animate = () => {
      controls.update();
      renderer.render(scene, camera);
      frameId = window.requestAnimationFrame(animate);
    };

    setStatus("loading");
    setMessage("Loading model...");
    setColoredMaterialCount(0);
    setTexturedMaterialCount(0);
    setLoadedModelPartCount(0);
    setFailedModelPartCount(0);
    setFailedTextureCount(0);
    setLayoutAdjustedCount(0);
    setLayoutMode("none");
    const loader = new GLTFLoader();
    const textureLoader = new THREE.TextureLoader();
    if (assetAccessToken) {
      loader.setRequestHeader({ Authorization: `Bearer ${assetAccessToken}` });
      loader.setWithCredentials(false);
    }
    const loadModelSource = (source: ItemPreviewModelSource) =>
      new Promise<THREE.Object3D>((resolve, reject) => {
        loader.load(
          source.url,
          (gltf) => {
            gltf.scene.userData = {
              ...gltf.scene.userData,
              itemPreviewSourceLabel: source.label,
              itemPreviewSlot: source.slot ?? ""
            };
            resolve(gltf.scene);
          },
          undefined,
          reject
        );
      });

    void (async () => {
      const loadedTextures = (
        await Promise.all(
          textureSources.map((source) =>
            loadItemPreviewTexture(textureLoader, source, assetAccessToken, pltPaletteRows)
          )
        )
      ).filter((entry): entry is [string, THREE.Texture] => Boolean(entry));
      const failedTextures = textureSources.length - loadedTextures.length;
      const texturesByReference = new Map(loadedTextures);
      const loadedEntries: Array<{ source: ItemPreviewModelSource; model: THREE.Object3D }> = [];
      let failedModels = 0;
      for (const source of modelSources) {
        if (cancelled) {
          return;
        }
        try {
          const model = await loadModelSource(source);
          if (cancelled) {
            disposePreviewObject(model);
            return;
          }
          loadedEntries.push({ source, model });
        } catch {
          failedModels += 1;
          // Keep loading later parts; one missing GLB must not hide every other model part.
        }
      }
      if (cancelled) {
        loadedEntries.forEach(({ model }) => disposePreviewObject(model));
        return;
      }
      if (loadedEntries.length === 0) {
        setStatus("error");
        setMessage(
          `Model load failed (${failedModels} / ${modelSources.length} parts, ${failedTextures} texture failures)`
        );
        setLoadedModelPartCount(0);
        setFailedModelPartCount(failedModels);
        setFailedTextureCount(failedTextures);
        return;
      }

      let tintAppliedCount = 0;
      let textureAppliedCount = 0;
      loadedEntries.forEach(({ model, source }) => {
        textureAppliedCount += applyItemPreviewTextures(model, source, texturesByReference);
        tintAppliedCount += applyItemPreviewMaterialTint(model, object, source);
      });
      const skeletonLayout = applyItemArmorPreviewSkeletonLayout({ modelRoot, loadedEntries });
      loadedEntries.forEach(({ model }) => {
        if (!skeletonLayout.attachedModels.has(model)) {
          modelRoot.add(model);
        }
      });
      const fallbackAdjustedCount =
        skeletonLayout.adjustedCount > 0
          ? 0
          : applyItemArmorPreviewFallbackLayout(loadedEntries);
      const layoutAdjusted = skeletonLayout.adjustedCount + fallbackAdjustedCount;
      const appliedLayoutMode =
        skeletonLayout.adjustedCount > 0
          ? skeletonLayout.mode
          : fallbackAdjustedCount > 0
            ? "bbox-humanoid-chain"
            : skeletonLayout.mode;
      fitCameraToObject(camera, controls, modelRoot);
      setStatus("ready");
      setMessage(`${loadedEntries.length} / ${modelSources.length} model parts`);
      setLoadedModelPartCount(loadedEntries.length);
      setFailedModelPartCount(failedModels);
      setFailedTextureCount(failedTextures);
      setColoredMaterialCount(tintAppliedCount);
      setTexturedMaterialCount(textureAppliedCount);
      setLayoutAdjustedCount(layoutAdjusted);
      setLayoutMode(appliedLayoutMode);
      if (frameId === 0) {
        animate();
      }
    })();

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frameId);
      resizeObserver?.disconnect();
      controls.dispose();
      disposePreviewObject(modelRoot);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [
    assetAccessToken,
    materialColorSignature,
    modelSources,
    object,
    pltPaletteRows,
    processingStatus,
    sourceSignature,
    textureSignature,
    textureSources
  ]);

  return (
    <aside
      className={`canvas-item-model-preview canvas-item-model-preview-${status}`}
      aria-label="Item model preview"
      data-model-source-count={modelSources.length}
      data-model-status={status}
      data-model-processing-status={processingStatus}
      data-model-colored-material-count={coloredMaterialCount}
      data-model-texture-source-count={textureSources.length}
      data-model-textured-material-count={texturedMaterialCount}
      data-model-loaded-part-count={loadedModelPartCount}
      data-model-failed-part-count={failedModelPartCount}
      data-model-failed-texture-count={failedTextureCount}
      data-model-layout-adjusted-count={layoutAdjustedCount}
      data-model-layout-mode={layoutMode}
      data-model-fallback-image-status={fallbackImageStatus}
    >
      <div className="canvas-item-model-preview-stage" ref={mountRef}>
        {modelSources.length === 0 && resolvedPreviewImageUrl ? (
          <img src={resolvedPreviewImageUrl} alt={previewImageAlt ?? `${object.tag} preview`} />
        ) : null}
        {modelSources.length === 0 && !resolvedPreviewImageUrl ? (
          <span className="canvas-item-model-preview-unsupported">3D model unsupported</span>
        ) : null}
      </div>
      <div className="canvas-item-model-preview-footer">
        <span>{message}</span>
        <span>{modelSources.length > 0 ? "Drag to rotate" : "2D fallback only"}</span>
      </div>
    </aside>
  );
}
