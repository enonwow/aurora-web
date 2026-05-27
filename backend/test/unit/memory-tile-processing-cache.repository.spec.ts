import { AppConfigService } from "../../src/common/config/app-config.service";
import { MemoryTileProcessingCacheRepository } from "../../src/modules/tiles/adapters/outbound/memory/memory-tile-processing-cache.repository";
import type { TileProcessingResult } from "../../src/modules/tiles/domain/tile.types";

describe("MemoryTileProcessingCacheRepository", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it("evicts least recently used entries when max size is exceeded", async () => {
    const repository = new MemoryTileProcessingCacheRepository(createConfig(2, 900, 1048576));

    await repository.set("a", buildTileResult("a"));
    await repository.set("b", buildTileResult("b"));
    await repository.set("c", buildTileResult("c"));

    expect(await repository.get("a")).toBeNull();
    expect(await repository.get("b")).toMatchObject({ value: { tileId: "b" } });
    expect(await repository.get("c")).toMatchObject({ value: { tileId: "c" } });
  });

  it("expires entries after ttl", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-05-25T00:00:00.000Z"));
    const repository = new MemoryTileProcessingCacheRepository(createConfig(2000, 1, 1048576));

    await repository.set("ttl-key", buildTileResult("ttl"));
    jest.advanceTimersByTime(1100);

    expect(await repository.get("ttl-key")).toBeNull();
  });

  it("skips storing oversized entries", async () => {
    const repository = new MemoryTileProcessingCacheRepository(createConfig(2000, 900, 64));
    const oversized = buildTileResult("oversized");
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

function buildTileResult(tileId: string): TileProcessingResult {
  return {
    tileId,
    resref: `res_${tileId}`,
    name: `Tile ${tileId}`,
    tileset: "city",
    variant: "street",
    tags: [],
    benchmark: false,
    previewImageUrl: "/preview.webp",
    textureAtlas: {
      atlasId: "atlas",
      cacheKey: "atlas:tile",
      strategy: "blob-cache"
    },
    walkmesh: "walkable",
    metrics: {
      triangles: 10,
      meshes: 2,
      emitters: 0
    },
    render: {
      backendType: "tile",
      frontendType: "tile",
      rendererPreset: "tile-standard"
    },
    updatedAt: "2026-05-25T00:00:00.000Z",
    processedAt: "2026-05-25T00:00:01.000Z"
  };
}
