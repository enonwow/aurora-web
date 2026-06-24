import type { PlaceableViewportRenderPayload } from "./placeableRenderPayloadResolver";
import { normalizePlaceableTextureReference } from "./placeableTextureReferences";

const SUPPORTED_PLACEABLE_MODEL_EXTENSIONS: ReadonlyArray<string> = [".glb", ".gltf"];
const UNSUPPORTED_PLACEABLE_MODEL_EXTENSIONS: ReadonlyArray<string> = [".mdl", ".mdb"];
const DEFAULT_BACKEND_DELIVERY_ORIGIN = "http://localhost:3000";
const DEV_BACKEND_PROXY_PREFIX = "/_aurora";

export interface PlaceableRenderModelResolution {
  modelUrl: string | null;
  modelCacheKey: string | null;
  status: string | null;
  fallbackReason: string | null;
  ready: boolean;
}

export function resolveBackendDeliveryOriginFromConfig(
  configuredBaseUrl?: string,
  fallbackOrigin = resolveDefaultDeliveryOrigin()
): string {
  if (configuredBaseUrl && configuredBaseUrl.trim().length > 0) {
    try {
      return new URL(configuredBaseUrl, fallbackOrigin).origin;
    } catch {
      // Fallback handled below.
    }
  }
  return fallbackOrigin;
}

function resolveDefaultDeliveryOrigin(): string {
  const locationOrigin = globalThis.location?.origin;
  if (import.meta.env.DEV && isViteDevServerOrigin(locationOrigin)) {
    return DEFAULT_BACKEND_DELIVERY_ORIGIN;
  }
  if (locationOrigin && locationOrigin !== "null") {
    return locationOrigin;
  }
  return DEFAULT_BACKEND_DELIVERY_ORIGIN;
}

function isViteDevServerOrigin(origin: string | undefined): boolean {
  if (!origin || origin === "null") {
    return false;
  }
  try {
    const parsed = new URL(origin);
    return (
      (parsed.hostname === "localhost" ||
        parsed.hostname === "127.0.0.1" ||
        parsed.hostname === "::1" ||
        parsed.hostname === "[::1]") &&
      /^517\d$/u.test(parsed.port)
    );
  } catch {
    return false;
  }
}

function resolveAbsoluteDeliveryUrl(deliveryUrl: string, deliveryOrigin: string): string {
  const resolvedDeliveryUrl = resolveDevProxiedDeliveryUrl(deliveryUrl, deliveryOrigin);
  if (/^https?:\/\//iu.test(resolvedDeliveryUrl)) {
    return resolvedDeliveryUrl;
  }
  return new URL(resolvedDeliveryUrl, deliveryOrigin).toString();
}

function toAssetObjectCacheKey(objectKey: string | undefined): string | null {
  const normalized = objectKey?.trim();
  return normalized ? `objectKey:${normalized}` : null;
}

export function resolvePlaceableAssetDeliveryUrl(
  deliveryUrl: string,
  deliveryOrigin = resolveDefaultDeliveryOrigin()
): string {
  return resolveAbsoluteDeliveryUrl(deliveryUrl, deliveryOrigin);
}

function resolveDevProxiedDeliveryUrl(deliveryUrl: string, deliveryOrigin: string): string {
  if (!import.meta.env.DEV || !deliveryUrl.startsWith("/api/")) {
    return deliveryUrl;
  }
  if (!isViteDevServerOrigin(deliveryOrigin)) {
    return deliveryUrl;
  }
  return deliveryUrl.replace(/^\/api/u, DEV_BACKEND_PROXY_PREFIX);
}

export function resolvePlaceableTextureDeliveryUrl(
  payload: PlaceableViewportRenderPayload,
  deliveryOrigin = resolveDefaultDeliveryOrigin()
): string | null {
  const roleByAssetId = new Map<string, string>(
    payload.placeable.assetManifest.assets.map((asset) => [asset.assetId, asset.role])
  );
  const textureContract = payload.assetContracts.assets.find(
    (assetContract) => roleByAssetId.get(assetContract.assetId) === "texture"
  );
  if (textureContract?.deliveryUrl && textureContract.deliveryUrl.trim().length > 0) {
    return resolveAbsoluteDeliveryUrl(textureContract.deliveryUrl, deliveryOrigin);
  }
  const packageTextureUrls = payload.renderPackage?.textureUrls;
  if (!Array.isArray(packageTextureUrls)) {
    return null;
  }
  for (const textureUrl of packageTextureUrls) {
    if (typeof textureUrl !== "string") {
      continue;
    }
    const normalizedTextureUrl = textureUrl.trim();
    if (normalizedTextureUrl.length === 0) {
      continue;
    }
    return resolveAbsoluteDeliveryUrl(normalizedTextureUrl, deliveryOrigin);
  }
  return null;
}

export function resolvePlaceableTextureDeliveryUrlsByReference(
  payload: PlaceableViewportRenderPayload,
  deliveryOrigin = resolveDefaultDeliveryOrigin()
): Map<string, string> {
  const assetById = new Map(
    payload.placeable.assetManifest.assets.map((asset) => [asset.assetId, asset])
  );
  const urlsByReference = new Map<string, string>();

  payload.assetContracts.assets.forEach((assetContract) => {
    const asset = assetById.get(assetContract.assetId);
    if (!asset || asset.role !== "texture" || assetContract.deliveryUrl.trim().length === 0) {
      return;
    }
    const reference = normalizePlaceableTextureReference(asset.fileName);
    if (!reference || urlsByReference.has(reference)) {
      return;
    }
    urlsByReference.set(
      reference,
      resolveAbsoluteDeliveryUrl(assetContract.deliveryUrl, deliveryOrigin)
    );
  });

  const packageTextureUrls = payload.renderPackage?.textureUrls;
  if (Array.isArray(packageTextureUrls)) {
    packageTextureUrls.forEach((textureUrl) => {
      if (typeof textureUrl !== "string") {
        return;
      }
      const normalizedTextureUrl = textureUrl.trim();
      if (normalizedTextureUrl.length === 0) {
        return;
      }
      const reference = normalizePlaceableTextureReference(normalizedTextureUrl);
      if (!reference || urlsByReference.has(reference)) {
        return;
      }
      urlsByReference.set(reference, resolveAbsoluteDeliveryUrl(normalizedTextureUrl, deliveryOrigin));
    });
  }

  return urlsByReference;
}

export function resolvePlaceableVfxChunkModelDeliveryUrlsByAssetId(
  payload: PlaceableViewportRenderPayload,
  deliveryOrigin = resolveDefaultDeliveryOrigin()
): Map<string, string> {
  const chunkModelAssetIds = new Set(
    (payload.renderPackage?.assetRefs.chunkModelAssetIds ?? [])
      .map((assetId) => normalizeAssetId(assetId))
      .filter((assetId) => assetId.length > 0)
  );
  if (chunkModelAssetIds.size === 0) {
    return new Map();
  }

  const assetById = new Map(
    payload.placeable.assetManifest.assets.map((asset) => [normalizeAssetId(asset.assetId), asset])
  );
  const urlsByAssetId = new Map<string, string>();
  payload.assetContracts.assets.forEach((assetContract) => {
    const assetId = normalizeAssetId(assetContract.assetId);
    const deliveryUrl =
      typeof assetContract.deliveryUrl === "string" ? assetContract.deliveryUrl.trim() : "";
    const asset = assetById.get(assetId);
    if (
      assetId.length === 0 ||
      deliveryUrl.length === 0 ||
      urlsByAssetId.has(assetId) ||
      !chunkModelAssetIds.has(assetId) ||
      asset?.role !== "model" ||
      resolveUnsupportedModelCandidateReason(deliveryUrl) !== null
    ) {
      return;
    }
    urlsByAssetId.set(assetId, resolveAbsoluteDeliveryUrl(deliveryUrl, deliveryOrigin));
  });
  return urlsByAssetId;
}

function normalizeAssetId(assetId: string): string {
  return assetId.trim();
}

interface PlaceableModelDeliveryCandidate {
  deliveryUrl: string;
  modelCacheKey: string | null;
}

function toModelCacheKey(objectKey: string | undefined): string | null {
  return toAssetObjectCacheKey(objectKey);
}

function resolveModelCacheKeyFromAssetContracts(
  payload: PlaceableViewportRenderPayload,
  modelCandidate: string
): string | null {
  const assetById = new Map(
    payload.placeable.assetManifest.assets.map((asset) => [normalizeAssetId(asset.assetId), asset])
  );
  const contractByAssetId = new Map(
    payload.assetContracts.assets.map((assetContract) => [
      normalizeAssetId(assetContract.assetId),
      assetContract
    ])
  );
  const renderPackageAssetIds = [
    ...(payload.renderPackage?.assetRefs?.derivedModelAssetIds ?? []),
    ...(payload.renderPackage?.assetRefs?.modelAssetIds ?? [])
  ];

  for (const assetId of renderPackageAssetIds) {
    if (typeof assetId !== "string") {
      continue;
    }
    const normalizedAssetId = normalizeAssetId(assetId);
    const contract = contractByAssetId.get(normalizedAssetId);
    const asset = assetById.get(normalizedAssetId);
    const modelCacheKey = toModelCacheKey(contract?.objectKey ?? asset?.objectKey);
    if (modelCacheKey) {
      return modelCacheKey;
    }
  }

  const normalizedCandidate = modelCandidate.trim();
  for (const contract of payload.assetContracts.assets) {
    const deliveryUrl = contract.deliveryUrl.trim();
    const deliveryPath = contract.deliveryPath.trim();
    if (deliveryUrl !== normalizedCandidate && deliveryPath !== normalizedCandidate) {
      continue;
    }
    const asset = assetById.get(normalizeAssetId(contract.assetId));
    return toModelCacheKey(contract.objectKey ?? asset?.objectKey);
  }

  return null;
}

function resolveDerivedModelDeliveryFromAssetContracts(
  payload: PlaceableViewportRenderPayload
): PlaceableModelDeliveryCandidate | null {
  const derivedModelAssetIds = payload.renderPackage?.assetRefs?.derivedModelAssetIds;
  if (!Array.isArray(derivedModelAssetIds) || derivedModelAssetIds.length === 0) {
    return null;
  }

  const deliveryByAssetId = new Map<string, PlaceableModelDeliveryCandidate>();
  payload.assetContracts.assets.forEach((assetContract) => {
    const normalizedAssetId = normalizeAssetId(assetContract.assetId);
    const normalizedDeliveryUrl =
      typeof assetContract.deliveryUrl === "string" ? assetContract.deliveryUrl.trim() : "";
    if (normalizedAssetId.length === 0 || normalizedDeliveryUrl.length === 0) {
      return;
    }
    if (!deliveryByAssetId.has(normalizedAssetId)) {
      deliveryByAssetId.set(normalizedAssetId, {
        deliveryUrl: normalizedDeliveryUrl,
        modelCacheKey: toModelCacheKey(assetContract.objectKey)
      });
    }
  });

  for (const assetId of derivedModelAssetIds) {
    if (typeof assetId !== "string") {
      continue;
    }
    const delivery = deliveryByAssetId.get(normalizeAssetId(assetId));
    if (delivery) {
      return delivery;
    }
  }

  return null;
}

export function resolvePlaceableModelResolution(
  payload: PlaceableViewportRenderPayload,
  deliveryOrigin = resolveDefaultDeliveryOrigin()
): PlaceableRenderModelResolution {
  const renderPackage = payload.renderPackage;
  if (!renderPackage) {
    return {
      modelUrl: null,
      modelCacheKey: null,
      status: null,
      fallbackReason: null,
      ready: false
    };
  }

  const status = typeof renderPackage.status === "string" ? renderPackage.status.trim() : "";
  const normalizedStatus = status.toLowerCase();
  const modelCandidateFromRenderPackage =
    typeof renderPackage.glbUrl === "string" && renderPackage.glbUrl.trim().length > 0
      ? renderPackage.glbUrl
      : typeof renderPackage.modelUrl === "string" && renderPackage.modelUrl.trim().length > 0
        ? renderPackage.modelUrl
        : null;
  const derivedModelDelivery = resolveDerivedModelDeliveryFromAssetContracts(payload);
  const modelCandidate = modelCandidateFromRenderPackage ?? derivedModelDelivery?.deliveryUrl ?? null;

  if (status.length > 0 && normalizedStatus !== "ready" && !modelCandidate) {
    return {
      modelUrl: null,
      modelCacheKey: null,
      status,
      fallbackReason: `renderPackage.status is "${status}"`,
      ready: false
    };
  }

  if (!modelCandidate) {
    return {
      modelUrl: null,
      modelCacheKey: null,
      status,
      fallbackReason: "renderPackage has no model URL",
      ready: false
    };
  }

  const fallbackFromExtension = resolveUnsupportedModelCandidateReason(modelCandidate);
  if (fallbackFromExtension) {
    return {
      modelUrl: null,
      modelCacheKey: null,
      status,
      fallbackReason: fallbackFromExtension,
      ready: false
    };
  }

  return {
    modelUrl: resolveAbsoluteDeliveryUrl(modelCandidate, deliveryOrigin),
    modelCacheKey:
      modelCandidateFromRenderPackage !== null
        ? resolveModelCacheKeyFromAssetContracts(payload, modelCandidate)
        : derivedModelDelivery?.modelCacheKey ?? null,
    status,
    fallbackReason: null,
    ready: true
  };
}

export function resolveUnsupportedModelCandidateReason(candidateUrl: string): string | null {
  const normalized = candidateUrl.trim().toLowerCase();
  if (normalized.length === 0) {
    return "model URL is empty";
  }

  const stripped = normalized.split("?")[0].split("#")[0];
  const extensionIndex = stripped.lastIndexOf(".");
  const extension = extensionIndex >= 0 ? stripped.slice(extensionIndex) : "";
  if (UNSUPPORTED_PLACEABLE_MODEL_EXTENSIONS.includes(extension)) {
    return `model URL resolves to unsupported extension ${extension}`;
  }
  if (SUPPORTED_PLACEABLE_MODEL_EXTENSIONS.includes(extension)) {
    return null;
  }
  return `model URL has unsupported extension ${extension.length > 0 ? extension : "(none)"}`;
}
