import type {
  PlaceableApiAssetDeliveryContract,
  PlaceableApiAssetContractsBatchRequestItem,
  PlaceableApiAssetContractsResult,
  PlaceableApiAssetRole,
  PlaceableApiProcessPayload,
  PlaceableRenderPackageAssetRefs,
  PlaceableApiProcessResult,
  PlaceableApiViewportRenderPayload,
  PlaceableRenderPackage
} from "../contracts";
import type { PlaceableApiPort } from "../ports/placeableApiPort";
import { isPlaceableCacheNotFoundError } from "../domain/placeableCacheMiss";

const CONTRACT_ROLE_PRIORITY: ReadonlyArray<PlaceableApiAssetRole> = [
  "model",
  "texture",
  "material",
  "vfx",
  "metadata",
  "unknown"
];

const CRITICAL_ASSET_ROLES = new Set<PlaceableApiAssetRole>(["model", "texture"]);
const PLACEABLE_VIEWPORT_RENDER_PAYLOAD_BATCH_SPLIT_THRESHOLD = 8;
const PLACEABLE_VIEWPORT_RENDER_PAYLOAD_SINGLE_RECOVERY_CONCURRENCY = 8;
const PLACEABLE_ASSET_CONTRACT_SINGLE_RECOVERY_CONCURRENCY = 12;

const RENDER_PACKAGE_ASSET_REF_PRIORITY: ReadonlyArray<keyof PlaceableRenderPackageAssetRefs> = [
  "modelAssetIds",
  "derivedModelAssetIds",
  "chunkModelAssetIds",
  "textureAssetIds",
  "materialAssetIds",
  "metadataAssetIds",
  "otherAssetIds"
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasDeferredRuntimeEmitters(renderPackage: PlaceableRenderPackage | undefined): boolean {
  const payload = renderPackage?.auroraVfxPayload;
  if (!isRecord(payload) || !isRecord(payload.contracts)) return false;
  return payload.contracts.runtimeEmittersDeferred === true;
}

function hasHydratedRuntimeEmitters(renderPackage: PlaceableRenderPackage | undefined): boolean {
  const payload = renderPackage?.auroraVfxPayload;
  if (!isRecord(payload) || !isRecord(payload.contracts)) return false;
  return (
    payload.contracts.runtimeEmittersDeferred !== true &&
    Array.isArray(payload.contracts.runtimeEmitters) &&
    payload.contracts.runtimeEmitters.length > 0
  );
}

async function hydrateDeferredViewportVfxPayloads(
  placeableApiPort: PlaceableApiPort,
  accessToken: string,
  payloads: PlaceableApiViewportRenderPayload[]
): Promise<PlaceableApiViewportRenderPayload[]> {
  const hydratedRenderPackages = new Map<string, Promise<PlaceableRenderPackage>>();
  const resolveHydratedRenderPackage = (
    payload: PlaceableApiViewportRenderPayload
  ): Promise<PlaceableRenderPackage> => {
    const cached = hydratedRenderPackages.get(payload.cacheKey);
    if (cached) return cached;
    if (!placeableApiPort.getProcessedPlaceable) {
      throw new Error(
        `Deferred VFX runtime '${payload.cacheKey}' requires placeable cache hydration.`
      );
    }
    const hydration = placeableApiPort
      .getProcessedPlaceable(accessToken, payload.cacheKey, undefined)
      .then((processed) => {
        const renderPackage = processed.placeable.renderPackage;
        if (!hasHydratedRuntimeEmitters(renderPackage)) {
          throw new Error(
            `Placeable cache hydration '${payload.cacheKey}' did not return complete runtime emitters.`
          );
        }
        return renderPackage!;
      });
    hydratedRenderPackages.set(payload.cacheKey, hydration);
    return hydration;
  };

  return Promise.all(
    payloads.map(async (payload) => {
      const renderPackage = payload.renderPackage ?? payload.placeable.renderPackage;
      if (!hasDeferredRuntimeEmitters(renderPackage)) return payload;
      const hydratedRenderPackage = await resolveHydratedRenderPackage(payload);
      return {
        ...payload,
        renderPackage: hydratedRenderPackage,
        placeable: {
          ...payload.placeable,
          renderPackage: hydratedRenderPackage
        }
      };
    })
  );
}

function normalizeAssetId(assetId: string): string {
  return assetId.trim();
}

function hasUsableDeliveryUrl(asset: PlaceableApiAssetDeliveryContract): boolean {
  return asset.deliveryUrl.trim().length > 0;
}

function resolveRenderPackageAssetIds(
  processResult: PlaceableApiProcessResult
): string[] {
  const rawAssetRefs = processResult.placeable.renderPackage?.assetRefs;
  if (!rawAssetRefs) {
    return [];
  }

  const manifestAssetIds = new Set(
    processResult.placeable.assetManifest.assets.map((asset) => normalizeAssetId(asset.assetId))
  );

  const selectedAssetIds: string[] = [];
  const selectedAssetIdSet = new Set<string>();

  RENDER_PACKAGE_ASSET_REF_PRIORITY.forEach((assetRefKey) => {
    const ids = rawAssetRefs[assetRefKey];
    if (!Array.isArray(ids)) {
      return;
    }

    ids.forEach((assetId) => {
      const normalizedAssetId = normalizeAssetId(assetId);
      if (
        normalizedAssetId.length === 0 ||
        selectedAssetIdSet.has(normalizedAssetId) ||
        !manifestAssetIds.has(normalizedAssetId)
      ) {
        return;
      }
      selectedAssetIdSet.add(normalizedAssetId);
      selectedAssetIds.push(normalizedAssetId);
    });
  });

  return selectedAssetIds;
}

function isVfxProcessResult(processResult: PlaceableApiProcessResult): boolean {
  const placeable = processResult.placeable;
  return (
    placeable.placeableSubtype === "vfx" ||
    placeable.render.frontendType === "vfx" ||
    placeable.render.isVfx
  );
}

function hasRenderPackageTextureUrls(processResult: PlaceableApiProcessResult): boolean {
  return (
    processResult.placeable.renderPackage?.textureUrls?.some(
      (textureUrl) => textureUrl.trim().length > 0
    ) === true
  );
}

function hasAuroraEmitterNodes(processResult: PlaceableApiProcessResult): boolean {
  return (
    processResult.placeable.renderPackage?.auroraEmitter?.emitters.some((emitter) =>
      Boolean(emitter.nodeName || emitter.texture || emitter.renderMode || emitter.emitterType)
    ) === true
  );
}

function resolveVfxAssetIdsForContracts(processResult: PlaceableApiProcessResult): string[] {
  const selectedAssetIds: string[] = [];
  const selectedAssetIdSet = new Set<string>();
  const shouldRequestTextureContracts =
    hasAuroraEmitterNodes(processResult) || !hasRenderPackageTextureUrls(processResult);
  const manifestTextureAssetIds = new Set(
    processResult.placeable.assetManifest.assets
      .filter((asset) => asset.role === "texture")
      .map((asset) => normalizeAssetId(asset.assetId))
      .filter((assetId) => assetId.length > 0)
  );
  const manifestModelAssetIds = new Set(
    processResult.placeable.assetManifest.assets
      .filter((asset) => {
        const fileName = asset.fileName.trim().toLowerCase();
        return asset.role === "model" && (fileName.endsWith(".glb") || fileName.endsWith(".gltf"));
      })
      .map((asset) => normalizeAssetId(asset.assetId))
      .filter((assetId) => assetId.length > 0)
  );

  const addAssetId = (assetId: string, allowedAssetIds: Set<string>): void => {
    const normalizedAssetId = normalizeAssetId(assetId);
    if (
      normalizedAssetId.length === 0 ||
      selectedAssetIdSet.has(normalizedAssetId) ||
      !allowedAssetIds.has(normalizedAssetId)
    ) {
      return;
    }
    selectedAssetIdSet.add(normalizedAssetId);
    selectedAssetIds.push(normalizedAssetId);
  };

  processResult.placeable.renderPackage?.assetRefs.chunkModelAssetIds?.forEach((assetId) =>
    addAssetId(assetId, manifestModelAssetIds)
  );
  if (shouldRequestTextureContracts) {
    processResult.placeable.renderPackage?.assetRefs.textureAssetIds?.forEach((assetId) =>
      addAssetId(assetId, manifestTextureAssetIds)
    );
    processResult.placeable.assetManifest.assets.forEach((asset) => {
      if (asset.role === "texture") {
        addAssetId(asset.assetId, manifestTextureAssetIds);
      }
    });
  }

  return selectedAssetIds;
}

function resolveAssetIdsForContracts(processResult: PlaceableApiProcessResult): string[] {
  if (isVfxProcessResult(processResult)) {
    return resolveVfxAssetIdsForContracts(processResult);
  }

  const renderPackageAssetIds = resolveRenderPackageAssetIds(processResult);
  if (renderPackageAssetIds.length > 0) {
    return renderPackageAssetIds;
  }

  const selectedAssetIds: string[] = [];
  const selectedAssetIdSet = new Set<string>();
  const manifestAssets = processResult.placeable.assetManifest.assets;

  CONTRACT_ROLE_PRIORITY.forEach((role) => {
    manifestAssets.forEach((asset) => {
      const normalizedAssetId = normalizeAssetId(asset.assetId);
      if (
        normalizedAssetId.length === 0 ||
        asset.role !== role ||
        selectedAssetIdSet.has(normalizedAssetId)
      ) {
        return;
      }
      selectedAssetIdSet.add(normalizedAssetId);
      selectedAssetIds.push(normalizedAssetId);
    });
  });

  return selectedAssetIds;
}

function buildManifestRoleByAssetId(
  processResult: PlaceableApiProcessResult
): Map<string, PlaceableApiAssetRole> {
  return new Map(
    processResult.placeable.assetManifest.assets.map((asset) => [
      normalizeAssetId(asset.assetId),
      asset.role
    ])
  );
}

function buildManifestIndexByAssetId(processResult: PlaceableApiProcessResult): Map<string, number> {
  const indexByAssetId = new Map<string, number>();
  processResult.placeable.assetManifest.assets.forEach((asset, index) => {
    const normalizedAssetId = normalizeAssetId(asset.assetId);
    if (normalizedAssetId.length === 0 || indexByAssetId.has(normalizedAssetId)) {
      return;
    }
    indexByAssetId.set(normalizedAssetId, index);
  });
  return indexByAssetId;
}

function roleRank(role: PlaceableApiAssetRole | undefined): number {
  const rank = CONTRACT_ROLE_PRIORITY.indexOf(role ?? "unknown");
  return rank >= 0 ? rank : CONTRACT_ROLE_PRIORITY.length;
}

function normalizeContractsResult(
  processResult: PlaceableApiProcessResult,
  assetContracts: PlaceableApiAssetContractsResult
): PlaceableApiAssetContractsResult {
  const roleByAssetId = buildManifestRoleByAssetId(processResult);
  const indexByAssetId = buildManifestIndexByAssetId(processResult);
  const contractByAssetId = new Map<string, PlaceableApiAssetDeliveryContract>();

  assetContracts.assets.forEach((asset) => {
    const normalizedAssetId = normalizeAssetId(asset.assetId);
    if (normalizedAssetId.length === 0) {
      return;
    }
    const current = contractByAssetId.get(normalizedAssetId);
    if (!current) {
      contractByAssetId.set(normalizedAssetId, {
        ...asset,
        assetId: normalizedAssetId
      });
      return;
    }
    const currentScore = Number(hasUsableDeliveryUrl(current));
    const nextScore = Number(hasUsableDeliveryUrl(asset));
    if (nextScore > currentScore) {
      contractByAssetId.set(normalizedAssetId, {
        ...asset,
        assetId: normalizedAssetId
      });
    }
  });

  const normalizedAssets = Array.from(contractByAssetId.values()).sort((left, right) => {
    const leftAssetId = normalizeAssetId(left.assetId);
    const rightAssetId = normalizeAssetId(right.assetId);
    const rankDiff =
      roleRank(roleByAssetId.get(leftAssetId)) - roleRank(roleByAssetId.get(rightAssetId));
    if (rankDiff !== 0) {
      return rankDiff;
    }
    const leftManifestIndex = indexByAssetId.get(leftAssetId) ?? Number.MAX_SAFE_INTEGER;
    const rightManifestIndex = indexByAssetId.get(rightAssetId) ?? Number.MAX_SAFE_INTEGER;
    if (leftManifestIndex !== rightManifestIndex) {
      return leftManifestIndex - rightManifestIndex;
    }
    return leftAssetId.localeCompare(rightAssetId);
  });

  return {
    cacheKey: assetContracts.cacheKey || processResult.cacheKey,
    moduleHash: assetContracts.moduleHash,
    assets: normalizedAssets
  };
}

function mergeContractsResults(
  processResult: PlaceableApiProcessResult,
  baseContracts: PlaceableApiAssetContractsResult,
  extraContracts: PlaceableApiAssetContractsResult
): PlaceableApiAssetContractsResult {
  const mergedCacheKey = baseContracts.cacheKey || extraContracts.cacheKey || processResult.cacheKey;
  const mergedModuleHash = baseContracts.moduleHash ?? extraContracts.moduleHash;
  const mergedAssets = [...baseContracts.assets, ...extraContracts.assets];

  return normalizeContractsResult(processResult, {
    cacheKey: mergedCacheKey,
    moduleHash: mergedModuleHash,
    assets: mergedAssets
  });
}

function resolveMissingCriticalAssetIds(
  processResult: PlaceableApiProcessResult,
  assetContracts: PlaceableApiAssetContractsResult
): string[] {
  const roleByAssetId = buildManifestRoleByAssetId(processResult);
  const availableContractsByAssetId = new Map(
    assetContracts.assets.map((asset) => [normalizeAssetId(asset.assetId), asset])
  );

  return resolveAssetIdsForContracts(processResult).filter((assetId) => {
    const role = roleByAssetId.get(assetId);
    if (!role || !CRITICAL_ASSET_ROLES.has(role)) {
      return false;
    }
    const contract = availableContractsByAssetId.get(assetId);
    if (!contract) {
      return true;
    }
    return !hasUsableDeliveryUrl(contract);
  });
}

export interface PlaceableViewportRenderPayload {
  templateId: string;
  cacheKey: string;
  cacheHit: boolean;
  storedAt: string;
  hits: number;
  placeable: PlaceableApiProcessResult["placeable"];
  renderPackage?: PlaceableApiProcessResult["placeable"]["renderPackage"];
  assetContracts: PlaceableApiAssetContractsResult;
}

export interface FetchPlaceableViewportRenderPayloadOptions {
  preferBackendViewportBatch?: boolean;
  allowPartialProcessBatchResults?: boolean;
  assetContractBatchTimeoutMs?: number;
  assetContractSingleTimeoutMs?: number;
  backendViewportBatchTimeoutMs?: number;
  processBatchTimeoutMs?: number;
  resolveProcessPreviewOnly?: boolean;
  processSingleTimeoutMs?: number;
  onCacheMissRecovery?: (event: {
    staleCacheKey: string;
    lookup: PlaceableApiProcessPayload;
  }) => void;
  onProcessPayload?: (
    payload: PlaceableViewportRenderPayload,
    context?: FetchPlaceableViewportRenderPayloadContext
  ) => void;
}

export interface FetchPlaceableViewportRenderPayloadContext {
  key?: string;
  lookup: PlaceableApiProcessPayload;
}

export interface FetchPlaceableViewportRenderPayloadBatchEntry {
  key: string;
  lookup: PlaceableApiProcessPayload;
}

export interface FetchPlaceableViewportRenderPayloadBatchResult {
  key: string;
  payload: PlaceableViewportRenderPayload;
}

interface FetchPlaceableViewportRenderPayloadProcessBatchResult {
  entry: FetchPlaceableViewportRenderPayloadBatchEntry;
  processResult: PlaceableApiProcessResult;
}

type SettledMapResult<TResult> =
  | { status: "fulfilled"; value: TResult }
  | { status: "rejected"; reason: unknown };

class PlaceableViewportRenderPayloadTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlaceableViewportRenderPayloadTimeoutError";
  }
}

function withOptionalAbortableTimeout<T>(
  requestFactory: (signal?: AbortSignal) => Promise<T>,
  timeoutMs: number | undefined,
  label: string
): Promise<T> {
  if (!Number.isFinite(timeoutMs) || (timeoutMs ?? 0) <= 0) {
    return requestFactory();
  }

  return new Promise<T>((resolve, reject) => {
    const abortController = new AbortController();
    const resolvedTimeoutMs = Math.max(1, Math.floor(timeoutMs ?? 0));
    const timeoutError = new PlaceableViewportRenderPayloadTimeoutError(
      `${label} timed out after ${resolvedTimeoutMs}ms`
    );
    let settled = false;
    const timeoutId = setTimeout(() => {
      if (settled) {
        return;
      }
      settled = true;
      abortController.abort();
      reject(timeoutError);
    }, resolvedTimeoutMs);

    requestFactory(abortController.signal).then(
      (value) => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timeoutId);
        resolve(value);
      },
      (reason) => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timeoutId);
        reject(abortController.signal.aborted ? timeoutError : reason);
      }
    );
  });
}

function toPlaceableRequestOptions(signal?: AbortSignal) {
  return signal ? { signal } : undefined;
}

function processPlaceableWithOptionalSignal(
  placeableApiPort: PlaceableApiPort,
  accessToken: string,
  payload: PlaceableApiProcessPayload,
  signal?: AbortSignal
) {
  const requestOptions = toPlaceableRequestOptions(signal);
  return requestOptions
    ? placeableApiPort.processPlaceable(accessToken, payload, requestOptions)
    : placeableApiPort.processPlaceable(accessToken, payload);
}

function processPlaceablesWithOptionalSignal(
  placeableApiPort: PlaceableApiPort,
  accessToken: string,
  payloads: PlaceableApiProcessPayload[],
  signal?: AbortSignal
) {
  const requestOptions = toPlaceableRequestOptions(signal);
  return requestOptions
    ? placeableApiPort.processPlaceables?.(accessToken, payloads, requestOptions)
    : placeableApiPort.processPlaceables?.(accessToken, payloads);
}

function getPlaceableViewportRenderPayloadBatchWithOptionalSignal(
  placeableApiPort: PlaceableApiPort,
  accessToken: string,
  payloads: PlaceableApiProcessPayload[],
  signal?: AbortSignal
) {
  const requestOptions = toPlaceableRequestOptions(signal);
  return requestOptions
    ? placeableApiPort.getPlaceableViewportRenderPayloadBatch?.(
        accessToken,
        payloads,
        requestOptions
      )
    : placeableApiPort.getPlaceableViewportRenderPayloadBatch?.(accessToken, payloads);
}

function getPlaceableAssetContractsWithOptionalSignal(
  placeableApiPort: PlaceableApiPort,
  accessToken: string,
  cacheKey: string,
  assetIds: string[] | undefined,
  signal?: AbortSignal
) {
  const requestOptions = toPlaceableRequestOptions(signal);
  return requestOptions
    ? placeableApiPort.getPlaceableAssetContracts(
        accessToken,
        cacheKey,
        assetIds,
        requestOptions
      )
    : placeableApiPort.getPlaceableAssetContracts(accessToken, cacheKey, assetIds);
}

function getPlaceableAssetContractsBatchWithOptionalSignal(
  placeableApiPort: PlaceableApiPort,
  accessToken: string,
  items: PlaceableApiAssetContractsBatchRequestItem[],
  signal?: AbortSignal
) {
  const requestOptions = toPlaceableRequestOptions(signal);
  return requestOptions
    ? placeableApiPort.getPlaceableAssetContractsBatch?.(accessToken, items, requestOptions)
    : placeableApiPort.getPlaceableAssetContractsBatch?.(accessToken, items);
}

async function mapWithConcurrency<TItem, TResult>(
  items: TItem[],
  concurrency: number,
  mapper: (item: TItem) => Promise<TResult>
): Promise<TResult[]> {
  const results = new Array<TResult>(items.length);
  let cursor = 0;
  const workerCount = Math.max(1, Math.min(concurrency, items.length));
  const runWorker = async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      const item = items[index];
      if (item === undefined) {
        continue;
      }
      results[index] = await mapper(item);
    }
  };

  await Promise.all(Array.from({ length: workerCount }, () => runWorker()));
  return results;
}

async function mapSettledWithConcurrency<TItem, TResult>(
  items: TItem[],
  concurrency: number,
  mapper: (item: TItem) => Promise<TResult>
): Promise<Array<SettledMapResult<TResult>>> {
  const results = new Array<SettledMapResult<TResult>>(items.length);
  let cursor = 0;
  const workerCount = Math.max(1, Math.min(concurrency, items.length));
  const runWorker = async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      const item = items[index];
      if (item === undefined) {
        continue;
      }
      try {
        results[index] = {
          status: "fulfilled",
          value: await mapper(item)
        };
      } catch (reason) {
        results[index] = {
          status: "rejected",
          reason
        };
      }
    }
  };

  await Promise.all(Array.from({ length: workerCount }, () => runWorker()));
  return results;
}

export function buildPlaceableViewportRenderPayload(
  processResult: PlaceableApiProcessResult,
  assetContracts: PlaceableApiAssetContractsResult
): PlaceableViewportRenderPayload {
  return {
    templateId: processResult.placeable.templateId,
    cacheKey: processResult.cacheKey,
    cacheHit: processResult.cacheHit,
    storedAt: processResult.storedAt,
    hits: processResult.hits,
    placeable: processResult.placeable,
    renderPackage: processResult.placeable.renderPackage,
    assetContracts
  };
}

export function buildPlaceableViewportProcessPreviewPayload(
  processResult: PlaceableApiProcessResult
): PlaceableViewportRenderPayload {
  return buildPlaceableViewportRenderPayload(
    processResult,
    normalizeContractsResult(processResult, {
      cacheKey: processResult.cacheKey,
      assets: []
    })
  );
}

function publishProcessResultPreviewPayload(
  processResult: PlaceableApiProcessResult,
  options: FetchPlaceableViewportRenderPayloadOptions,
  context?: FetchPlaceableViewportRenderPayloadContext
): void {
  options.onProcessPayload?.(buildPlaceableViewportProcessPreviewPayload(processResult), context);
}

function publishProcessBatchPreviewPayloads(
  results: FetchPlaceableViewportRenderPayloadProcessBatchResult[],
  options: FetchPlaceableViewportRenderPayloadOptions
): void {
  results.forEach(({ entry, processResult }) => {
    publishProcessResultPreviewPayload(processResult, options, {
      key: entry.key,
      lookup: entry.lookup
    });
  });
}

async function resolveViewportRenderPayloadFromProcessResult(
  placeableApiPort: PlaceableApiPort,
  accessToken: string,
  processResult: PlaceableApiProcessResult,
  options: FetchPlaceableViewportRenderPayloadOptions = {},
  context?: FetchPlaceableViewportRenderPayloadContext
): Promise<PlaceableViewportRenderPayload> {
  publishProcessResultPreviewPayload(processResult, options, context);
  const preferredAssetIds = resolveAssetIdsForContracts(processResult);
  let assetContracts =
    isVfxProcessResult(processResult) && preferredAssetIds.length === 0
      ? normalizeContractsResult(processResult, {
          cacheKey: processResult.cacheKey,
          assets: []
        })
      : normalizeContractsResult(
          processResult,
          await withOptionalAbortableTimeout(
            (signal) =>
              getPlaceableAssetContractsWithOptionalSignal(
                placeableApiPort,
                accessToken,
                processResult.cacheKey,
                preferredAssetIds.length > 0 ? preferredAssetIds : undefined,
                signal
              ),
            options.assetContractSingleTimeoutMs,
            `Placeable asset contracts ${processResult.cacheKey}`
          )
        );

  const missingCriticalAssetIds = resolveMissingCriticalAssetIds(processResult, assetContracts);
  if (missingCriticalAssetIds.length > 0) {
    const retryContracts = await withOptionalAbortableTimeout(
      (signal) =>
        getPlaceableAssetContractsWithOptionalSignal(
          placeableApiPort,
          accessToken,
          processResult.cacheKey,
          missingCriticalAssetIds,
          signal
        ),
      options.assetContractSingleTimeoutMs,
      `Placeable asset contracts retry ${processResult.cacheKey}`
    );
    assetContracts = mergeContractsResults(
      processResult,
      assetContracts,
      normalizeContractsResult(processResult, retryContracts)
    );
  }

  return buildPlaceableViewportRenderPayload(processResult, assetContracts);
}

async function resolveViewportRenderPayloadsFromProcessResultsBatch(
  placeableApiPort: PlaceableApiPort,
  accessToken: string,
  processResults: PlaceableApiProcessResult[],
  options: FetchPlaceableViewportRenderPayloadOptions = {},
  contexts: Array<FetchPlaceableViewportRenderPayloadContext | undefined> = []
): Promise<PlaceableViewportRenderPayload[]> {
  if (!placeableApiPort.getPlaceableAssetContractsBatch) {
    return Promise.all(
      processResults.map((processResult, index) =>
        resolveViewportRenderPayloadFromProcessResult(
          placeableApiPort,
          accessToken,
          processResult,
          options,
          contexts[index]
        )
      )
    );
  }

  processResults.forEach((processResult, index) => {
    options.onProcessPayload?.(
      buildPlaceableViewportRenderPayload(
        processResult,
        normalizeContractsResult(processResult, {
          cacheKey: processResult.cacheKey,
          assets: []
        })
      ),
      contexts[index]
    );
  });

  const processResultByCacheKey = new Map(
    processResults.map((processResult) => [processResult.cacheKey, processResult])
  );
  const contractsByCacheKey = new Map<string, PlaceableApiAssetContractsResult>();
  const initialContractRequests: PlaceableApiAssetContractsBatchRequestItem[] = [];

  processResults.forEach((processResult) => {
    const preferredAssetIds = resolveAssetIdsForContracts(processResult);
    if (isVfxProcessResult(processResult) && preferredAssetIds.length === 0) {
      contractsByCacheKey.set(
        processResult.cacheKey,
        normalizeContractsResult(processResult, {
          cacheKey: processResult.cacheKey,
          assets: []
        })
      );
      return;
    }
    initialContractRequests.push({
      cacheKey: processResult.cacheKey,
      ...(preferredAssetIds.length > 0 ? { assetIds: preferredAssetIds } : {})
    });
  });

  if (initialContractRequests.length > 0) {
    const batchContracts = await fetchPlaceableAssetContractsBatchWithSingleRecovery(
      placeableApiPort,
      accessToken,
      initialContractRequests,
      processResultByCacheKey,
      options
    );
    batchContracts.forEach((contracts) => {
      const processResult = processResultByCacheKey.get(contracts.cacheKey);
      if (!processResult) {
        return;
      }
      contractsByCacheKey.set(
        contracts.cacheKey,
        normalizeContractsResult(processResult, contracts)
      );
    });
  }

  const retryRequests: PlaceableApiAssetContractsBatchRequestItem[] = [];
  processResults.forEach((processResult) => {
    const assetContracts =
      contractsByCacheKey.get(processResult.cacheKey) ??
      normalizeContractsResult(processResult, {
        cacheKey: processResult.cacheKey,
        assets: []
      });
    const missingCriticalAssetIds = resolveMissingCriticalAssetIds(
      processResult,
      assetContracts
    );
    if (missingCriticalAssetIds.length > 0) {
      retryRequests.push({
        cacheKey: processResult.cacheKey,
        assetIds: missingCriticalAssetIds
      });
    }
  });

  if (retryRequests.length > 0) {
    const retryContracts = await fetchPlaceableAssetContractsBatchWithSingleRecovery(
      placeableApiPort,
      accessToken,
      retryRequests,
      processResultByCacheKey,
      options
    );
    retryContracts.forEach((contracts) => {
      const processResult = processResultByCacheKey.get(contracts.cacheKey);
      if (!processResult) {
        return;
      }
      const currentContracts =
        contractsByCacheKey.get(contracts.cacheKey) ??
        normalizeContractsResult(processResult, {
          cacheKey: processResult.cacheKey,
          assets: []
        });
      contractsByCacheKey.set(
        contracts.cacheKey,
        mergeContractsResults(
          processResult,
          currentContracts,
          normalizeContractsResult(processResult, contracts)
        )
      );
    });
  }

  return processResults.map((processResult) =>
    buildPlaceableViewportRenderPayload(
      processResult,
      contractsByCacheKey.get(processResult.cacheKey) ??
        normalizeContractsResult(processResult, {
          cacheKey: processResult.cacheKey,
          assets: []
        })
    )
  );
}

async function fetchPlaceableAssetContractsBatchWithSingleRecovery(
  placeableApiPort: PlaceableApiPort,
  accessToken: string,
  items: PlaceableApiAssetContractsBatchRequestItem[],
  processResultByCacheKey: Map<string, PlaceableApiProcessResult>,
  options: FetchPlaceableViewportRenderPayloadOptions = {}
): Promise<PlaceableApiAssetContractsResult[]> {
  if (items.length === 0 || !placeableApiPort.getPlaceableAssetContractsBatch) {
    return [];
  }
  try {
    const batchContracts = await withOptionalAbortableTimeout(
      (signal) =>
        getPlaceableAssetContractsBatchWithOptionalSignal(
          placeableApiPort,
          accessToken,
          items,
          signal
        ) ??
        Promise.resolve({ items: [] }),
      options.assetContractBatchTimeoutMs,
      `Placeable asset contracts batch (${items.length} items)`
    );
    return batchContracts.items;
  } catch {
    const recoveredContracts = await mapWithConcurrency(
      items,
      PLACEABLE_ASSET_CONTRACT_SINGLE_RECOVERY_CONCURRENCY,
      async (item) => {
        const processResult = processResultByCacheKey.get(item.cacheKey);
        if (!processResult) {
          return null;
        }
        try {
          return await withOptionalAbortableTimeout(
            (signal) =>
              getPlaceableAssetContractsWithOptionalSignal(
                placeableApiPort,
                accessToken,
                item.cacheKey,
                item.assetIds,
                signal
              ),
            options.assetContractSingleTimeoutMs,
            `Placeable asset contracts recovery ${item.cacheKey}`
          );
        } catch {
          return normalizeContractsResult(processResult, {
            cacheKey: processResult.cacheKey,
            assets: []
          });
        }
      }
    );
    return recoveredContracts.filter(
      (contracts): contracts is PlaceableApiAssetContractsResult => Boolean(contracts)
    );
  }
}

async function fetchPlaceableViewportRenderPayloadProcessBatchWithRecovery(
  placeableApiPort: PlaceableApiPort,
  accessToken: string,
  entries: FetchPlaceableViewportRenderPayloadBatchEntry[],
  options: FetchPlaceableViewportRenderPayloadOptions = {}
): Promise<FetchPlaceableViewportRenderPayloadProcessBatchResult[]> {
  if (entries.length === 0) {
    return [];
  }

  if (!placeableApiPort.processPlaceables) {
    return mapWithConcurrency(entries, entries.length, async (entry) => {
      const processResult = await withOptionalAbortableTimeout(
        (signal) =>
          processPlaceableWithOptionalSignal(
            placeableApiPort,
            accessToken,
            {
              ...entry.lookup,
              includeBenchmarkMetadata: false
            },
            signal
          ),
        options.processSingleTimeoutMs,
        `Placeable process request ${entry.key}`
      );
      publishProcessResultPreviewPayload(processResult, options, {
        key: entry.key,
        lookup: entry.lookup
      });
      return {
        entry,
        processResult
      };
    });
  }

  try {
    const processResults = await withOptionalAbortableTimeout(
      (signal) =>
        processPlaceablesWithOptionalSignal(
          placeableApiPort,
          accessToken,
          entries.map((entry) => ({
            ...entry.lookup,
            includeBenchmarkMetadata: false
          })),
          signal
        ) ?? Promise.resolve({ items: [] }),
      options.processBatchTimeoutMs,
      `Placeable process batch (${entries.length} items)`
    );
    const results = entries.map((entry, index) => {
      const processResult = processResults.items[index];
      if (!processResult) {
        throw new Error(`Missing process result for placeable batch entry ${entry.key}`);
      }
      return { entry, processResult };
    });
    publishProcessBatchPreviewPayloads(results, options);
    return results;
  } catch (error) {
    if (entries.length <= PLACEABLE_VIEWPORT_RENDER_PAYLOAD_BATCH_SPLIT_THRESHOLD) {
      const settledResults = await mapSettledWithConcurrency(
        entries,
        PLACEABLE_VIEWPORT_RENDER_PAYLOAD_SINGLE_RECOVERY_CONCURRENCY,
        async (entry) => {
          const processResult = await withOptionalAbortableTimeout(
            (signal) =>
              processPlaceableWithOptionalSignal(
                placeableApiPort,
                accessToken,
                {
                  ...entry.lookup,
                  includeBenchmarkMetadata: false
                },
                signal
              ),
            options.processSingleTimeoutMs,
            `Placeable process request ${entry.key}`
          );
          publishProcessResultPreviewPayload(processResult, options, {
            key: entry.key,
            lookup: entry.lookup
          });
          return {
            entry,
            processResult
          };
        }
      );
      const recoveredResults = settledResults.flatMap((result) =>
        result.status === "fulfilled" ? [result.value] : []
      );
      if (options.allowPartialProcessBatchResults || recoveredResults.length > 0) {
        return recoveredResults;
      }
      throw settledResults.find((result) => result.status === "rejected")?.reason ?? error;
    }

    const midpoint = Math.ceil(entries.length / 2);
    const recoveredHalves = await Promise.allSettled([
      fetchPlaceableViewportRenderPayloadProcessBatchWithRecovery(
        placeableApiPort,
        accessToken,
        entries.slice(0, midpoint),
        options
      ),
      fetchPlaceableViewportRenderPayloadProcessBatchWithRecovery(
        placeableApiPort,
        accessToken,
        entries.slice(midpoint),
        options
      )
    ]);
    const recoveredResults = recoveredHalves.flatMap((result) =>
      result.status === "fulfilled" ? result.value : []
    );
    if (options.allowPartialProcessBatchResults || recoveredResults.length > 0) {
      return recoveredResults;
    }
    throw recoveredHalves.find((result) => result.status === "rejected")?.reason ?? error;
  }
}

export async function fetchPlaceableViewportRenderPayload(
  placeableApiPort: PlaceableApiPort,
  accessToken: string,
  lookup: string | PlaceableApiProcessPayload,
  options: FetchPlaceableViewportRenderPayloadOptions = {}
): Promise<PlaceableViewportRenderPayload> {
  const processPayload = typeof lookup === "string" ? { templateId: lookup } : lookup;
  const processOnce = () =>
    withOptionalAbortableTimeout(
      (signal) =>
        processPlaceableWithOptionalSignal(
          placeableApiPort,
          accessToken,
          {
            ...processPayload,
            includeBenchmarkMetadata: false
          },
          signal
        ),
      options.processSingleTimeoutMs,
      `Placeable process request ${processPayload.templateId ?? processPayload.resref ?? "lookup"}`
    );
  const resolveOnce = (processResult: PlaceableApiProcessResult) =>
    resolveViewportRenderPayloadFromProcessResult(
      placeableApiPort,
      accessToken,
      processResult,
      options,
      { lookup: processPayload }
    );
  const processResult = await processOnce();
  try {
    return await resolveOnce(processResult);
  } catch (error) {
    if (!isPlaceableCacheNotFoundError(error)) {
      throw error;
    }
    options.onCacheMissRecovery?.({
      staleCacheKey: processResult.cacheKey,
      lookup: processPayload
    });
    return resolveOnce(await processOnce());
  }
}

export async function fetchPlaceableViewportRenderPayloadBatch(
  placeableApiPort: PlaceableApiPort,
  accessToken: string,
  entries: FetchPlaceableViewportRenderPayloadBatchEntry[],
  options: FetchPlaceableViewportRenderPayloadOptions = {}
): Promise<FetchPlaceableViewportRenderPayloadBatchResult[]> {
  if (entries.length === 0) {
    return [];
  }

  if (
    options.preferBackendViewportBatch !== false &&
    placeableApiPort.getPlaceableViewportRenderPayloadBatch
  ) {
    try {
      const requestPayloads = entries.map((entry) => ({
        ...entry.lookup,
        includeBenchmarkMetadata: false
      }));
      const renderPayloadBatch = await withOptionalAbortableTimeout(
        (signal) =>
          getPlaceableViewportRenderPayloadBatchWithOptionalSignal(
            placeableApiPort,
            accessToken,
            requestPayloads,
            signal
          ) ?? Promise.resolve({ items: [] }),
        options.backendViewportBatchTimeoutMs ?? options.processBatchTimeoutMs,
        `Placeable viewport render payload batch (${entries.length} items)`
      );
      if (renderPayloadBatch.items.length !== entries.length) {
        throw new Error(
          `Placeable viewport render payload batch returned ${renderPayloadBatch.items.length}/${entries.length} items`
        );
      }
      const hydratedPayloads = await hydrateDeferredViewportVfxPayloads(
        placeableApiPort,
        accessToken,
        renderPayloadBatch.items
      );
      return hydratedPayloads.map((payload, index) => {
        const entry = entries[index];
        options.onProcessPayload?.(
          payload,
          entry
            ? {
                key: entry.key,
                lookup: entry.lookup
              }
            : undefined
        );
        return {
          key: entry?.key ?? payload.cacheKey,
          payload
        };
      });
    } catch {
      // Fall through to process-batch split/single recovery; large Areas should not
      // leave every unresolved object as a placeholder just because the fast path failed.
    }
  }

  if (!placeableApiPort.processPlaceables) {
    return Promise.all(
      entries.map(async (entry) => ({
        key: entry.key,
        payload: await fetchPlaceableViewportRenderPayload(
          placeableApiPort,
          accessToken,
          entry.lookup,
          options
        )
      }))
    );
  }

  const processBatchResults = await fetchPlaceableViewportRenderPayloadProcessBatchWithRecovery(
    placeableApiPort,
    accessToken,
    entries,
    options
  );

  if (options.resolveProcessPreviewOnly) {
    return processBatchResults.map((result) => ({
      key: result.entry.key,
      payload: buildPlaceableViewportProcessPreviewPayload(result.processResult)
    }));
  }

  const payloads = await resolveViewportRenderPayloadsFromProcessResultsBatch(
    placeableApiPort,
    accessToken,
    processBatchResults.map((result) => result.processResult),
    options,
    processBatchResults.map((result) => ({
      key: result.entry.key,
      lookup: result.entry.lookup
    }))
  );

  return payloads.map((payload, index) => ({
    key: processBatchResults[index]?.entry.key ?? payload.cacheKey,
    payload
  }));
}
