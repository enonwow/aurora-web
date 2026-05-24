import { AppConfigService } from "../../src/common/config/app-config.service";
import { MemoryAreaProcessingCacheRepository } from "../../src/modules/areas/adapters/outbound/memory/memory-area-processing-cache.repository";
import type { AreaProcessingResult } from "../../src/modules/areas/domain/area.types";

describe("MemoryAreaProcessingCacheRepository", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it("evicts least recently used entries when max size is exceeded", async () => {
    const repository = new MemoryAreaProcessingCacheRepository(createConfig(2, 900, 1048576));

    await repository.set("a", buildAreaResult("a"));
    await repository.set("b", buildAreaResult("b"));
    await repository.set("c", buildAreaResult("c"));

    expect(await repository.get("a")).toBeNull();
    expect(await repository.get("b")).toMatchObject({ value: { areaId: "b" } });
    expect(await repository.get("c")).toMatchObject({ value: { areaId: "c" } });
  });

  it("expires entries after ttl", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-05-24T00:00:00.000Z"));
    const repository = new MemoryAreaProcessingCacheRepository(
      createConfig(2000, 1, 1048576)
    );

    await repository.set("ttl-key", buildAreaResult("ttl"));
    jest.advanceTimersByTime(1100);

    expect(await repository.get("ttl-key")).toBeNull();
  });

  it("skips storing oversized entries", async () => {
    const repository = new MemoryAreaProcessingCacheRepository(createConfig(2000, 900, 64));
    const oversized = buildAreaResult("oversized");
    oversized.tags = ["x".repeat(500)];

    await repository.set("big-key", oversized);

    expect(await repository.get("big-key")).toBeNull();
  });
});

function createConfig(
  processingCacheL1MaxEntries: number,
  processingCacheL1TtlSeconds: number,
  processingCacheL1AreaMaxEntryBytes: number
): AppConfigService {
  return {
    processingCacheL1AreaMaxEntries: processingCacheL1MaxEntries,
    processingCacheL1TtlSeconds,
    processingCacheL1AreaMaxEntryBytes
  } as AppConfigService;
}

function buildAreaResult(areaId: string): AreaProcessingResult {
  return {
    areaId,
    name: `Area ${areaId}`,
    biome: "urban",
    width: 10,
    height: 10,
    tags: [],
    benchmark: false,
    previewImageUrl: "/preview.webp",
    textureAtlas: {
      atlasId: "atlas",
      cacheKey: "atlas:10x10",
      strategy: "blob-cache"
    },
    composition: {
      placeables: 0,
      creatures: 0,
      items: 0,
      total: 0
    },
    objects: [],
    updatedAt: "2026-05-24T00:00:00.000Z",
    processedAt: "2026-05-24T00:00:01.000Z"
  };
}
