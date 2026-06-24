import { describe, expect, it, vi } from "vitest";
import { AreaApiRequestError } from "../../../../src/modules/areas/adapters/httpAreaApiPort";
import {
  resolveAreaTextureAtlasReadiness,
  type AreaTextureAtlasReadiness
} from "../../../../src/modules/areas/application/areaTextureAtlasReadiness";
import type {
  AreaApiProcessResult,
  AreaApiTextureDeliveryContract,
  AreaApiTextureDeliveryMode,
  AreaApiTextureDeliveryResult
} from "../../../../src/modules/areas/contracts";
import type { AreaApiPort } from "../../../../src/modules/areas/ports/areaApiPort";

const backendProcessResult: AreaApiProcessResult = {
  cache: {
    key: "4f8c2a1b9e7d6c5a",
    hit: false,
    storedAt: "2026-06-16T18:20:00.000Z",
    hits: 0
  },
  area: {
    areaId: "area_001",
    name: "Area One",
    biome: "urban",
    width: 24,
    height: 24,
    tags: ["city"],
    benchmark: false,
    previewImageUrl: "/assets/previews/areas/area_001.webp",
    textureAtlas: {
      atlasId: "atlas_area_001_detail",
      cacheKey: "atlas_area_001:24x24",
      strategy: "blob-cache",
      objectKey: "modules/current/areas/atlases/atlas_area_001_detail.webp",
      contentType: "image/webp",
      sizeBytes: 262144,
      etag: "atlas-area-001-detail"
    },
    composition: {
      placeables: 1,
      doors: 1,
      creatures: 1,
      items: 1,
      sounds: 1,
      total: 5
    },
    updatedAt: "2026-05-27T10:00:00.000Z",
    processedAt: "2026-06-16T18:20:00.000Z",
    objects: []
  }
};

const backendReadyProxyTextureAtlas: AreaApiTextureDeliveryContract = {
  mode: "proxy",
  atlasId: "atlas_area_001_proxy_contract",
  objectKey: "modules/current/areas/atlases/atlas_area_001_proxy_contract.webp",
  contentType: "image/webp",
  sizeBytes: 262145,
  etag: "atlas-area-001-proxy-contract",
  proxyPath: "/api/v1/areas/cache/4f8c2a1b9e7d6c5a/textures",
  proxyUrl: "/api/v1/areas/cache/4f8c2a1b9e7d6c5a/textures"
};

const backendReadyDirectTextureAtlas: AreaApiTextureDeliveryContract = {
  mode: "direct",
  atlasId: "atlas_area_001_direct_contract",
  objectKey: "modules/current/areas/atlases/atlas_area_001_direct_contract.webp",
  contentType: "image/webp",
  sizeBytes: 262146,
  etag: "atlas-area-001-direct-contract",
  proxyPath: "/api/v1/areas/cache/4f8c2a1b9e7d6c5a/textures",
  proxyUrl: "/api/v1/areas/cache/4f8c2a1b9e7d6c5a/textures",
  directUrl: "https://assets.example.test/modules/current/areas/atlases/atlas_area_001_direct_contract.webp",
  s3Url: "s3://aurora-modules/modules/current/areas/atlases/atlas_area_001_direct_contract.webp"
};

function backendTextureResult(
  textureAtlas: AreaApiTextureDeliveryContract,
  cacheKey = backendProcessResult.cache.key
): AreaApiTextureDeliveryResult {
  return {
    cacheKey,
    textureAtlas
  };
}

function createAreaApiPortStub(
  overrides: Partial<AreaApiPort> = {}
): AreaApiPort {
  return {
    login: vi.fn(),
    listAreas: vi.fn(),
    getAreaById: vi.fn(),
    processArea: vi.fn(async () => backendProcessResult),
    getAreaTextureAtlasContracts: vi.fn(async () =>
      backendTextureResult(backendReadyProxyTextureAtlas)
    ),
    ...overrides
  };
}

function expectedReadyReadiness(
  deliveryMode: AreaApiTextureDeliveryMode,
  textureAtlas: AreaApiTextureDeliveryContract,
  contractCacheKey = backendProcessResult.cache.key
): AreaTextureAtlasReadiness {
  return {
    status: "ready",
    areaId: backendProcessResult.area.areaId,
    areaName: backendProcessResult.area.name,
    previewImageUrl: backendProcessResult.area.previewImageUrl,
    cache: backendProcessResult.cache,
    processedAt: backendProcessResult.area.processedAt,
    detailTextureAtlas: backendProcessResult.area.textureAtlas,
    contractCacheKey,
    deliveryMode,
    textureAtlas
  };
}

function expectNoReadyTextureMetadata(result: AreaTextureAtlasReadiness) {
  expect(result.status).toBe("blocked");
  expect("textureAtlas" in result).toBe(false);
  expect("contractCacheKey" in result).toBe(false);
}

describe("resolveAreaTextureAtlasReadiness", () => {
  it("preserves backend-shaped proxy texture contract readiness metadata exactly", async () => {
    const port = createAreaApiPortStub();

    const result = await resolveAreaTextureAtlasReadiness(port, "token_abc", "area_001", {
      bypassCache: true
    });

    expect(port.processArea).toHaveBeenCalledWith("token_abc", "area_001", {
      bypassCache: true
    });
    expect(port.getAreaTextureAtlasContracts).toHaveBeenCalledWith(
      "token_abc",
      "4f8c2a1b9e7d6c5a",
      "proxy"
    );
    expect(result).toEqual(expectedReadyReadiness("proxy", backendReadyProxyTextureAtlas));
  });

  it("preserves backend-shaped direct texture contract readiness metadata exactly", async () => {
    const port = createAreaApiPortStub({
      getAreaTextureAtlasContracts: vi.fn(async () =>
        backendTextureResult(backendReadyDirectTextureAtlas)
      )
    });

    const result = await resolveAreaTextureAtlasReadiness(port, "token_abc", "area_001", {
      deliveryMode: "direct"
    });

    expect(port.getAreaTextureAtlasContracts).toHaveBeenCalledWith(
      "token_abc",
      "4f8c2a1b9e7d6c5a",
      "direct"
    );
    expect(result).toEqual(expectedReadyReadiness("direct", backendReadyDirectTextureAtlas));
  });

  it("preserves backend-shaped process failure metadata without cache or fallback contracts", async () => {
    const port = createAreaApiPortStub({
      processArea: vi.fn(async () => {
        throw new AreaApiRequestError(
          "Area processing failed before a texture cache was created.",
          503,
          "AREA_PROCESS_FAILED"
        );
      })
    });

    const result = await resolveAreaTextureAtlasReadiness(port, "token_abc", "area_process_failed");

    expect(port.getAreaTextureAtlasContracts).not.toHaveBeenCalled();
    expect(result).toEqual({
      status: "blocked",
      areaId: "area_process_failed",
      stage: "process",
      deliveryMode: "proxy",
      code: "AREA_PROCESS_FAILED",
      message: "Area processing failed before a texture cache was created.",
      httpStatus: 503,
      directDeliveryUnavailable: false
    });
    expect("cache" in result).toBe(false);
    expect("processedAt" in result).toBe(false);
    expectNoReadyTextureMetadata(result);
  });

  it("preserves backend-shaped texture-contract failure metadata with cache and processed time", async () => {
    const port = createAreaApiPortStub({
      getAreaTextureAtlasContracts: vi.fn(async () => {
        throw new AreaApiRequestError(
          "Texture atlas contract lookup failed after processing.",
          500,
          "AREA_TEXTURE_CONTRACT_FAILED"
        );
      })
    });

    const result = await resolveAreaTextureAtlasReadiness(port, "token_abc", "area_001");

    expect(port.getAreaTextureAtlasContracts).toHaveBeenCalledWith(
      "token_abc",
      "4f8c2a1b9e7d6c5a",
      "proxy"
    );
    expect(result).toEqual({
      status: "blocked",
      areaId: "area_001",
      stage: "texture-contract",
      deliveryMode: "proxy",
      cache: backendProcessResult.cache,
      processedAt: "2026-06-16T18:20:00.000Z",
      code: "AREA_TEXTURE_CONTRACT_FAILED",
      message: "Texture atlas contract lookup failed after processing.",
      httpStatus: 500,
      directDeliveryUnavailable: false
    });
    expectNoReadyTextureMetadata(result);
  });

  it("preserves backend-shaped direct-delivery-unavailable flags without fallback rendering", async () => {
    const port = createAreaApiPortStub({
      getAreaTextureAtlasContracts: vi.fn(async () => {
        throw new AreaApiRequestError(
          "Direct area delivery is unavailable without blob storage settings.",
          422,
          "AREA_DIRECT_DELIVERY_UNAVAILABLE"
        );
      })
    });

    const result = await resolveAreaTextureAtlasReadiness(port, "token_abc", "area_001", {
      deliveryMode: "direct"
    });

    expect(port.getAreaTextureAtlasContracts).toHaveBeenCalledWith(
      "token_abc",
      "4f8c2a1b9e7d6c5a",
      "direct"
    );
    expect(result).toEqual({
      status: "blocked",
      areaId: "area_001",
      stage: "texture-contract",
      deliveryMode: "direct",
      cache: backendProcessResult.cache,
      processedAt: "2026-06-16T18:20:00.000Z",
      code: "AREA_DIRECT_DELIVERY_UNAVAILABLE",
      message: "Direct area delivery is unavailable without blob storage settings.",
      httpStatus: 422,
      directDeliveryUnavailable: true
    });
    expectNoReadyTextureMetadata(result);
  });

  it("keeps sequential backend-shaped readiness results isolated across retry-style calls", async () => {
    const processArea = vi
      .fn()
      .mockResolvedValueOnce({
        ...backendProcessResult,
        cache: {
          key: "retry-blocked-cache-001",
          hit: true,
          storedAt: "2026-06-16T18:21:00.000Z",
          hits: 2
        }
      })
      .mockResolvedValueOnce({
        ...backendProcessResult,
        cache: {
          key: "retry-ready-cache-002",
          hit: false,
          storedAt: "2026-06-16T18:22:00.000Z",
          hits: 0
        }
      });
    const getAreaTextureAtlasContracts = vi
      .fn()
      .mockRejectedValueOnce(
        new AreaApiRequestError(
          "Direct area delivery is unavailable without blob storage settings.",
          422,
          "AREA_DIRECT_DELIVERY_UNAVAILABLE"
        )
      )
      .mockResolvedValueOnce(
        backendTextureResult(backendReadyDirectTextureAtlas, "retry-ready-cache-002")
      );
    const port = createAreaApiPortStub({
      processArea,
      getAreaTextureAtlasContracts
    });

    const blocked = await resolveAreaTextureAtlasReadiness(port, "token_abc", "area_001", {
      deliveryMode: "direct"
    });
    const ready = await resolveAreaTextureAtlasReadiness(port, "token_abc", "area_001", {
      deliveryMode: "direct"
    });

    expect(blocked).toEqual({
      status: "blocked",
      areaId: "area_001",
      stage: "texture-contract",
      deliveryMode: "direct",
      cache: {
        key: "retry-blocked-cache-001",
        hit: true,
        storedAt: "2026-06-16T18:21:00.000Z",
        hits: 2
      },
      processedAt: "2026-06-16T18:20:00.000Z",
      code: "AREA_DIRECT_DELIVERY_UNAVAILABLE",
      message: "Direct area delivery is unavailable without blob storage settings.",
      httpStatus: 422,
      directDeliveryUnavailable: true
    });
    expect(ready).toEqual({
      ...expectedReadyReadiness("direct", backendReadyDirectTextureAtlas, "retry-ready-cache-002"),
      cache: {
        key: "retry-ready-cache-002",
        hit: false,
        storedAt: "2026-06-16T18:22:00.000Z",
        hits: 0
      }
    });
    expect(JSON.stringify(ready)).not.toContain("AREA_DIRECT_DELIVERY_UNAVAILABLE");
    expect(JSON.stringify(ready)).not.toContain("retry-blocked-cache-001");
    expect(getAreaTextureAtlasContracts).toHaveBeenNthCalledWith(
      1,
      "token_abc",
      "retry-blocked-cache-001",
      "direct"
    );
    expect(getAreaTextureAtlasContracts).toHaveBeenNthCalledWith(
      2,
      "token_abc",
      "retry-ready-cache-002",
      "direct"
    );
  });

  it("classifies backend-unreachable process failures as infrastructure runtime health", async () => {
    const port = createAreaApiPortStub({
      processArea: vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      })
    });

    const result = await resolveAreaTextureAtlasReadiness(port, "token_abc", "area_001");

    expect(port.getAreaTextureAtlasContracts).not.toHaveBeenCalled();
    expect(result).toEqual({
      status: "blocked",
      areaId: "area_001",
      stage: "process",
      deliveryMode: "proxy",
      code: null,
      message: "Failed to fetch",
      directDeliveryUnavailable: false,
      failureClassification: "infrastructure_runtime_health",
      infrastructureRuntimeHealth: true
    });
    expect("cache" in result).toBe(false);
    expect("processedAt" in result).toBe(false);
    expectNoReadyTextureMetadata(result);
  });

  it("classifies backend-unreachable texture-contract failures as infrastructure runtime health with cache context", async () => {
    const port = createAreaApiPortStub({
      getAreaTextureAtlasContracts: vi.fn(async () => {
        throw new TypeError("NetworkError when attempting to fetch resource.");
      })
    });

    const result = await resolveAreaTextureAtlasReadiness(port, "token_abc", "area_001", {
      deliveryMode: "direct"
    });

    expect(port.getAreaTextureAtlasContracts).toHaveBeenCalledWith(
      "token_abc",
      "4f8c2a1b9e7d6c5a",
      "direct"
    );
    expect(result).toEqual({
      status: "blocked",
      areaId: "area_001",
      stage: "texture-contract",
      deliveryMode: "direct",
      cache: backendProcessResult.cache,
      processedAt: "2026-06-16T18:20:00.000Z",
      code: null,
      message: "NetworkError when attempting to fetch resource.",
      directDeliveryUnavailable: false,
      failureClassification: "infrastructure_runtime_health",
      infrastructureRuntimeHealth: true
    });
    expectNoReadyTextureMetadata(result);
  });

  it("does not classify malformed Areas contract data as infrastructure runtime health", async () => {
    const port = createAreaApiPortStub({
      getAreaTextureAtlasContracts: vi.fn(async () => {
        throw new Error("Invalid Areas texture contract: atlasId is required.");
      })
    });

    const result = await resolveAreaTextureAtlasReadiness(port, "token_abc", "area_001");

    expect(result).toEqual({
      status: "blocked",
      areaId: "area_001",
      stage: "texture-contract",
      deliveryMode: "proxy",
      cache: backendProcessResult.cache,
      processedAt: "2026-06-16T18:20:00.000Z",
      code: null,
      message: "Invalid Areas texture contract: atlasId is required.",
      directDeliveryUnavailable: false
    });
    expect("failureClassification" in result).toBe(false);
    expect("infrastructureRuntimeHealth" in result).toBe(false);
    expectNoReadyTextureMetadata(result);
  });
});
