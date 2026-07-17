import type {
  CreatureApiProcessPayload,
  CreatureApiProcessResult
} from "../contracts";
import type { CreatureApiPort } from "../ports/creatureApiPort";

export interface CreatureViewportRenderPayload {
  templateId: string;
  cacheKey: string;
  cacheHit: boolean;
  storedAt: string;
  hits: number;
  creature: CreatureApiProcessResult["creature"];
  renderPackage?: CreatureApiProcessResult["creature"]["creatureRenderPackage"];
}

export interface FetchCreatureViewportRenderPayloadOptions {
  bypassCache?: boolean;
  onProcessPayload?: (
    payload: CreatureViewportRenderPayload,
    context: FetchCreatureViewportRenderPayloadContext
  ) => void;
}

export interface FetchCreatureViewportRenderPayloadContext {
  lookup: CreatureApiProcessPayload;
}

function buildCreatureViewportRenderPayload(
  processResult: CreatureApiProcessResult
): CreatureViewportRenderPayload {
  return {
    templateId: processResult.creature.templateId,
    cacheKey: processResult.cache.key,
    cacheHit: processResult.cache.hit,
    storedAt: processResult.cache.storedAt,
    hits: processResult.cache.hits,
    creature: processResult.creature,
    renderPackage: processResult.creature.creatureRenderPackage
  };
}

function normalizeLookup(lookup: string | CreatureApiProcessPayload): CreatureApiProcessPayload {
  if (typeof lookup === "string") {
    return { templateId: lookup };
  }
  return lookup;
}

export async function fetchCreatureViewportRenderPayload(
  creatureApiPort: CreatureApiPort,
  accessToken: string,
  lookup: string | CreatureApiProcessPayload,
  options: FetchCreatureViewportRenderPayloadOptions = {}
): Promise<CreatureViewportRenderPayload> {
  const processPayload = normalizeLookup(lookup);
  const processResult = await creatureApiPort.processCreature(accessToken, {
    ...processPayload,
    ...(options.bypassCache !== undefined ? { bypassCache: options.bypassCache } : {}),
    includeBenchmarkMetadata: false
  });
  const payload = buildCreatureViewportRenderPayload(processResult);
  options.onProcessPayload?.(payload, { lookup: processPayload });
  return payload;
}
