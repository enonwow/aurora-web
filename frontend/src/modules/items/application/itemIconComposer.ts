import type { SceneObject } from "../../scene/contracts";
import { ensureAuroraPltPaletteDataLoaded } from "../../placeables/adapters/aurora/auroraPltPalette";
import {
  buildItemPltPaletteRowsByLayer,
  resolveItemMaterialColors,
  resolveItemModelParts
} from "./itemPresentation";
import { decodeRawTextureToPngDataUrl } from "./itemRawTextureDecoder";
import { resolvePlaceableAssetDeliveryUrl } from "../../placeables/application/placeableRenderAssetResolver";

export interface ItemIconComposition {
  previewImageUrl?: string;
  iconResRef: string;
  source: "asset-texture" | "decoded-texture" | "raw-texture";
  label: string;
  swatches: string[];
  pltPaletteRowsByLayer?: Record<number, number>;
  inventoryGrid: {
    widthSlots: number;
    heightSlots: number;
    cellCount: number;
    aspectRatio: number;
  };
  modelPartCount: number;
  assetId?: string;
  assetExtension?: string;
  rawAssetUrl?: string;
  rawAssetExtension?: string;
}

const BROWSER_IMAGE_ICON_EXTENSIONS = new Set(["gif", "jpg", "jpeg", "png", "svg", "webp"]);
const RAW_DECODED_ICON_EXTENSIONS = new Set(["bmp", "dds", "plt", "tga", "tpc"]);

function sanitizeIconText(value: string): string {
  return value.replace(/[^a-zA-Z0-9_]+/gu, "_").replace(/^_+|_+$/gu, "");
}

export function isInvalidItemIconResRef(value: string): boolean {
  const normalized = sanitizeIconText(value).toLowerCase();
  return normalized === "iinvalid" || normalized.startsWith("iinvalid_");
}

function resolveIconSource(object: SceneObject): {
  iconResRef: string;
} {
  const defaultIcon = sanitizeIconText(object.itemProperties?.baseItemDefaultIcon ?? "");
  if (defaultIcon && !isInvalidItemIconResRef(defaultIcon)) {
    return { iconResRef: defaultIcon };
  }
  const modelPart = resolveItemModelParts(object).find((part) => part.resRef)?.resRef;
  const normalizedModelPart = sanitizeIconText(modelPart ?? "");
  if (normalizedModelPart) {
    return { iconResRef: normalizedModelPart };
  }
  return {
    iconResRef: sanitizeIconText(object.resRef) || "item"
  };
}

function resolveIconAssetSource(
  object: SceneObject,
  iconResRef: string
):
  | {
      kind: "browser";
      previewImageUrl: string;
      assetId: string;
      assetExtension: string;
    }
  | {
      kind: "raw";
      assetId: string;
      assetExtension: string;
      rawAssetUrl: string;
      rawAssetExtension: string;
    }
  | undefined {
  const normalizedIcon = sanitizeIconText(iconResRef).toLowerCase();
  if (!normalizedIcon) {
    return undefined;
  }

  const candidates = (object.itemProperties?.modelAssetCandidates ?? [])
    .filter((asset) => {
      const role = asset.role.trim().toLowerCase();
      const extension = asset.extension.trim().toLowerCase();
      const reference = sanitizeIconText(asset.reference).toLowerCase();
      return (
        (role === "texture" || role === "material") &&
        matchesIconAssetReference(reference, normalizedIcon) &&
        (BROWSER_IMAGE_ICON_EXTENSIONS.has(extension) ||
          RAW_DECODED_ICON_EXTENSIONS.has(extension)) &&
        asset.assetUrl.trim().length > 0
      );
    })
    .sort((left, right) => {
      const leftExtension = left.extension.trim().toLowerCase();
      const rightExtension = right.extension.trim().toLowerCase();
      const leftRank =
        leftExtension === "png" || leftExtension === "webp"
          ? 0
          : BROWSER_IMAGE_ICON_EXTENSIONS.has(leftExtension)
            ? 1
            : 2;
      const rightRank =
        rightExtension === "png" || rightExtension === "webp"
          ? 0
          : BROWSER_IMAGE_ICON_EXTENSIONS.has(rightExtension)
            ? 1
            : 2;
      return leftRank - rightRank || left.fileName.localeCompare(right.fileName);
    });

  const asset = candidates[0];
  if (!asset) {
    return undefined;
  }

  const assetExtension = asset.extension.trim().toLowerCase();
  if (BROWSER_IMAGE_ICON_EXTENSIONS.has(assetExtension)) {
    return {
      kind: "browser",
      previewImageUrl: asset.assetUrl,
      assetId: asset.assetId,
      assetExtension
    };
  }
  return {
    kind: "raw",
    assetId: asset.assetId,
    assetExtension,
    rawAssetUrl: asset.assetUrl,
    rawAssetExtension: assetExtension
  };
}

function matchesIconAssetReference(reference: string, normalizedIcon: string): boolean {
  if (reference === normalizedIcon) {
    return true;
  }
  return reference.startsWith(`${normalizedIcon}_`);
}

function resolveItemInventoryGrid(object: SceneObject): ItemIconComposition["inventoryGrid"] {
  const widthSlots =
    typeof object.itemProperties?.baseItemInvSlotWidth === "number"
      ? object.itemProperties.baseItemInvSlotWidth
      : 1;
  const heightSlots =
    typeof object.itemProperties?.baseItemInvSlotHeight === "number"
      ? object.itemProperties.baseItemInvSlotHeight
      : 1;
  const width = Math.max(1, Math.min(10, Math.trunc(widthSlots)));
  const height = Math.max(1, Math.min(10, Math.trunc(heightSlots)));
  return {
    widthSlots: width,
    heightSlots: height,
    cellCount: width * height,
    aspectRatio: width / height
  };
}

export function composeItemIconPreview(object: SceneObject): ItemIconComposition | null {
  if (object.kind !== "items") {
    return null;
  }
  const { iconResRef } = resolveIconSource(object);
  const assetSource = resolveIconAssetSource(object, iconResRef);
  if (!assetSource) {
    return null;
  }
  const materialSwatches = resolveItemMaterialColors(object).map((entry) => entry.colorHex);
  const modelPartCount = resolveItemModelParts(object).length;
  const label = iconResRef
    .replace(/^i+/iu, "")
    .replace(/_/gu, " ")
    .trim()
    .slice(0, 6)
    .toUpperCase() || "ITEM";
  return {
    iconResRef,
    source: assetSource.kind === "browser" ? "asset-texture" : "raw-texture",
    label,
    swatches: materialSwatches,
    ...(assetSource.kind === "raw" && assetSource.rawAssetExtension === "plt"
      ? {
          pltPaletteRowsByLayer: buildItemPltPaletteRowsByLayer(
            object.itemProperties?.materialColors
          )
        }
      : {}),
    inventoryGrid: resolveItemInventoryGrid(object),
    modelPartCount,
    assetId: assetSource.assetId,
    assetExtension: assetSource.assetExtension,
    ...(assetSource.kind === "raw"
      ? {
          rawAssetUrl: assetSource.rawAssetUrl,
          rawAssetExtension: assetSource.rawAssetExtension
        }
      : {}),
    ...(assetSource.kind === "browser" ? { previewImageUrl: assetSource.previewImageUrl } : {})
  };
}

function resolveItemIconDeliveryUrl(url: string): string {
  if (/^data:/iu.test(url)) {
    return url;
  }
  try {
    return resolvePlaceableAssetDeliveryUrl(url);
  } catch {
    return url;
  }
}

export async function resolveDecodedItemIconPreview(
  composition: ItemIconComposition,
  fetchImpl: typeof fetch | undefined = typeof fetch === "undefined" ? undefined : fetch
): Promise<ItemIconComposition | null> {
  const rawAssetUrl = composition.rawAssetUrl;
  const rawAssetExtension = composition.rawAssetExtension;
  if (
    composition.source !== "raw-texture" ||
    !rawAssetUrl ||
    !rawAssetExtension ||
    !RAW_DECODED_ICON_EXTENSIONS.has(rawAssetExtension) ||
    !fetchImpl
  ) {
    return null;
  }
  const deliveryUrl = resolveItemIconDeliveryUrl(rawAssetUrl);
  const response = await fetchImpl(deliveryUrl);
  if (!response.ok) {
    throw new Error(`Icon asset fetch failed with HTTP ${response.status}.`);
  }
  const payload = await response.arrayBuffer();
  if (rawAssetExtension === "plt" && composition.pltPaletteRowsByLayer) {
    await ensureAuroraPltPaletteDataLoaded();
  }
  return {
    ...composition,
    source: "decoded-texture",
    previewImageUrl: decodeRawTextureToPngDataUrl(
      payload,
      rawAssetExtension,
      composition.pltPaletteRowsByLayer
    )
  };
}
