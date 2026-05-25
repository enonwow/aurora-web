import { AppException } from "../../src/common/http/app-exception";
import { TilesApplicationService } from "../../src/modules/tiles/application/tiles.application.service";
import type { TileProcessingCachePort } from "../../src/modules/tiles/application/ports/tile-processing-cache.port";
import type { TileRepositoryPort } from "../../src/modules/tiles/application/ports/tile-repository.port";
import type { TileListResult, TileProcessingResult, TileRecord } from "../../src/modules/tiles/domain/tile.types";

describe("TilesApplicationService", () => {
  let repository: jest.Mocked<TileRepositoryPort>;
  let processingCache: jest.Mocked<TileProcessingCachePort>;
  let service: TilesApplicationService;

  beforeEach(() => {
    repository = {
      list: jest.fn(),
      findById: jest.fn()
    };
    processingCache = {
      get: jest.fn(),
      set: jest.fn()
    };
    service = new TilesApplicationService(repository, processingCache);
  });

  it("lists tiles through repository", async () => {
    const result: TileListResult = {
      items: [
        {
          tileId: "tile_city_street_001",
          resref: "tcn01_city_street",
          name: "City Street",
          tileset: "city",
          variant: "street",
          tags: ["urban"],
          benchmark: true,
          previewImageUrl: "/preview.webp",
          walkmesh: "walkable",
          metrics: {
            triangles: 1,
            meshes: 1,
            emitters: 0
          },
          updatedAt: "2026-05-25T00:00:00.000Z"
        }
      ],
      total: 1,
      limit: 20,
      offset: 0
    };
    repository.list.mockResolvedValue(result);

    const response = await service.listTiles({
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

  it("returns full tile payload", async () => {
    repository.findById.mockResolvedValue(buildTile("tile_city_street_001"));

    const detail = await service.getTile("tile_city_street_001");

    expect(detail.tileId).toBe("tile_city_street_001");
    expect(detail.textureAtlas.atlasId).toBe("atlas_tile_city_v1");
    expect(detail.textureAtlas.strategy).toBe("blob-cache");
    expect(detail.metrics.triangles).toBeGreaterThan(0);
  });

  it("returns lightweight tile preview payload", async () => {
    repository.findById.mockResolvedValue(buildTile("tile_city_street_001"));

    const preview = await service.getTilePreview("tile_city_street_001");

    expect(preview.tileId).toBe("tile_city_street_001");
    expect(preview.tileset).toBe("city");
    expect(preview.walkmesh).toBe("walkable");
  });

  it("throws TILE_NOT_FOUND when tile is missing", async () => {
    repository.findById.mockResolvedValue(null);

    await expectTileNotFound(service.getTile("missing"));
  });

  it("throws TILE_NOT_FOUND in preview when tile is missing", async () => {
    repository.findById.mockResolvedValue(null);

    await expectTileNotFound(service.getTilePreview("missing"));
  });

  it("processes tile and stores cache payload on miss", async () => {
    repository.findById.mockResolvedValue(buildTile("tile_city_street_001"));
    processingCache.get.mockResolvedValue(null);
    processingCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-05-25T11:00:00.000Z",
      hits: 0
    }));

    const result = await service.processTile({
      tileId: "tile_city_street_001",
      bypassCache: false
    });

    expect(result.cache.hit).toBe(false);
    expect(result.tile.tileId).toBe("tile_city_street_001");
    expect(result.tile.render.backendType).toBe("tile");
    expect(result.tile.processedAt).toEqual(expect.any(String));
    expect(processingCache.set).toHaveBeenCalledTimes(1);
  });

  it("returns processTile cache hit when bypassCache=false and cache exists", async () => {
    const value: TileProcessingResult = {
      tileId: "tile_city_street_001",
      resref: "tcn01_city_street",
      name: "Tile",
      tileset: "city",
      variant: "street",
      tags: ["urban"],
      benchmark: true,
      previewImageUrl: "/preview.webp",
      textureAtlas: {
        atlasId: "atlas_tile_city_v1",
        cacheKey: "atlas_tile_city_v1:tile_city_street_001",
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
      processedAt: "2026-05-25T10:59:00.000Z"
    };
    repository.findById.mockResolvedValue(buildTile("tile_city_street_001"));
    processingCache.get.mockResolvedValue({
      key: "c".repeat(64),
      value,
      storedAt: "2026-05-25T11:00:00.000Z",
      hits: 6
    });

    const result = await service.processTile({
      tileId: "tile_city_street_001",
      bypassCache: false
    });

    expect(result.cache.hit).toBe(true);
    expect(result.cache.hits).toBe(6);
    expect(result.tile.tileId).toBe("tile_city_street_001");
    expect(processingCache.set).not.toHaveBeenCalled();
  });

  it("processTile bypassCache=true skips cache read and writes fresh payload", async () => {
    repository.findById.mockResolvedValue(buildTile("tile_city_street_001"));
    processingCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-05-25T11:00:00.000Z",
      hits: 0
    }));

    const result = await service.processTile({
      tileId: "tile_city_street_001",
      bypassCache: true
    });

    expect(result.cache.hit).toBe(false);
    expect(processingCache.get).not.toHaveBeenCalled();
    expect(processingCache.set).toHaveBeenCalledTimes(1);
  });

  it("deduplicates concurrent tile processing misses by cache key", async () => {
    repository.findById.mockResolvedValue(buildTile("tile_city_street_001"));
    processingCache.get.mockResolvedValue(null);
    processingCache.set.mockImplementation(async (key, value) => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return {
        key,
        value,
        storedAt: "2026-05-25T11:00:00.000Z",
        hits: 0
      };
    });

    const firstPromise = service.processTile({
      tileId: "tile_city_street_001",
      bypassCache: false
    });
    const secondPromise = service.processTile({
      tileId: "tile_city_street_001",
      bypassCache: false
    });

    const [first, second] = await Promise.all([firstPromise, secondPromise]);
    expect(processingCache.set).toHaveBeenCalledTimes(1);
    expect(first.cache.key).toBe(second.cache.key);
    expect(first.tile.tileId).toBe("tile_city_street_001");
    expect(second.tile.tileId).toBe("tile_city_street_001");
  });

  it("cleans in-flight tile map after completion so subsequent same-key miss reprocesses", async () => {
    repository.findById.mockResolvedValue(buildTile("tile_city_street_001"));
    processingCache.get.mockResolvedValue(null);
    processingCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-05-25T11:00:00.000Z",
      hits: 0
    }));

    await service.processTile({
      tileId: "tile_city_street_001",
      bypassCache: false
    });
    await service.processTile({
      tileId: "tile_city_street_001",
      bypassCache: false
    });

    expect(processingCache.set).toHaveBeenCalledTimes(2);
  });

  it("returns processed tile cache hit", async () => {
    const value: TileProcessingResult = {
      tileId: "tile_city_street_001",
      resref: "tcn01_city_street",
      name: "Tile",
      tileset: "city",
      variant: "street",
      tags: ["urban"],
      benchmark: true,
      previewImageUrl: "/preview.webp",
      textureAtlas: {
        atlasId: "atlas_tile_city_v1",
        cacheKey: "atlas_tile_city_v1:tile_city_street_001",
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
      processedAt: "2026-05-25T10:59:00.000Z"
    };
    processingCache.get.mockResolvedValue({
      key: "a".repeat(64),
      value,
      storedAt: "2026-05-25T11:00:00.000Z",
      hits: 3
    });

    const result = await service.getProcessedTile("a".repeat(64));

    expect(result.cache.hit).toBe(true);
    expect(result.cache.hits).toBe(3);
    expect(result.tile.tileId).toBe("tile_city_street_001");
  });

  it("throws TILE_CACHE_NOT_FOUND when processed tile key is missing", async () => {
    processingCache.get.mockResolvedValue(null);

    await expect(service.getProcessedTile("b".repeat(64))).rejects.toMatchObject({
      code: "TILE_CACHE_NOT_FOUND",
      message: "Tile cache entry was not found."
    });
  });

  it("throws TILE_NOT_FOUND from processTile when target tile is missing", async () => {
    repository.findById.mockResolvedValue(null);

    await expect(
      service.processTile({
        tileId: "missing",
        bypassCache: true
      })
    ).rejects.toMatchObject({
      code: "TILE_NOT_FOUND",
      message: "Tile was not found."
    });
  });

  it("runs benchmark and returns deterministic metrics envelope", async () => {
    const tile = buildTile("tile_city_street_001");
    repository.list.mockResolvedValue({
      items: [
        {
          tileId: tile.tileId,
          resref: tile.resref,
          name: tile.name,
          tileset: tile.tileset,
          variant: tile.variant,
          tags: tile.tags,
          benchmark: true,
          previewImageUrl: tile.previewImageUrl,
          walkmesh: tile.walkmesh,
          metrics: tile.metrics,
          updatedAt: tile.updatedAt
        }
      ],
      total: 1,
      limit: 200,
      offset: 0
    });
    repository.findById.mockResolvedValue(tile);
    processingCache.get.mockResolvedValue(null);
    processingCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-05-25T11:00:00.000Z",
      hits: 0
    }));

    const result = await service.benchmarkTiles({
      iterations: 3,
      warmupIterations: 1,
      bypassCache: true
    });

    expect(result.datasetFingerprint).toHaveLength(64);
    expect(result.metrics.perCandidate).toHaveLength(1);
    expect(result.config.candidates).toBe(1);
  });

  it("benchmark validation fails for unknown tile ids", async () => {
    repository.findById.mockResolvedValue(null);

    await expect(
      service.benchmarkTiles({
        tileIds: ["missing-tile"],
        iterations: 1,
        warmupIterations: 0,
        bypassCache: true
      })
    ).rejects.toMatchObject({
      code: "VALIDATION_FAILED",
      message: "Benchmark payload references unknown tile ids."
    });
  });
});

function buildTile(id: string): TileRecord {
  return {
    tileId: id,
    resref: "tcn01_city_street",
    name: "City Street",
    tileset: "city",
    variant: "street",
    tags: ["urban", "road"],
    benchmark: true,
    previewImageUrl: `/previews/${id}.webp`,
    textureAtlasId: "atlas_tile_city_v1",
    walkmesh: "walkable",
    metrics: {
      triangles: 1240,
      meshes: 18,
      emitters: 0
    },
    updatedAt: "2026-05-25T00:00:00.000Z"
  };
}

async function expectTileNotFound(promise: Promise<unknown>): Promise<void> {
  expect.assertions(4);
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(AppException);
    const appError = error as AppException;
    expect(appError.code).toBe("TILE_NOT_FOUND");
    expect(appError.getStatus()).toBe(404);
    expect((appError.getResponse() as { message: string }).message).toBe("Tile was not found.");
  }
}
