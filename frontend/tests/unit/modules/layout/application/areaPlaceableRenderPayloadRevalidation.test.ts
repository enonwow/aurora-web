import { describe, expect, it } from "vitest";

import {
  buildAreaPlaceableRenderPayloadQueueSignature,
  evictAreaPlaceableRenderPayloadLookupAliases,
  evictUnvalidatedAreaPlaceableRenderPayloads,
  isAreaPlaceableRenderPayloadValidated
} from "../../../../../src/modules/layout/application/areaPlaceableRenderPayloadRevalidation";

describe("Area placeable render payload revalidation", () => {
  it("builds an order-sensitive signature scoped by scene and validation generation", () => {
    const baseline = buildAreaPlaceableRenderPayloadQueueSignature(
      "area_one",
      7,
      ["lookup_a", "lookup_b"]
    );

    expect(baseline).toBe("area_one\u001e7\u001elookup_a\u001flookup_b");
    expect(buildAreaPlaceableRenderPayloadQueueSignature(
      "area_two",
      7,
      ["lookup_a", "lookup_b"]
    )).not.toBe(baseline);
    expect(buildAreaPlaceableRenderPayloadQueueSignature(
      "area_one",
      8,
      ["lookup_a", "lookup_b"]
    )).not.toBe(baseline);
    expect(buildAreaPlaceableRenderPayloadQueueSignature(
      "area_one",
      7,
      ["lookup_b", "lookup_a"]
    )).not.toBe(baseline);
  });

  it("accepts only the exact validation generation for a lookup", () => {
    const validated = new Map([["lookup_a", 4]]);

    expect(isAreaPlaceableRenderPayloadValidated(validated, "lookup_a", 4)).toBe(true);
    expect(isAreaPlaceableRenderPayloadValidated(validated, "lookup_a", 3)).toBe(false);
    expect(isAreaPlaceableRenderPayloadValidated(validated, "lookup_a", 5)).toBe(false);
    expect(isAreaPlaceableRenderPayloadValidated(validated, "lookup_missing", 4)).toBe(false);
  });

  it("evicts every cache, pending, published, index, and object alias for an unvalidated lookup", () => {
    const stalePayload = { cacheKey: "cache_stale" };
    const currentPayload = { cacheKey: "cache_current" };
    const stalePending = Promise.resolve(stalePayload);
    const currentPending = Promise.resolve(currentPayload);
    const result = evictUnvalidatedAreaPlaceableRenderPayloads({
      lookups: [
        { cacheKey: "lookup_stale", indexKeys: ["template_stale", "shared_alias"] },
        { cacheKey: "lookup_current", indexKeys: ["template_current"] }
      ],
      objectIdsByLookupCacheKey: new Map([
        ["lookup_stale", ["area:object_stale", "shared_alias"]],
        ["lookup_current", ["area:object_current"]]
      ]),
      validatedGenerationByLookup: new Map([
        ["lookup_stale", 1],
        ["lookup_current", 2]
      ]),
      validationGeneration: 2,
      payloadCache: new Map([
        ["template_stale", stalePayload],
        ["shared_alias", stalePayload],
        ["area:object_stale", stalePayload],
        ["template_current", currentPayload],
        ["area:object_current", currentPayload],
        ["unrelated", currentPayload]
      ]),
      pendingPayloads: new Map([
        ["template_stale", stalePending],
        ["area:object_stale", stalePending],
        ["template_current", currentPending],
        ["unrelated", currentPending]
      ]),
      publishedPayloads: {
        template_stale: stalePayload,
        "area:object_stale": stalePayload,
        template_current: currentPayload,
        "area:object_current": currentPayload,
        unrelated: currentPayload
      }
    });

    expect(result.invalidatedLookupKeys).toEqual(["lookup_stale"]);
    expect(Array.from(result.payloadCache.entries())).toEqual([
      ["template_current", currentPayload],
      ["area:object_current", currentPayload],
      ["unrelated", currentPayload]
    ]);
    expect(Array.from(result.pendingPayloads.entries())).toEqual([
      ["template_current", currentPending],
      ["unrelated", currentPending]
    ]);
    expect(result.publishedPayloads).toEqual({
      template_current: currentPayload,
      "area:object_current": currentPayload,
      unrelated: currentPayload
    });
    expect(result.didEvictPublishedPayload).toBe(true);
  });

  it("preserves all stores when every lookup is validated for the current generation", () => {
    const payload = { cacheKey: "cache_current" };
    const pending = Promise.resolve(payload);
    const result = evictUnvalidatedAreaPlaceableRenderPayloads({
      lookups: [{ cacheKey: "lookup_current", indexKeys: ["template_current"] }],
      objectIdsByLookupCacheKey: new Map([
        ["lookup_current", ["area:object_current"]]
      ]),
      validatedGenerationByLookup: new Map([["lookup_current", 9]]),
      validationGeneration: 9,
      payloadCache: new Map([["template_current", payload]]),
      pendingPayloads: new Map([["template_current", pending]]),
      publishedPayloads: { template_current: payload }
    });

    expect(result.invalidatedLookupKeys).toEqual([]);
    expect(Array.from(result.payloadCache.entries())).toEqual([["template_current", payload]]);
    expect(Array.from(result.pendingPayloads.entries())).toEqual([["template_current", pending]]);
    expect(result.publishedPayloads).toEqual({ template_current: payload });
    expect(result.didEvictPublishedPayload).toBe(false);
  });

  it("evicts index aliases even when no object aliases or published payload exist", () => {
    const payload = { cacheKey: "cache_stale" };
    const pending = Promise.resolve(payload);
    const result = evictUnvalidatedAreaPlaceableRenderPayloads({
      lookups: [{ cacheKey: "lookup_stale", indexKeys: ["template_stale"] }],
      objectIdsByLookupCacheKey: new Map(),
      validatedGenerationByLookup: new Map(),
      validationGeneration: 1,
      payloadCache: new Map([["template_stale", payload]]),
      pendingPayloads: new Map([["template_stale", pending]]),
      publishedPayloads: {}
    });

    expect(result.invalidatedLookupKeys).toEqual(["lookup_stale"]);
    expect(Array.from(result.payloadCache.entries())).toEqual([]);
    expect(Array.from(result.pendingPayloads.entries())).toEqual([]);
    expect(result.publishedPayloads).toEqual({});
    expect(result.didEvictPublishedPayload).toBe(false);
  });

  it("evicts every alias and validation marker for one backend cache miss", () => {
    const stalePayload = { cacheKey: "backend_cache_stale" };
    const currentPayload = { cacheKey: "backend_cache_current" };
    const stalePending = Promise.resolve(stalePayload);
    const result = evictAreaPlaceableRenderPayloadLookupAliases({
      lookup: {
        cacheKey: "lookup_stale",
        indexKeys: ["template_stale", "lookup_stale"]
      },
      objectIds: ["area:object_stale"],
      staleBackendCacheKey: "backend_cache_stale",
      validatedGenerationByLookup: new Map([
        ["lookup_stale", 3],
        ["lookup_current", 3]
      ]),
      payloadCache: new Map([
        ["template_stale", stalePayload],
        ["response_alias_not_in_lookup", stalePayload],
        ["template_current", currentPayload]
      ]),
      pendingPayloads: new Map([
        ["lookup_stale", stalePending],
        ["area:object_stale", stalePending],
        ["lookup_current", Promise.resolve(currentPayload)]
      ]),
      publishedPayloads: {
        "area:object_stale": stalePayload,
        response_alias_not_in_lookup: stalePayload,
        template_current: currentPayload
      }
    });

    expect(Array.from(result.payloadCache.entries())).toEqual([
      ["template_current", currentPayload]
    ]);
    expect(Array.from(result.pendingPayloads.keys())).toEqual(["lookup_current"]);
    expect(result.publishedPayloads).toEqual({ template_current: currentPayload });
    expect(Array.from(result.validatedGenerationByLookup.entries())).toEqual([
      ["lookup_current", 3]
    ]);
    expect(result.evictedAliases).toEqual([
      "lookup_stale",
      "template_stale",
      "area:object_stale"
    ]);
    expect(result.didEvictPublishedPayload).toBe(true);
  });

  it("reports no published eviction when a cache miss only removes private aliases", () => {
    const stalePayload = { cacheKey: "backend_cache_stale" };
    const currentPayload = { cacheKey: "backend_cache_current" };
    const result = evictAreaPlaceableRenderPayloadLookupAliases({
      lookup: {
        cacheKey: "lookup_stale",
        indexKeys: ["template_stale"]
      },
      objectIds: ["area:object_stale"],
      staleBackendCacheKey: "backend_cache_stale",
      validatedGenerationByLookup: new Map([["lookup_stale", 4]]),
      payloadCache: new Map([["template_stale", stalePayload]]),
      pendingPayloads: new Map(),
      publishedPayloads: { template_current: currentPayload }
    });

    expect(result.invalidatedLookupKeys).toEqual(["lookup_stale"]);
    expect(result.didEvictPublishedPayload).toBe(false);
    expect(result.publishedPayloads).toEqual({ template_current: currentPayload });
  });
});
