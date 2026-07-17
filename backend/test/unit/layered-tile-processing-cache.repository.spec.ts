import { AppConfigService } from "../../src/common/config/app-config.service";
import { LayeredTileProcessingCacheRepository } from "../../src/modules/tiles/adapters/outbound/layered/layered-tile-processing-cache.repository";
import type {
  TileProcessingCacheEntry,
  TileProcessingCachePort
} from "../../src/modules/tiles/application/ports/tile-processing-cache.port";
import type { TileProcessingResult } from "../../src/modules/tiles/domain/tile.types";

describe("LayeredTileProcessingCacheRepository", () => {
  const key = "cache-key";
  const value: TileProcessingResult = {
    tileId: "tile_1",
    resref: "tile_resref",
    name: "Tile",
    tileset: "city",
    variant: "street",
    tags: ["a"],
    benchmark: false,
    previewImageUrl: "/preview.webp",
    textureAtlas: {
      atlasId: "atlas",
      cacheKey: "atlas:tile_1",
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

  function createPortMock(): jest.Mocked<TileProcessingCachePort> {
    return {
      get: jest.fn(),
      set: jest.fn()
    };
  }

  function createConfig(): AppConfigService {
    return {
      processingCacheL1AdmissionHits: 2,
      processingCacheL1AdmissionWindowSeconds: 300,
      processingCacheL1AreaMaxEntries: 800
    } as AppConfigService;
  }

  it("returns L1 hit without querying L2", async () => {
    const memoryCache = createPortMock();
    const s3Cache = createPortMock();
    const entry: TileProcessingCacheEntry = {
      key,
      value,
      storedAt: "2026-05-25T00:00:00.000Z",
      hits: 3
    };
    memoryCache.get.mockResolvedValue(entry);

    const repository = new LayeredTileProcessingCacheRepository(
      s3Cache as any,
      memoryCache as any,
      createConfig()
    );

    const result = await repository.get(key);

    expect(result).toEqual(entry);
    expect(s3Cache.get).not.toHaveBeenCalled();
  });

  it("does not hydrate L1 on first L2 hit", async () => {
    const memoryCache = createPortMock();
    const s3Cache = createPortMock();
    const entry: TileProcessingCacheEntry = {
      key,
      value,
      storedAt: "2026-05-25T00:00:00.000Z",
      hits: 1
    };
    memoryCache.get.mockResolvedValue(null);
    s3Cache.get.mockResolvedValue(entry);

    const repository = new LayeredTileProcessingCacheRepository(
      s3Cache as any,
      memoryCache as any,
      createConfig()
    );

    const result = await repository.get(key);

    expect(result).toEqual(entry);
    expect(memoryCache.set).not.toHaveBeenCalled();
  });

  it("hydrates L1 on second L2 hit for same key", async () => {
    const memoryCache = createPortMock();
    const s3Cache = createPortMock();
    const entry: TileProcessingCacheEntry = {
      key,
      value,
      storedAt: "2026-05-25T00:00:00.000Z",
      hits: 1
    };
    memoryCache.get.mockResolvedValue(null);
    s3Cache.get.mockResolvedValue(entry);
    memoryCache.set.mockResolvedValue({
      ...entry,
      hits: 0
    });

    const repository = new LayeredTileProcessingCacheRepository(
      s3Cache as any,
      memoryCache as any,
      createConfig()
    );

    await repository.get(key);
    await repository.get(key);

    expect(memoryCache.set).toHaveBeenCalledTimes(1);
    expect(memoryCache.set).toHaveBeenCalledWith(key, value);
  });
});
