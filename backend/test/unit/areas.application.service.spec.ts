import { AppException } from "../../src/common/http/app-exception";
import { AreasApplicationService } from "../../src/modules/areas/application/areas.application.service";
import type { AreaProcessingCachePort } from "../../src/modules/areas/application/ports/area-processing-cache.port";
import type { AreaRepositoryPort } from "../../src/modules/areas/application/ports/area-repository.port";
import type {
  AreaListResult,
  AreaProcessingResult,
  AreaRecord
} from "../../src/modules/areas/domain/area.types";

describe("AreasApplicationService", () => {
  let repository: jest.Mocked<AreaRepositoryPort>;
  let processingCache: jest.Mocked<AreaProcessingCachePort>;
  let service: AreasApplicationService;

  beforeEach(() => {
    repository = {
      list: jest.fn(),
      findById: jest.fn(),
      getPrecomputedAreaProcessing: jest.fn()
    };
    processingCache = {
      get: jest.fn(),
      set: jest.fn()
    };
    service = new AreasApplicationService(repository, processingCache);
  });

  it("lists areas through repository", async () => {
    const result: AreaListResult = {
      items: [
        {
          areaId: "area_test_001",
          name: "Test Area",
          biome: "urban",
          width: 12,
          height: 12,
          tags: ["benchmark"],
          benchmark: true,
          previewImageUrl: "/preview.webp",
          textureAtlasId: "atlas_urban_v1",
          objectCounts: {
            placeables: 1,
            creatures: 1,
            items: 1,
            total: 3
          },
          updatedAt: "2026-05-23T00:00:00.000Z"
        }
      ],
      total: 1,
      limit: 20,
      offset: 0
    };
    repository.list.mockResolvedValue(result);

    const response = await service.listAreas({
      benchmark: true,
      limit: 20,
      offset: 0
    });

    expect(repository.list).toHaveBeenCalledWith({
      benchmark: true,
      limit: 20,
      offset: 0
    });
    expect(response).toEqual(result);
  });

  it("returns full area payload with composition counts", async () => {
    repository.findById.mockResolvedValue(buildArea("area_test_001"));

    const detail = await service.getArea("area_test_001");

    expect(detail.areaId).toBe("area_test_001");
    expect(detail.textureAtlas.atlasId).toBe("atlas_urban_v1");
    expect(detail.textureAtlas.cacheKey).toBe("atlas_urban_v1:12x12");
    expect(detail.textureAtlas.strategy).toBe("blob-cache");
    expect(detail.composition.placeables).toBe(1);
    expect(detail.composition.creatures).toBe(2);
    expect(detail.composition.items).toBe(1);
    expect(detail.composition.total).toBe(4);
    expect(detail.objects.length).toBe(4);
  });

  it("returns lightweight area preview payload", async () => {
    repository.findById.mockResolvedValue(buildArea("area_test_001"));

    const preview = await service.getAreaPreview("area_test_001");

    expect(preview.areaId).toBe("area_test_001");
    expect(preview.dimensions).toEqual({
      width: 12,
      height: 12
    });
    expect(preview.objectCounts.creatures).toBe(2);
    expect(preview.objectCounts.items).toBe(1);
    expect(preview.objectCounts.total).toBe(4);
  });

  it("throws AREA_NOT_FOUND when area is missing", async () => {
    repository.findById.mockResolvedValue(null);

    await expectAreaNotFound(service.getArea("missing"));
  });

  it("throws AREA_NOT_FOUND in preview when area is missing", async () => {
    repository.findById.mockResolvedValue(null);

    await expectAreaNotFound(service.getAreaPreview("missing"));
  });

  it("processes area and stores cache payload on miss", async () => {
    repository.findById.mockResolvedValue(buildArea("area_test_001"));
    processingCache.get.mockResolvedValue(null);
    processingCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-05-24T11:00:00.000Z",
      hits: 0
    }));

    const result = await service.processArea({
      areaId: "area_test_001",
      bypassCache: false
    });

    expect(result.cache.hit).toBe(false);
    expect(result.area.areaId).toBe("area_test_001");
    expect(result.area.textureAtlas.cacheKey).toBe("atlas_urban_v1:12x12");
    expect(result.area.processedAt).toEqual(expect.any(String));
    expect(processingCache.set).toHaveBeenCalledTimes(1);
  });

  it("returns processArea cache hit when bypassCache=false and cache exists", async () => {
    const value: AreaProcessingResult = {
      areaId: "area_test_001",
      name: "Test Area",
      biome: "urban",
      width: 12,
      height: 12,
      tags: ["benchmark", "city"],
      benchmark: true,
      previewImageUrl: "/previews/area_test_001.webp",
      textureAtlas: {
        atlasId: "atlas_urban_v1",
        cacheKey: "atlas_urban_v1:12x12",
        strategy: "blob-cache"
      },
      soundscape: buildAreaSoundscape(),
      composition: {
        placeables: 1,
        creatures: 2,
        items: 1,
        total: 4
      },
      objects: [],
      updatedAt: "2026-05-23T00:00:00.000Z",
      processedAt: "2026-05-24T10:59:00.000Z"
    };
    repository.findById.mockResolvedValue(buildArea("area_test_001"));
    processingCache.get.mockResolvedValue({
      key: "c".repeat(64),
      value,
      storedAt: "2026-05-24T11:00:00.000Z",
      hits: 6
    });

    const result = await service.processArea({
      areaId: "area_test_001",
      bypassCache: false
    });

    expect(result.cache.hit).toBe(true);
    expect(result.cache.hits).toBe(6);
    expect(result.area.areaId).toBe("area_test_001");
    expect(processingCache.set).not.toHaveBeenCalled();
  });

  it("returns cache hit from precomputed key without resolving area record", async () => {
    const cacheKey = "c".repeat(64);
    const value: AreaProcessingResult = {
      areaId: "area_test_001",
      name: "Test Area",
      biome: "urban",
      width: 12,
      height: 12,
      tags: ["benchmark", "city"],
      benchmark: true,
      previewImageUrl: "/previews/area_test_001.webp",
      textureAtlas: {
        atlasId: "atlas_urban_v1",
        cacheKey: "atlas_urban_v1:12x12",
        strategy: "blob-cache"
      },
      soundscape: buildAreaSoundscape(),
      composition: {
        placeables: 1,
        creatures: 2,
        items: 1,
        total: 4
      },
      objects: [],
      updatedAt: "2026-05-23T00:00:00.000Z",
      processedAt: "2026-05-24T10:59:00.000Z"
    };
    (repository.getPrecomputedAreaProcessing as jest.Mock).mockReturnValue({
      cacheKey,
      composition: value.composition
    });
    processingCache.get.mockResolvedValue({
      key: cacheKey,
      value,
      storedAt: "2026-05-24T11:00:00.000Z",
      hits: 9
    });

    const result = await service.processArea({
      areaId: "area_test_001",
      bypassCache: false
    });

    expect(result.cache.hit).toBe(true);
    expect(result.cache.key).toBe(cacheKey);
    expect(result.cache.hits).toBe(9);
    expect(result.area.areaId).toBe("area_test_001");
    expect(repository.findById).not.toHaveBeenCalled();
    expect(processingCache.set).not.toHaveBeenCalled();
  });

  it("processArea bypassCache=true skips cache read and writes fresh payload", async () => {
    repository.findById.mockResolvedValue(buildArea("area_test_001"));
    processingCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-05-24T11:00:00.000Z",
      hits: 0
    }));

    const result = await service.processArea({
      areaId: "area_test_001",
      bypassCache: true
    });

    expect(result.cache.hit).toBe(false);
    expect(processingCache.get).not.toHaveBeenCalled();
    expect(processingCache.set).toHaveBeenCalledTimes(1);
  });

  it("deduplicates concurrent area processing misses by cache key", async () => {
    repository.findById.mockResolvedValue(buildArea("area_test_001"));
    processingCache.get.mockResolvedValue(null);
    processingCache.set.mockImplementation(async (key, value) => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return {
        key,
        value,
        storedAt: "2026-05-24T11:00:00.000Z",
        hits: 0
      };
    });

    const firstPromise = service.processArea({
      areaId: "area_test_001",
      bypassCache: false
    });
    const secondPromise = service.processArea({
      areaId: "area_test_001",
      bypassCache: false
    });

    const [first, second] = await Promise.all([firstPromise, secondPromise]);
    expect(processingCache.set).toHaveBeenCalledTimes(1);
    expect(first.cache.key).toBe(second.cache.key);
    expect(first.area.areaId).toBe("area_test_001");
    expect(second.area.areaId).toBe("area_test_001");
  });

  it("cleans in-flight area map after completion so subsequent same-key miss reprocesses", async () => {
    repository.findById.mockResolvedValue(buildArea("area_test_001"));
    processingCache.get.mockResolvedValue(null);
    processingCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-05-24T11:00:00.000Z",
      hits: 0
    }));

    await service.processArea({
      areaId: "area_test_001",
      bypassCache: false
    });
    await service.processArea({
      areaId: "area_test_001",
      bypassCache: false
    });

    expect(processingCache.set).toHaveBeenCalledTimes(2);
  });

  it("returns processed area cache hit", async () => {
    const value: AreaProcessingResult = {
      areaId: "area_test_001",
      name: "Test Area",
      biome: "urban",
      width: 12,
      height: 12,
      tags: ["benchmark", "city"],
      benchmark: true,
      previewImageUrl: "/previews/area_test_001.webp",
      textureAtlas: {
        atlasId: "atlas_urban_v1",
        cacheKey: "atlas_urban_v1:12x12",
        strategy: "blob-cache"
      },
      soundscape: buildAreaSoundscape(),
      composition: {
        placeables: 1,
        creatures: 2,
        items: 1,
        total: 4
      },
      objects: [],
      updatedAt: "2026-05-23T00:00:00.000Z",
      processedAt: "2026-05-24T10:59:00.000Z"
    };
    processingCache.get.mockResolvedValue({
      key: "a".repeat(64),
      value,
      storedAt: "2026-05-24T11:00:00.000Z",
      hits: 3
    });

    const result = await service.getProcessedArea("a".repeat(64));

    expect(result.cache.hit).toBe(true);
    expect(result.cache.hits).toBe(3);
    expect(result.area.areaId).toBe("area_test_001");
  });

  it("throws AREA_CACHE_NOT_FOUND when processed area key is missing", async () => {
    processingCache.get.mockResolvedValue(null);

    await expect(service.getProcessedArea("b".repeat(64))).rejects.toMatchObject({
      code: "AREA_CACHE_NOT_FOUND",
      message: "Area cache entry was not found."
    });
  });

  it("throws AREA_NOT_FOUND from processArea when target area is missing", async () => {
    repository.findById.mockResolvedValue(null);

    await expect(
      service.processArea({
        areaId: "missing",
        bypassCache: true
      })
    ).rejects.toMatchObject({
      code: "AREA_NOT_FOUND",
      message: "Area was not found."
    });
  });
});

function buildArea(id: string): AreaRecord {
  return {
    areaId: id,
    name: "Test Area",
    biome: "urban",
    width: 12,
    height: 12,
    tags: ["benchmark", "city"],
    benchmark: true,
    previewImageUrl: `/previews/${id}.webp`,
    textureAtlasId: "atlas_urban_v1",
    soundscape: buildAreaSoundscape(),
    objects: [
      {
        objectId: "obj_plc_001",
        kind: "placeable",
        templateId: "plc_market_stall_001",
        x: 1,
        y: 2,
        z: 0,
        bearing: 0
      },
      {
        objectId: "obj_cre_001",
        kind: "creature",
        templateId: "cre_guard_human_001",
        x: 3,
        y: 4,
        z: 0,
        bearing: 90
      },
      {
        objectId: "obj_cre_002",
        kind: "creature",
        templateId: "cre_wolf_001",
        x: 4,
        y: 5,
        z: 0,
        bearing: 120
      },
      {
        objectId: "obj_itm_001",
        kind: "item",
        templateId: "itm_health_potion_001",
        x: 5,
        y: 6,
        z: 0,
        bearing: 180
      }
    ],
    updatedAt: "2026-05-23T00:00:00.000Z"
  };
}

function buildAreaSoundscape(): AreaRecord["soundscape"] {
  return {
    bindingKeys: {
      areaKey: "GI_sound_area",
      randomKey: "GI_sound_rndm",
      positionalKey: "GI_sound_pos"
    },
    area: [
      {
        soundId: "sound_ambient_city_market_001",
        resref: "amb_city_market_day",
        category: "ambient",
        playbackMode: "interval",
        ambientOnly: true
      }
    ],
    random: [
      {
        soundId: "sound_effect_door_creak_005",
        resref: "sfx_door_creak_long",
        category: "effect",
        playbackMode: "random",
        ambientOnly: false
      }
    ],
    positional: [
      {
        soundId: "sound_effect_forge_loop_003",
        resref: "sfx_forge_loop_heavy",
        category: "effect",
        playbackMode: "looping",
        ambientOnly: false
      }
    ]
  };
}

async function expectAreaNotFound(promise: Promise<unknown>): Promise<void> {
  expect.assertions(4);
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(AppException);
    const appError = error as AppException;
    expect(appError.code).toBe("AREA_NOT_FOUND");
    expect(appError.getStatus()).toBe(404);
    expect((appError.getResponse() as { message: string }).message).toBe(
      "Area was not found."
    );
  }
}
