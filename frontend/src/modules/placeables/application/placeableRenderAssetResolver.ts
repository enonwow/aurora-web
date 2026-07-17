import type { PlaceableViewportRenderPayload } from "./placeableRenderPayloadResolver";
import { normalizePlaceableTextureReference } from "./placeableTextureReferences";

const SUPPORTED_PLACEABLE_MODEL_EXTENSIONS: ReadonlyArray<string> = [".glb", ".gltf"];
const UNSUPPORTED_PLACEABLE_MODEL_EXTENSIONS: ReadonlyArray<string> = [".mdl", ".mdb"];
// Match the direct development API origin so relative delivery URLs and cache keys
// keep one loopback identity instead of alternating between localhost and 127.0.0.1.
const DEFAULT_BACKEND_DELIVERY_ORIGIN = "http://127.0.0.1:3000";
const DEV_BACKEND_PROXY_PREFIX = "/_aurora";
const DIFFUSE_TEXTURE_SUFFIXES: ReadonlyArray<string> = [
  "_d",
  "_diff",
  "_diffuse",
  "_albedo",
  "_basecolor",
  "_base_color",
  "_color",
  "_col"
];
const NON_COLOR_TEXTURE_SUFFIXES: ReadonlyArray<string> = [
  "_n",
  "_nrml",
  "_normal",
  "_r",
  "_rough",
  "_roughness",
  "_s",
  "_spec",
  "_specular",
  "_m",
  "_h",
  "_height",
  "_b",
  "_bump"
];
const PLACEABLE_FAST_SHADOW_TEXTURE_REFERENCES = new Set(["fxpa_dot01", "fxpa_dot01.tga"]);

interface TextureDeliveryCandidate {
  deliveryUrl: string;
  reference: string | null;
}

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
  const normalizedBaseUrl = configuredBaseUrl?.trim();
  if (normalizedBaseUrl && normalizedBaseUrl.length > 0) {
    try {
      return new URL(
        normalizedBaseUrl,
        resolveConfiguredDeliveryOriginBase(normalizedBaseUrl, fallbackOrigin)
      ).origin;
    } catch {
      // Fallback handled below.
    }
  }
  return fallbackOrigin;
}

function resolveConfiguredDeliveryOriginBase(configuredBaseUrl: string, fallbackOrigin: string): string {
  if (/^[a-z][a-z\d+\-.]*:/iu.test(configuredBaseUrl) || configuredBaseUrl.startsWith("//")) {
    return fallbackOrigin;
  }
  const locationOrigin = globalThis.location?.origin;
  return locationOrigin && locationOrigin !== "null" ? locationOrigin : fallbackOrigin;
}

function resolveDefaultDeliveryOrigin(): string {
  const locationOrigin = globalThis.location?.origin;
  if (import.meta.env.DEV && isViteDevServerOrigin(locationOrigin)) {
    return DEFAULT_BACKEND_DELIVERY_ORIGIN;
  }
  if (locationOrigin && isDirectLoopbackBackendOrigin(locationOrigin)) {
    return normalizeLoopbackDeliveryIdentity(locationOrigin, DEFAULT_BACKEND_DELIVERY_ORIGIN);
  }
  if (locationOrigin && locationOrigin !== "null") {
    return locationOrigin;
  }
  return DEFAULT_BACKEND_DELIVERY_ORIGIN;
}

function isDirectLoopbackBackendOrigin(origin: string): boolean {
  try {
    const parsed = new URL(origin);
    return (
      (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") &&
      parsed.port === "3000"
    );
  } catch {
    return false;
  }
}

function isViteDevServerOrigin(origin: string | undefined): boolean {
  if (!origin || origin === "null") {
    return false;
  }
  try {
    const parsed = new URL(origin);
    const isLocalhost =
      parsed.hostname === "localhost" ||
      parsed.hostname === "127.0.0.1" ||
      parsed.hostname === "::1" ||
      parsed.hostname === "[::1]";
    return (
      isLocalhost &&
      parsed.port.length > 0 &&
      parsed.port !== "3000" &&
      parsed.port !== "8888"
    );
  } catch {
    return false;
  }
}

function resolveAbsoluteDeliveryUrl(deliveryUrl: string, deliveryOrigin: string): string {
  const resolvedDeliveryUrl = resolveDevProxiedDeliveryUrl(deliveryUrl, deliveryOrigin);
  if (/^https?:\/\//iu.test(resolvedDeliveryUrl)) {
    return normalizeLoopbackDeliveryIdentity(resolvedDeliveryUrl, deliveryOrigin);
  }
  const locationOrigin = globalThis.location?.origin;
  if (
    resolvedDeliveryUrl.startsWith(`${DEV_BACKEND_PROXY_PREFIX}/`) &&
    isViteDevServerOrigin(locationOrigin)
  ) {
    return new URL(resolvedDeliveryUrl, locationOrigin).toString();
  }
  return new URL(resolvedDeliveryUrl, deliveryOrigin).toString();
}

function normalizeLoopbackDeliveryIdentity(deliveryUrl: string, deliveryOrigin: string): string {
  try {
    const parsedDeliveryUrl = new URL(deliveryUrl);
    const parsedDeliveryOrigin = new URL(deliveryOrigin);
    const loopbackHosts = new Set(["localhost", "127.0.0.1"]);
    if (
      parsedDeliveryUrl.protocol === parsedDeliveryOrigin.protocol &&
      parsedDeliveryUrl.port === parsedDeliveryOrigin.port &&
      loopbackHosts.has(parsedDeliveryUrl.hostname) &&
      loopbackHosts.has(parsedDeliveryOrigin.hostname)
    ) {
      parsedDeliveryUrl.hostname = parsedDeliveryOrigin.hostname;
      return parsedDeliveryUrl.toString();
    }
  } catch {
    // Preserve the original absolute candidate when URL normalization is unavailable.
  }
  return deliveryUrl;
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

function resolveAssetContractDeliveryCandidate(assetContract: {
  deliveryPath?: string;
  deliveryUrl?: string;
}): string {
  const deliveryPath =
    typeof assetContract.deliveryPath === "string" ? assetContract.deliveryPath.trim() : "";
  const deliveryUrl =
    typeof assetContract.deliveryUrl === "string" ? assetContract.deliveryUrl.trim() : "";
  if (
    deliveryPath.length > 0 &&
    (deliveryUrl.length === 0 || shouldPreferAssetContractDeliveryPath(deliveryUrl))
  ) {
    return deliveryPath;
  }
  return deliveryUrl.length > 0 ? deliveryUrl : deliveryPath;
}

function resolveModelAssetContractDeliveryCandidate(assetContract: {
  deliveryPath?: string;
  deliveryUrl?: string;
}): string {
  const deliveryUrl =
    typeof assetContract.deliveryUrl === "string" ? assetContract.deliveryUrl.trim() : "";
  const deliveryPath =
    typeof assetContract.deliveryPath === "string" ? assetContract.deliveryPath.trim() : "";
  if (
    deliveryPath.length > 0 &&
    (deliveryUrl.length === 0 || shouldPreferAssetContractDeliveryPath(deliveryUrl))
  ) {
    return deliveryPath;
  }
  return deliveryUrl.length > 0 ? deliveryUrl : deliveryPath;
}

function shouldPreferAssetContractDeliveryPath(deliveryUrl: string): boolean {
  try {
    const parsed = new URL(deliveryUrl, resolveDefaultDeliveryOrigin());
    return parsed.port === "8888" || parsed.pathname.includes("/buckets/");
  } catch {
    return deliveryUrl.includes("/buckets/");
  }
}

function buildTextureAssetContractDeliveryUrlByAssetId(
  payload: PlaceableViewportRenderPayload
): Map<string, string> {
  const roleByAssetId = new Map<string, string>(
    payload.placeable.assetManifest.assets.map((asset) => [asset.assetId, asset.role])
  );
  const deliveryUrlByAssetId = new Map<string, string>();
  payload.assetContracts.assets.forEach((assetContract) => {
    if (roleByAssetId.get(assetContract.assetId) !== "texture") {
      return;
    }
    const deliveryUrl = resolveAssetContractDeliveryCandidate(assetContract);
    if (deliveryUrl.length === 0 || deliveryUrlByAssetId.has(assetContract.assetId)) {
      return;
    }
    deliveryUrlByAssetId.set(assetContract.assetId, deliveryUrl);
  });
  return deliveryUrlByAssetId;
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
  const assetById = new Map(
    payload.placeable.assetManifest.assets.map((asset) => [asset.assetId, asset])
  );
  const textureAssetContractDeliveryUrlByAssetId =
    buildTextureAssetContractDeliveryUrlByAssetId(payload);
  const textureContractCandidates = payload.assetContracts.assets
    .filter((assetContract) => roleByAssetId.get(assetContract.assetId) === "texture")
    .map<TextureDeliveryCandidate>((assetContract) => ({
      deliveryUrl: resolveAssetContractDeliveryCandidate(assetContract),
      reference: normalizePlaceableTextureReference(
        assetById.get(assetContract.assetId)?.fileName ?? assetContract.deliveryUrl
      )
    }));
  const renderPackageTextureBindingCandidates = (payload.renderPackage?.textureBindings ?? [])
    .filter((binding) => binding.deliveryUrl.trim().length > 0)
    .map<TextureDeliveryCandidate>((binding) => ({
      deliveryUrl:
        textureAssetContractDeliveryUrlByAssetId.get(binding.assetId) ?? binding.deliveryUrl,
      reference: normalizePlaceableTextureReference(binding.reference || binding.fileName)
    }));
  const contractTextureUrl = resolvePreferredTextureDeliveryUrl(
    [...renderPackageTextureBindingCandidates, ...textureContractCandidates],
    deliveryOrigin
  );
  if (contractTextureUrl) {
    return contractTextureUrl;
  }
  const packageTextureUrls = payload.renderPackage?.textureUrls;
  if (!Array.isArray(packageTextureUrls)) {
    return null;
  }
  return resolvePreferredTextureDeliveryUrl(
    packageTextureUrls
      .filter((textureUrl): textureUrl is string => typeof textureUrl === "string")
      .map((textureUrl) => ({
        deliveryUrl: textureUrl,
        reference: normalizePlaceableTextureReference(textureUrl)
      })),
    deliveryOrigin
  );
}

function resolvePreferredTextureDeliveryUrl(
  candidates: TextureDeliveryCandidate[],
  deliveryOrigin: string
): string | null {
  let bestCandidate: TextureDeliveryCandidate | null = null;
  let bestScore = -1;

  for (const candidate of candidates) {
    const normalizedDeliveryUrl = candidate.deliveryUrl.trim();
    if (normalizedDeliveryUrl.length === 0) {
      continue;
    }
    const score = scoreTextureDeliveryCandidate(candidate.reference);
    if (score <= 0) {
      continue;
    }
    if (score > bestScore) {
      bestCandidate = {
        deliveryUrl: normalizedDeliveryUrl,
        reference: candidate.reference
      };
      bestScore = score;
    }
    if (score >= 3) {
      break;
    }
  }

  return bestCandidate
    ? resolveAbsoluteDeliveryUrl(bestCandidate.deliveryUrl, deliveryOrigin)
    : null;
}

function scoreTextureDeliveryCandidate(reference: string | null): number {
  const normalized = reference?.trim().toLowerCase();
  if (!normalized) {
    return 1;
  }
  if (isPlaceableFastShadowTextureReference(normalized)) {
    return 0;
  }
  if (DIFFUSE_TEXTURE_SUFFIXES.some((suffix) => normalized.endsWith(suffix))) {
    return 3;
  }
  if (NON_COLOR_TEXTURE_SUFFIXES.some((suffix) => normalized.endsWith(suffix))) {
    return 0;
  }
  return 2;
}

function shouldExposePlaceableRuntimeTextureReference(reference: string | null): boolean {
  return (
    scoreTextureDeliveryCandidate(reference) > 0 ||
    isPlaceableFastShadowTextureReference(reference)
  );
}

function isPlaceableFastShadowTextureReference(reference: string | null | undefined): boolean {
  const normalized = reference?.trim().toLowerCase();
  return Boolean(normalized && PLACEABLE_FAST_SHADOW_TEXTURE_REFERENCES.has(normalized));
}

export function resolvePlaceableTextureDeliveryUrlsByReference(
  payload: PlaceableViewportRenderPayload,
  deliveryOrigin = resolveDefaultDeliveryOrigin()
): Map<string, string> {
  const assetById = new Map(
    payload.placeable.assetManifest.assets.map((asset) => [asset.assetId, asset])
  );
  const textureAssetContractDeliveryUrlByAssetId =
    buildTextureAssetContractDeliveryUrlByAssetId(payload);
  const urlsByReference = new Map<string, string>();

  payload.renderPackage?.textureBindings?.forEach((binding) => {
    const normalizedDeliveryUrl = (
      textureAssetContractDeliveryUrlByAssetId.get(binding.assetId) ?? binding.deliveryUrl
    ).trim();
    if (normalizedDeliveryUrl.length === 0) {
      return;
    }
    const reference = normalizePlaceableTextureReference(binding.reference || binding.fileName);
    if (!reference) {
      return;
    }
    if (urlsByReference.has(reference)) {
      return;
    }
    urlsByReference.set(reference, resolveAbsoluteDeliveryUrl(normalizedDeliveryUrl, deliveryOrigin));
  });

  payload.assetContracts.assets.forEach((assetContract) => {
    const asset = assetById.get(assetContract.assetId);
    const normalizedDeliveryUrl = resolveAssetContractDeliveryCandidate(assetContract);
    if (!asset || asset.role !== "texture" || normalizedDeliveryUrl.length === 0) {
      return;
    }
    const reference = normalizePlaceableTextureReference(asset.fileName);
    if (
      !reference ||
      !shouldExposePlaceableRuntimeTextureReference(reference) ||
      urlsByReference.has(reference)
    ) {
      return;
    }
    urlsByReference.set(
      reference,
      resolveAbsoluteDeliveryUrl(normalizedDeliveryUrl, deliveryOrigin)
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
      if (
        !reference ||
        !shouldExposePlaceableRuntimeTextureReference(reference) ||
        urlsByReference.has(reference)
      ) {
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
    const deliveryUrl = resolveModelAssetContractDeliveryCandidate(assetContract);
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
    const deliveryUrl =
      typeof contract.deliveryUrl === "string" ? contract.deliveryUrl.trim() : "";
    const deliveryPath =
      typeof contract.deliveryPath === "string" ? contract.deliveryPath.trim() : "";
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
    const normalizedDeliveryUrl = resolveModelAssetContractDeliveryCandidate(assetContract);
    if (
      normalizedAssetId.length === 0 ||
      normalizedDeliveryUrl.length === 0 ||
      resolveUnsupportedModelCandidateReason(normalizedDeliveryUrl) !== null
    ) {
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
  const modelCandidate = derivedModelDelivery?.deliveryUrl ?? modelCandidateFromRenderPackage ?? null;

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
      derivedModelDelivery?.deliveryUrl === modelCandidate
        ? derivedModelDelivery.modelCacheKey
        : resolveModelCacheKeyFromAssetContracts(payload, modelCandidate),
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
