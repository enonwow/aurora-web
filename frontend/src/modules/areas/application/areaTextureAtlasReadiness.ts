import type {
  AreaApiProcessResult,
  AreaApiTextureDeliveryContract,
  AreaApiTextureDeliveryMode
} from "../contracts";
import type { AreaApiPort } from "../ports/areaApiPort";

export type AreaTextureAtlasReadinessStage = "process" | "texture-contract";

export interface AreaTextureAtlasReadinessReady {
  status: "ready";
  areaId: string;
  areaName: string;
  previewImageUrl: string;
  cache: AreaApiProcessResult["cache"];
  processedAt: string;
  detailTextureAtlas: AreaApiProcessResult["area"]["textureAtlas"];
  contractCacheKey: string;
  deliveryMode: AreaApiTextureDeliveryMode;
  textureAtlas: AreaApiTextureDeliveryContract;
}

export interface AreaTextureAtlasReadinessBlocked {
  status: "blocked";
  areaId: string;
  stage: AreaTextureAtlasReadinessStage;
  deliveryMode: AreaApiTextureDeliveryMode;
  cache?: AreaApiProcessResult["cache"];
  processedAt?: string;
  code: string | null;
  message: string;
  httpStatus?: number;
  directDeliveryUnavailable: boolean;
  failureClassification?: "infrastructure_runtime_health";
  infrastructureRuntimeHealth?: true;
}

export type AreaTextureAtlasReadiness =
  | AreaTextureAtlasReadinessReady
  | AreaTextureAtlasReadinessBlocked;

export interface ResolveAreaTextureAtlasReadinessOptions {
  bypassCache?: boolean;
  deliveryMode?: AreaApiTextureDeliveryMode;
}

export async function resolveAreaTextureAtlasReadiness(
  apiPort: AreaApiPort,
  accessToken: string,
  areaId: string,
  options: ResolveAreaTextureAtlasReadinessOptions = {}
): Promise<AreaTextureAtlasReadiness> {
  const deliveryMode = options.deliveryMode ?? "proxy";
  let processed: AreaApiProcessResult;

  try {
    processed = await apiPort.processArea(accessToken, areaId, {
      bypassCache: options.bypassCache
    });
  } catch (error) {
    return toBlockedReadiness(areaId, "process", deliveryMode, error);
  }

  try {
    const contract = await apiPort.getAreaTextureAtlasContracts(
      accessToken,
      processed.cache.key,
      deliveryMode
    );

    return {
      status: "ready",
      areaId: processed.area.areaId,
      areaName: processed.area.name,
      previewImageUrl: processed.area.previewImageUrl,
      cache: processed.cache,
      processedAt: processed.area.processedAt,
      detailTextureAtlas: processed.area.textureAtlas,
      contractCacheKey: contract.cacheKey,
      deliveryMode: contract.textureAtlas.mode,
      textureAtlas: contract.textureAtlas
    };
  } catch (error) {
    return toBlockedReadiness(areaId, "texture-contract", deliveryMode, error, processed);
  }
}

function toBlockedReadiness(
  areaId: string,
  stage: AreaTextureAtlasReadinessStage,
  deliveryMode: AreaApiTextureDeliveryMode,
  error: unknown,
  processed?: AreaApiProcessResult
): AreaTextureAtlasReadinessBlocked {
  const code = getStringField(error, "code");
  const blocked: AreaTextureAtlasReadinessBlocked = {
    status: "blocked",
    areaId,
    stage,
    deliveryMode,
    code,
    message: error instanceof Error ? error.message : "Area texture atlas readiness failed.",
    httpStatus: getNumberField(error, "status"),
    directDeliveryUnavailable: code === "AREA_DIRECT_DELIVERY_UNAVAILABLE"
  };

  if (processed) {
    blocked.cache = processed.cache;
    blocked.processedAt = processed.area.processedAt;
  }

  if (isBackendRuntimeUnavailableError(error)) {
    blocked.failureClassification = "infrastructure_runtime_health";
    blocked.infrastructureRuntimeHealth = true;
  }

  return blocked;
}

function getStringField(value: unknown, field: string): string | null {
  if (typeof value !== "object" || value === null || !(field in value)) {
    return null;
  }
  const candidate = (value as Record<string, unknown>)[field];
  return typeof candidate === "string" ? candidate : null;
}

function getNumberField(value: unknown, field: string): number | undefined {
  if (typeof value !== "object" || value === null || !(field in value)) {
    return undefined;
  }
  const candidate = (value as Record<string, unknown>)[field];
  return typeof candidate === "number" ? candidate : undefined;
}

function isBackendRuntimeUnavailableError(error: unknown): boolean {
  if (!(error instanceof TypeError)) {
    return false;
  }
  const message = error.message.toLowerCase();
  return (
    message.includes("failed to fetch") ||
    message.includes("network") ||
    message.includes("load failed")
  );
}
