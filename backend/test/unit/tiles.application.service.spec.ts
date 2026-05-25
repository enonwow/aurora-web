import { AppException } from "../../src/common/http/app-exception";
import {
  TilesApplicationService,
  __tilesApplicationServiceInternals
} from "../../src/modules/tiles/application/tiles.application.service";
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
    expect(detail.textureAtlas.cacheKey).toBe("atlas_tile_city_v1:tile_city_street_001");
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
    expect(result.tile.textureAtlas.cacheKey).toBe("atlas_tile_city_v1:tile_city_street_001");
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

  it("benchmark uses provided tile ids without listing benchmark defaults", async () => {
    repository.findById.mockResolvedValue(buildTile("tile_city_street_001"));
    processingCache.get.mockResolvedValue(null);
    processingCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-05-25T11:00:00.000Z",
      hits: 0
    }));

    await service.benchmarkTiles({
      tileIds: ["tile_city_street_001"],
      iterations: 1,
      warmupIterations: 0,
      bypassCache: true
    });

    expect(repository.list).not.toHaveBeenCalled();
    expect(repository.findById).toHaveBeenCalledWith("tile_city_street_001");
  });

  it("benchmark with empty tileIds uses benchmark list query", async () => {
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

    await service.benchmarkTiles({
      tileIds: [],
      iterations: 1,
      warmupIterations: 0,
      bypassCache: true
    });

    expect(repository.list).toHaveBeenCalledWith({
      benchmark: true,
      limit: 200,
      offset: 0
    });
  });

  it("benchmark fails when no benchmark tiles are configured", async () => {
    repository.list.mockResolvedValue({
      items: [],
      total: 0,
      limit: 200,
      offset: 0
    });

    await expect(
      service.benchmarkTiles({
        iterations: 1,
        warmupIterations: 0,
        bypassCache: true
      })
    ).rejects.toMatchObject({
      code: "VALIDATION_FAILED",
      message: "No benchmark tiles are configured."
    });
  });

  it("benchmark calls processTile exact warmup and iteration counts with expected flags", async () => {
    repository.findById.mockResolvedValue(buildTile("tile_city_street_001"));
    const processSpy = jest
      .spyOn(service, "processTile")
      .mockResolvedValue({
        cache: {
          key: "k".repeat(64),
          hit: false,
          storedAt: "2026-05-25T11:00:00.000Z",
          hits: 0
        },
        tile: {
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
        }
      });

    await service.benchmarkTiles({
      tileIds: ["tile_city_street_001"],
      iterations: 4,
      warmupIterations: 2,
      bypassCache: false
    });

    expect(processSpy).toHaveBeenCalledTimes(6);
    expect(processSpy.mock.calls[0][0]).toEqual({
      tileId: "tile_city_street_001",
      bypassCache: true
    });
    expect(processSpy.mock.calls[1][0]).toEqual({
      tileId: "tile_city_street_001",
      bypassCache: true
    });
    expect(processSpy.mock.calls[2][0]).toEqual({
      tileId: "tile_city_street_001",
      bypassCache: false
    });
    expect(processSpy.mock.calls[5][0]).toEqual({
      tileId: "tile_city_street_001",
      bypassCache: false
    });
  });

  it("benchmark computes elapsed milliseconds from hrtime deltas", async () => {
    repository.findById.mockResolvedValue(buildTile("tile_city_street_001"));
    const processSpy = jest
      .spyOn(service, "processTile")
      .mockResolvedValue({
        cache: {
          key: "k".repeat(64),
          hit: false,
          storedAt: "2026-05-25T11:00:00.000Z",
          hits: 0
        },
        tile: {
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
        }
      });
    const hrtimeSpy = jest
      .spyOn(process.hrtime, "bigint")
      .mockReturnValueOnce(1_000_000n)
      .mockReturnValueOnce(2_000_000n)
      .mockReturnValueOnce(10_000_000n)
      .mockReturnValueOnce(13_000_000n);

    const result = await service.benchmarkTiles({
      tileIds: ["tile_city_street_001"],
      iterations: 2,
      warmupIterations: 0,
      bypassCache: true
    });

    expect(processSpy).toHaveBeenCalledTimes(2);
    expect(result.metrics.overall.minMs).toBe(1);
    expect(result.metrics.overall.maxMs).toBe(3);
    expect(result.metrics.overall.avgMs).toBe(2);
    expect(result.metrics.perCandidate[0].metrics.p50Ms).toBe(1);
    expect(result.metrics.perCandidate[0].metrics.p95Ms).toBe(1);
    expect(result.metrics.perCandidate[0].metrics.p99Ms).toBe(1);
    hrtimeSpy.mockRestore();
  });

  it("benchmark fingerprint changes when tile candidate set changes", async () => {
    const tileA = buildTile("tile_city_street_001");
    const tileB = buildTile("tile_city_gate_002");
    repository.findById.mockImplementation(async (id) => {
      if (id === tileA.tileId) {
        return tileA;
      }
      if (id === tileB.tileId) {
        return tileB;
      }
      return null;
    });
    const processSpy = jest
      .spyOn(service, "processTile")
      .mockResolvedValue({
        cache: {
          key: "k".repeat(64),
          hit: false,
          storedAt: "2026-05-25T11:00:00.000Z",
          hits: 0
        },
        tile: {
          tileId: tileA.tileId,
          resref: tileA.resref,
          name: tileA.name,
          tileset: tileA.tileset,
          variant: tileA.variant,
          tags: tileA.tags,
          benchmark: tileA.benchmark,
          previewImageUrl: tileA.previewImageUrl,
          textureAtlas: {
            atlasId: tileA.textureAtlasId,
            cacheKey: `${tileA.textureAtlasId}:${tileA.tileId}`,
            strategy: "blob-cache"
          },
          walkmesh: tileA.walkmesh,
          metrics: tileA.metrics,
          render: {
            backendType: "tile",
            frontendType: "tile",
            rendererPreset: "tile-standard"
          },
          updatedAt: tileA.updatedAt,
          processedAt: "2026-05-25T10:59:00.000Z"
        }
      });

    const first = await service.benchmarkTiles({
      tileIds: [tileA.tileId],
      iterations: 1,
      warmupIterations: 0,
      bypassCache: true
    });
    const second = await service.benchmarkTiles({
      tileIds: [tileB.tileId],
      iterations: 1,
      warmupIterations: 0,
      bypassCache: true
    });

    expect(processSpy).toHaveBeenCalledTimes(2);
    expect(first.datasetFingerprint).not.toBe(second.datasetFingerprint);
  });

  it("benchmark internals summarize empty durations as zero metrics", () => {
    const summary = __tilesApplicationServiceInternals.summarizeDurations([]);
    expect(summary).toEqual({
      minMs: 0,
      maxMs: 0,
      avgMs: 0,
      p50Ms: 0,
      p95Ms: 0,
      p99Ms: 0
    });
  });

  it("benchmark internals sort durations before percentile calculations", () => {
    const summary = __tilesApplicationServiceInternals.summarizeDurations([3, 1, 2]);
    expect(summary.minMs).toBe(1);
    expect(summary.maxMs).toBe(3);
    expect(summary.avgMs).toBe(2);
    expect(summary.p50Ms).toBe(2);
    expect(summary.p95Ms).toBe(2);
    expect(summary.p99Ms).toBe(2);
  });

  it("benchmark internals percentile clamps ratios outside [0,1]", () => {
    expect(__tilesApplicationServiceInternals.percentile([], 0.5)).toBe(0);
    expect(__tilesApplicationServiceInternals.percentile([1, 2, 3], -3)).toBe(1);
    expect(__tilesApplicationServiceInternals.percentile([1, 2, 3], 5)).toBe(3);
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
