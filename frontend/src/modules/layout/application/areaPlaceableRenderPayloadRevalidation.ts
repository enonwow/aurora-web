export interface AreaPlaceableAssetCacheMiss {
  readonly cacheKey: string;
  readonly assetKind: "model" | "texture";
}

export interface AreaPlaceableRenderPayloadRevalidationLookup {
  cacheKey: string;
  indexKeys: readonly string[];
}

export interface AreaPlaceableRenderPayloadRevalidationResult<TPayload, TPending> {
  payloadCache: Map<string, TPayload>;
  pendingPayloads: Map<string, TPending>;
  publishedPayloads: Record<string, TPayload>;
  invalidatedLookupKeys: readonly string[];
  didEvictPublishedPayload: boolean;
}

export interface AreaPlaceableRenderPayloadCacheMissEvictionResult<TPayload, TPending>
  extends AreaPlaceableRenderPayloadRevalidationResult<TPayload, TPending> {
  validatedGenerationByLookup: Map<string, number>;
  evictedAliases: readonly string[];
}

export const buildAreaPlaceableRenderPayloadQueueSignature = (
  sceneId: string,
  validationGeneration: number,
  lookupCacheKeys: readonly string[]
): string =>
  [sceneId, validationGeneration, lookupCacheKeys.join("\u001f")].join("\u001e");

export const isAreaPlaceableRenderPayloadValidated = (
  validatedGenerationByLookup: ReadonlyMap<string, number>,
  lookupCacheKey: string,
  validationGeneration: number
): boolean =>
  validatedGenerationByLookup.get(lookupCacheKey) === validationGeneration;

export const evictUnvalidatedAreaPlaceableRenderPayloads = <TPayload, TPending>(input: {
  lookups: readonly AreaPlaceableRenderPayloadRevalidationLookup[];
  objectIdsByLookupCacheKey: ReadonlyMap<string, readonly string[]>;
  validatedGenerationByLookup: ReadonlyMap<string, number>;
  validationGeneration: number;
  payloadCache: ReadonlyMap<string, TPayload>;
  pendingPayloads: ReadonlyMap<string, TPending>;
  publishedPayloads: Readonly<Record<string, TPayload>>;
}): AreaPlaceableRenderPayloadRevalidationResult<TPayload, TPending> => {
  const invalidatedLookupKeys: string[] = [];
  const aliasesToEvict = new Set<string>();

  input.lookups.forEach((lookup) => {
    if (
      isAreaPlaceableRenderPayloadValidated(
        input.validatedGenerationByLookup,
        lookup.cacheKey,
        input.validationGeneration
      )
    ) {
      return;
    }
    invalidatedLookupKeys.push(lookup.cacheKey);
    lookup.indexKeys.forEach((key) => aliasesToEvict.add(key));
    input.objectIdsByLookupCacheKey.get(lookup.cacheKey)?.forEach((key) =>
      aliasesToEvict.add(key)
    );
  });

  const payloadCache = new Map(
    Array.from(input.payloadCache).filter(([key]) => !aliasesToEvict.has(key))
  );
  const pendingPayloads = new Map(
    Array.from(input.pendingPayloads).filter(([key]) => !aliasesToEvict.has(key))
  );
  const publishedPayloads = Object.fromEntries(
    Object.entries(input.publishedPayloads).filter(([key]) => !aliasesToEvict.has(key))
  ) as Record<string, TPayload>;

  return {
    payloadCache,
    pendingPayloads,
    publishedPayloads,
    invalidatedLookupKeys,
    didEvictPublishedPayload:
      Object.keys(publishedPayloads).length !== Object.keys(input.publishedPayloads).length
  };
};

export const evictAreaPlaceableRenderPayloadLookupAliases = <
  TPayload extends { cacheKey: string },
  TPending
>(input: {
  lookup: AreaPlaceableRenderPayloadRevalidationLookup;
  objectIds: readonly string[];
  staleBackendCacheKey: string;
  validatedGenerationByLookup: ReadonlyMap<string, number>;
  payloadCache: ReadonlyMap<string, TPayload>;
  pendingPayloads: ReadonlyMap<string, TPending>;
  publishedPayloads: Readonly<Record<string, TPayload>>;
}): AreaPlaceableRenderPayloadCacheMissEvictionResult<TPayload, TPending> => {
  const evictedAliases = Array.from(
    new Set([input.lookup.cacheKey, ...input.lookup.indexKeys, ...input.objectIds])
  );
  const aliasesToEvict = new Set(evictedAliases);
  const isStalePayload = (payload: TPayload): boolean =>
    payload.cacheKey === input.staleBackendCacheKey;
  const payloadCache = new Map(
    Array.from(input.payloadCache).filter(
      ([key, payload]) => !aliasesToEvict.has(key) && !isStalePayload(payload)
    )
  );
  const pendingPayloads = new Map(
    Array.from(input.pendingPayloads).filter(([key]) => !aliasesToEvict.has(key))
  );
  const publishedPayloads = Object.fromEntries(
    Object.entries(input.publishedPayloads).filter(
      ([key, payload]) => !aliasesToEvict.has(key) && !isStalePayload(payload)
    )
  ) as Record<string, TPayload>;
  const validatedGenerationByLookup = new Map(input.validatedGenerationByLookup);
  validatedGenerationByLookup.delete(input.lookup.cacheKey);

  return {
    payloadCache,
    pendingPayloads,
    publishedPayloads,
    validatedGenerationByLookup,
    evictedAliases,
    invalidatedLookupKeys: [input.lookup.cacheKey],
    didEvictPublishedPayload:
      Object.keys(publishedPayloads).length !== Object.keys(input.publishedPayloads).length
  };
};
