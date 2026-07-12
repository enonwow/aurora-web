import type {
  SceneObject,
  SceneObjectItemArmorParts,
  SceneObjectItemModelAssetCandidate
} from "../../scene/contracts";
import {
  resolveBackendDeliveryOriginFromConfig,
  resolvePlaceableAssetDeliveryUrl,
  resolveUnsupportedModelCandidateReason
} from "../../placeables/application/placeableRenderAssetResolver";
import { normalizePlaceableTextureReference } from "../../placeables/application/placeableTextureReferences";

export interface ItemRenderModelPartResolution {
  partResRef: string;
  partIndex: number;
  modelUrl: string;
  modelCacheKey: string;
  role?: string;
  partId?: number;
  assetId?: string;
}

export interface ItemRenderArmorPartModelResolution {
  slot: string;
  partId: number;
  modelUrl: string;
  modelCacheKey: string;
  modelResRef?: string;
  nodeName?: string;
  assetId?: string;
}

const SUPPORTED_ITEM_TEXTURE_EXTENSIONS = new Set([
  "dds",
  "tga",
  "png",
  "jpg",
  "jpeg",
  "webp",
  "bmp",
  "tpc",
  "plt"
]);

function resolveBackendDeliveryOrigin(): string {
  const configuredBaseUrl = import.meta.env.VITE_BACKEND_API_BASE_URL as string | undefined;
  return resolveBackendDeliveryOriginFromConfig(configuredBaseUrl);
}

function normalizeText(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : null;
}

function normalizeModelReference(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}

function isSupportedModelAssetCandidate(
  candidate: SceneObjectItemModelAssetCandidate
): boolean {
  const role = normalizeModelReference(candidate.role);
  const extension = normalizeModelReference(candidate.extension);
  return role === "model" && (extension === "glb" || extension === "gltf");
}

function findModelAssetCandidate(
  object: SceneObject,
  reference: string
): SceneObjectItemModelAssetCandidate | undefined {
  const normalizedReference = normalizeModelReference(reference);
  if (!normalizedReference) {
    return undefined;
  }
  return object.itemProperties?.modelAssetCandidates?.find((candidate) => {
    if (!isSupportedModelAssetCandidate(candidate)) {
      return false;
    }
    return normalizeModelReference(candidate.reference || candidate.fileName) === normalizedReference;
  });
}

function resolveModelAssetDeliveryUrl(
  asset: SceneObjectItemModelAssetCandidate | undefined,
  deliveryOrigin: string
): string | undefined {
  const assetUrl = normalizeText(asset?.assetUrl);
  return assetUrl ? resolvePlaceableAssetDeliveryUrl(assetUrl, deliveryOrigin) : undefined;
}

function resolveSyntheticItemModelPartResolutions(
  object: SceneObject,
  deliveryOrigin: string
): ItemRenderModelPartResolution[] {
  const resRefs = object.itemProperties?.modelPartResRefs ?? [];
  const roles = object.itemProperties?.modelPartResRefRoles ?? [];
  const partIds = object.itemProperties?.modelParts ?? [];
  return resRefs
    .map((resRef, partIndex): ItemRenderModelPartResolution | null => {
      const partResRef = normalizeText(resRef);
      if (!partResRef) {
        return null;
      }
      const asset = findModelAssetCandidate(object, partResRef);
      const modelUrl = resolveModelAssetDeliveryUrl(asset, deliveryOrigin);
      if (!modelUrl || resolveUnsupportedModelCandidateReason(modelUrl)) {
        return null;
      }
      const assetKey = normalizeText(asset?.assetId) ?? partResRef;
      return {
        partResRef,
        partIndex,
        modelUrl,
        modelCacheKey: `item:${object.id}:model-part:${assetKey}`,
        ...(roles[partIndex] ? { role: roles[partIndex] } : {}),
        ...(typeof partIds[partIndex] === "number" ? { partId: partIds[partIndex] } : {}),
        ...(asset?.assetId ? { assetId: asset.assetId } : {})
      };
    })
    .filter((entry): entry is ItemRenderModelPartResolution => Boolean(entry));
}

const ARMOR_PART_MODEL_NAMES: Array<{
  slot: keyof SceneObjectItemArmorParts;
  modelName: string;
}> = [
  { slot: "rFoot", modelName: "footr" },
  { slot: "lFoot", modelName: "footl" },
  { slot: "rShin", modelName: "shinr" },
  { slot: "lShin", modelName: "shinl" },
  { slot: "rThigh", modelName: "legr" },
  { slot: "lThigh", modelName: "legl" },
  { slot: "pelvis", modelName: "pelvis" },
  { slot: "torso", modelName: "chest" },
  { slot: "belt", modelName: "belt" },
  { slot: "neck", modelName: "neck" },
  { slot: "rFArm", modelName: "forer" },
  { slot: "lFArm", modelName: "forel" },
  { slot: "rBicep", modelName: "bicepr" },
  { slot: "lBicep", modelName: "bicepl" },
  { slot: "rShoul", modelName: "shor" },
  { slot: "lShoul", modelName: "shol" },
  { slot: "rHand", modelName: "handr" },
  { slot: "lHand", modelName: "handl" },
  { slot: "robe", modelName: "robe" }
];

function resolveSyntheticItemArmorPartModelResolutions(
  object: SceneObject,
  deliveryOrigin: string
): ItemRenderArmorPartModelResolution[] {
  const armorParts = object.itemProperties?.armorParts;
  const modelPrefix = normalizeText(object.itemProperties?.armorPreviewContext?.modelPrefix);
  if (!armorParts || !modelPrefix) {
    return [];
  }
  return ARMOR_PART_MODEL_NAMES.map((entry): ItemRenderArmorPartModelResolution | null => {
    const partId = armorParts[entry.slot];
    if (typeof partId !== "number" || !Number.isFinite(partId) || partId <= 0) {
      return null;
    }
    const modelResRef = `${modelPrefix}${entry.modelName}${String(partId).padStart(3, "0")}`;
    const asset = findModelAssetCandidate(object, modelResRef);
    const modelUrl = resolveModelAssetDeliveryUrl(asset, deliveryOrigin);
    if (!modelUrl || resolveUnsupportedModelCandidateReason(modelUrl)) {
      return null;
    }
    const assetKey = normalizeText(asset?.assetId) ?? modelResRef;
    return {
      slot: entry.slot,
      partId,
      modelResRef,
      modelUrl,
      modelCacheKey: `item:${object.id}:armor-part:${entry.slot}:${assetKey}`,
      ...(asset?.assetId ? { assetId: asset.assetId } : {})
    };
  }).filter((entry): entry is ItemRenderArmorPartModelResolution => Boolean(entry));
}

export function resolveItemModelPartResolutions(
  object: SceneObject,
  deliveryOrigin = resolveBackendDeliveryOrigin()
): ItemRenderModelPartResolution[] {
  const explicitResolutions = (object.itemProperties?.modelPartCandidates ?? [])
    .map((candidate, partIndex): ItemRenderModelPartResolution | null => {
      const modelCandidate = normalizeText(candidate.glbUrl) ?? normalizeText(candidate.modelUrl);
      if (!modelCandidate || resolveUnsupportedModelCandidateReason(modelCandidate)) {
        return null;
      }
      const partResRef = normalizeText(candidate.resRef);
      if (!partResRef) {
        return null;
      }
      const assetKey =
        normalizeText(candidate.assetId) ?? partResRef ?? `${object.id}:part:${partIndex}`;
      return {
        partResRef,
        partIndex,
        modelUrl: resolvePlaceableAssetDeliveryUrl(modelCandidate, deliveryOrigin),
        modelCacheKey: `item:${object.id}:model-part:${assetKey}`,
        ...(candidate.role ? { role: candidate.role } : {}),
        ...(typeof candidate.partId === "number" ? { partId: candidate.partId } : {}),
        ...(candidate.assetId ? { assetId: candidate.assetId } : {})
      };
    })
    .filter((entry): entry is ItemRenderModelPartResolution => Boolean(entry));
  return explicitResolutions.length > 0
    ? explicitResolutions
    : resolveSyntheticItemModelPartResolutions(object, deliveryOrigin);
}

export function resolveItemArmorPartModelResolutions(
  object: SceneObject,
  deliveryOrigin = resolveBackendDeliveryOrigin()
): ItemRenderArmorPartModelResolution[] {
  const explicitResolutions = (object.itemProperties?.armorPartModelCandidates ?? [])
    .map((candidate): ItemRenderArmorPartModelResolution | null => {
      const modelCandidate = normalizeText(candidate.glbUrl) ?? normalizeText(candidate.modelUrl);
      if (!modelCandidate || resolveUnsupportedModelCandidateReason(modelCandidate)) {
        return null;
      }
      const slot = normalizeText(candidate.slot);
      const modelResRef = normalizeText(candidate.modelResRef) ?? undefined;
      if (!slot || typeof candidate.partId !== "number" || !Number.isFinite(candidate.partId)) {
        return null;
      }
      const assetKey =
        normalizeText(candidate.assetId) ??
        modelResRef ??
        normalizeText(candidate.partModelName) ??
        `${slot}:${candidate.partId}`;
      return {
        slot,
        partId: candidate.partId,
        modelUrl: resolvePlaceableAssetDeliveryUrl(modelCandidate, deliveryOrigin),
        modelCacheKey: `item:${object.id}:armor-part:${slot}:${assetKey}`,
        ...(modelResRef ? { modelResRef } : {}),
        ...(candidate.nodeName ? { nodeName: candidate.nodeName } : {}),
        ...(candidate.assetId ? { assetId: candidate.assetId } : {})
      };
    })
    .filter((entry): entry is ItemRenderArmorPartModelResolution => Boolean(entry));
  return explicitResolutions.length > 0
    ? explicitResolutions
    : resolveSyntheticItemArmorPartModelResolutions(object, deliveryOrigin);
}

export function resolveItemTextureDeliveryUrlsByReference(
  object: SceneObject,
  deliveryOrigin = resolveBackendDeliveryOrigin()
): Map<string, string> {
  const urlsByReference = new Map<string, string>();
  (object.itemProperties?.modelAssetCandidates ?? []).forEach((candidate) => {
    if (candidate.role !== "texture") {
      return;
    }
    const extension = normalizeText(candidate.extension)?.toLowerCase();
    if (!extension || !SUPPORTED_ITEM_TEXTURE_EXTENSIONS.has(extension)) {
      return;
    }
    const assetUrl = normalizeText(candidate.assetUrl);
    if (!assetUrl) {
      return;
    }
    const reference = normalizePlaceableTextureReference(
      candidate.reference || candidate.fileName || candidate.objectKey
    );
    if (!reference || urlsByReference.has(reference)) {
      return;
    }
    urlsByReference.set(reference, resolvePlaceableAssetDeliveryUrl(assetUrl, deliveryOrigin));
  });
  return urlsByReference;
}
