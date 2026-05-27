import { AppConfigService } from "../../src/common/config/app-config.service";
import { LayeredAreaProcessingCacheRepository } from "../../src/modules/areas/adapters/outbound/layered/layered-area-processing-cache.repository";
import type {
  AreaProcessingCacheEntry,
  AreaProcessingCachePort
} from "../../src/modules/areas/application/ports/area-processing-cache.port";
import type { AreaProcessingResult } from "../../src/modules/areas/domain/area.types";

describe("LayeredAreaProcessingCacheRepository", () => {
  const key = "cache-key";
  const value: AreaProcessingResult = {
    areaId: "area_1",
    name: "Area",
    biome: "urban",
    width: 10,
    height: 10,
    tags: ["a"],
    benchmark: false,
    previewImageUrl: "/preview.webp",
    textureAtlas: {
      atlasId: "atlas",
      cacheKey: "atlas:10x10",
      strategy: "blob-cache"
    },
    soundscape: {
      bindingKeys: {
        areaKey: "GI_sound_area",
        randomKey: "GI_sound_rndm",
        positionalKey: "GI_sound_pos"
      },
      area: [],
      random: [],
      positional: []
    },
    composition: {
      placeables: 1,
      creatures: 0,
      items: 0,
      total: 1
    },
    objects: [
      {
        objectId: "obj1",
        kind: "placeable",
        templateId: "tpl",
        x: 1,
        y: 2,
        z: 0,
        bearing: 90
      }
    ],
    updatedAt: "2026-05-24T00:00:00.000Z",
    processedAt: "2026-05-24T00:00:01.000Z"
  };

  function createPortMock(): jest.Mocked<AreaProcessingCachePort> {
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
    const entry: AreaProcessingCacheEntry = {
      key,
      value,
      storedAt: "2026-05-24T00:00:00.000Z",
      hits: 3
    };
    memoryCache.get.mockResolvedValue(entry);

    const repository = new LayeredAreaProcessingCacheRepository(
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
    const entry: AreaProcessingCacheEntry = {
      key,
      value,
      storedAt: "2026-05-24T00:00:00.000Z",
      hits: 1
    };
    memoryCache.get.mockResolvedValue(null);
    s3Cache.get.mockResolvedValue(entry);

    const repository = new LayeredAreaProcessingCacheRepository(
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
    const entry: AreaProcessingCacheEntry = {
      key,
      value,
      storedAt: "2026-05-24T00:00:00.000Z",
      hits: 1
    };
    memoryCache.get.mockResolvedValue(null);
    s3Cache.get.mockResolvedValue(entry);
    memoryCache.set.mockResolvedValue({
      ...entry,
      hits: 0
    });

    const repository = new LayeredAreaProcessingCacheRepository(
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
