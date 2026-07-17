import type { SceneObject } from "../../scene/contracts";
import { composeItemIconPreview, isInvalidItemIconResRef } from "./itemIconComposer";
import {
  resolveItemArmorPartModelResolutions,
  resolveItemModelPartResolutions
} from "./itemRenderAssetResolver";

export type ItemVisualSupportTone = "info" | "warning";

export interface ItemVisualSupportInfo {
  kind: "model-only" | "unsupported" | "missing-source" | "empty-source-model";
  code:
    | "model-without-real-icon"
    | "invalid-icon-no-renderable-model"
    | "empty-model-no-real-icon"
    | "metadata-without-supported-asset"
    | "no-visual-source";
  label: string;
  detail: string;
  tone: ItemVisualSupportTone;
}

const EMPTY_ITEM_GLB_SIZE_THRESHOLD_BYTES = 2048;

function countRawModelCandidates(object: SceneObject): number {
  const properties = object.itemProperties;
  const modelPartCandidates = properties?.modelPartCandidates?.length ?? 0;
  const armorPartCandidates = properties?.armorPartModelCandidates?.length ?? 0;
  const looseModelAssets =
    properties?.modelAssetCandidates?.filter((asset) => asset.role.trim().toLowerCase() === "model")
      .length ?? 0;
  return modelPartCandidates + armorPartCandidates + looseModelAssets;
}

function normalizeText(value: string | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}

function hasSuspiciouslyEmptyDeliveredModel(object: SceneObject): boolean {
  const suspiciousAssets = (object.itemProperties?.modelAssetCandidates ?? []).filter((asset) => {
    const role = normalizeText(asset.role);
    const extension = normalizeText(asset.extension);
    return (
      role === "model" &&
      extension === "glb" &&
      typeof asset.sizeBytes === "number" &&
      Number.isFinite(asset.sizeBytes) &&
      asset.sizeBytes > 0 &&
      asset.sizeBytes <= EMPTY_ITEM_GLB_SIZE_THRESHOLD_BYTES
    );
  });
  if (suspiciousAssets.length === 0) {
    return false;
  }

  const suspiciousAssetIds = new Set(
    suspiciousAssets.map((asset) => normalizeText(asset.assetId)).filter(Boolean)
  );
  const suspiciousReferences = new Set(
    suspiciousAssets.map((asset) => normalizeText(asset.reference)).filter(Boolean)
  );
  const modelPartCandidates = object.itemProperties?.modelPartCandidates ?? [];
  const armorPartCandidates = object.itemProperties?.armorPartModelCandidates ?? [];
  return (
    modelPartCandidates.some((candidate) => {
      return (
        suspiciousAssetIds.has(normalizeText(candidate.assetId)) ||
        suspiciousReferences.has(normalizeText(candidate.resRef))
      );
    }) ||
    armorPartCandidates.some((candidate) => {
      return (
        suspiciousAssetIds.has(normalizeText(candidate.assetId)) ||
        suspiciousReferences.has(normalizeText(candidate.modelResRef)) ||
        suspiciousReferences.has(normalizeText(candidate.partModelName))
      );
    })
  );
}

export function resolveItemVisualSupportInfo(object: SceneObject): ItemVisualSupportInfo | null {
  if (object.kind !== "items") {
    return null;
  }

  const hasIconPreview = Boolean(composeItemIconPreview(object));
  const hasModelPreview =
    resolveItemModelPartResolutions(object).length > 0 ||
    resolveItemArmorPartModelResolutions(object).length > 0;

  if (hasIconPreview || hasModelPreview) {
    if (hasModelPreview && !hasIconPreview) {
      if (hasSuspiciouslyEmptyDeliveredModel(object)) {
        return {
          kind: "empty-source-model",
          code: "empty-model-no-real-icon",
          label: "Preview unavailable",
          detail:
            "A web model asset was delivered, but it is empty/metadata-only and no real inventory icon asset exists.",
          tone: "warning"
        };
      }
      return {
        kind: "model-only",
        code: "model-without-real-icon",
        label: "3D model only",
        detail:
          "No real inventory icon asset was found. The canvas uses the source model when it contains renderable meshes.",
        tone: "info"
      };
    }
    return null;
  }

  const defaultIcon = object.itemProperties?.baseItemDefaultIcon ?? "";
  if (isInvalidItemIconResRef(defaultIcon)) {
    return {
      kind: "unsupported",
      code: "invalid-icon-no-renderable-model",
      label: "Preview unsupported",
      detail:
        "Source-blocked: Aurora marks this item with an invalid inventory icon and provides no renderable web model source.",
      tone: "warning"
    };
  }

  if (countRawModelCandidates(object) > 0) {
    return {
      kind: "missing-source",
      code: "metadata-without-supported-asset",
      label: "Preview unavailable",
      detail:
        "Source-blocked: model metadata exists, but no supported web model or real inventory icon asset was delivered.",
      tone: "warning"
    };
  }

  return {
    kind: "missing-source",
    code: "no-visual-source",
    label: "Preview unavailable",
    detail:
      "Source-blocked: no real inventory icon or renderable model asset was found for this item source.",
    tone: "warning"
  };
}
