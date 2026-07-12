import { AppException } from "../../src/common/http/app-exception";
import {
  TilesApplicationService,
  __tilesApplicationServiceInternals
} from "../../src/modules/tiles/application/tiles.application.service";
import type { DerivedAssetGeneratorPort } from "../../src/modules/runtime-settings/application/ports/derived-asset-generator.port";
import type { ModuleBlobStoragePort } from "../../src/modules/runtime-settings/application/ports/module-blob-storage.port";
import type { RuntimeSettingsRepositoryPort } from "../../src/modules/runtime-settings/application/ports/runtime-settings-repository.port";
import type { RuntimeSettingsApplicationService } from "../../src/modules/runtime-settings/application/runtime-settings.application.service";
import { AURORA_MDL_TO_GLB_CONVERTER_VERSION } from "../../src/modules/runtime-settings/domain/derived-asset-versions";
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
    expect(detail.textureAtlas.objectKey).toBe("modules/current/tiles/atlases/atlas_tile_city_v1.webp");
    expect(detail.textureAtlas.contentType).toBe("image/webp");
    expect(detail.textureAtlas.sizeBytes).toBe(262144);
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
    expect(result.tile.textureAtlas.objectKey).toBe("modules/current/tiles/atlases/atlas_tile_city_v1.webp");
    expect(processingCache.set).toHaveBeenCalledTimes(1);
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

  it("returns source and GLB delivery contracts for every edited Tile_ID model candidate", async () => {
    const records = new Map(
      ["sic11_a00_00", "sic11_a01_02"].map((resref) => {
        const tileId = `tile_${resref}`;
        return [
          tileId,
          {
            ...buildTile(tileId),
            resref,
            sourceAssetObjectKey: `modules/current/__aurora/sources/vanilla/models/${resref}.mdl`,
            sourceAssetExtension: "mdl" as const,
            sourceAssetSizeBytes: 2048,
            sourceAssetOrigin: "module-snapshot" as const,
            renderModelObjectKey: `modules/current/__aurora/derived/models/${resref}.glb`,
            renderModelExtension: "glb" as const,
            renderModelSizeBytes: 4096
          }
        ] as const;
      })
    );
    repository.findById.mockImplementation(async (tileId) => records.get(tileId) ?? null);
    processingCache.get.mockResolvedValue(null);
    processingCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-07-11T00:00:00.000Z",
      hits: 0
    }));

    const result = await service.processTilesBatch([
      { tileId: "tile_sic11_a00_00" },
      { tileId: "tile_sic11_a01_02" }
    ]);

    expect(result.items).toHaveLength(2);
    for (const item of result.items) {
      expect(item.status).toBe("ready");
      expect(item.result?.tile.sourceAsset).toMatchObject({
        extension: "mdl",
        role: "mdl_source",
        origin: "module-snapshot"
      });
      expect(item.result?.tile.renderAssetContract?.modelAsset).toMatchObject({
        extension: "glb",
        contentType: "model/gltf-binary",
        deliveryUrl: expect.stringContaining("/api/v1/catalog/tiles/cache/")
      });
      expect(item.result?.tile.renderAssetContract?.modelDeliveryStatus).toBe("ready");
      expect(item.result?.tile.renderAssetContract?.rendererHandoffStatus).toBe("ready");
    }
  });

  it("processTile bypassCache=true refreshes source-backed tile models missing derived GLB", async () => {
    const sourceOnlyTile = {
      ...buildTile("tile_tno01_a01_01"),
      resref: "tno01_a01_01",
      sourceAssetObjectKey: "modules/current/__aurora/sources/vanilla/models/tno01_a01_01.mdl",
      sourceAssetExtension: "mdl",
      sourceAssetSizeBytes: 1024,
      sourceAssetOrigin: "module-snapshot" as const
    };
    const renderReadyTile = {
      ...sourceOnlyTile,
      renderModelObjectKey: "modules/current/__aurora/derived/models/tno01_a01_01.glb",
      renderModelExtension: "glb" as const,
      renderModelSizeBytes: 4096,
      renderModelEtag: "glb1"
    };
    const syncVanillaTileModelSources = jest.fn().mockResolvedValue({
      uploadedFiles: 2
    });
    repository.refreshSnapshot = jest.fn();
    repository.findById
      .mockResolvedValueOnce(sourceOnlyTile)
      .mockResolvedValueOnce(renderReadyTile);
    processingCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-05-25T11:00:00.000Z",
      hits: 0
    }));
    const serviceWithSync = new TilesApplicationService(
      repository,
      processingCache,
      undefined,
      undefined,
      undefined,
      { syncVanillaTileModelSources } as unknown as RuntimeSettingsApplicationService
    );

    const result = await serviceWithSync.processTile({
      tileId: "tile_tno01_a01_01",
      bypassCache: true
    });

    expect(syncVanillaTileModelSources).toHaveBeenCalledWith(
      "areas-tile-process-auto-sync",
      ["tno01_a01_01"]
    );
    expect(repository.refreshSnapshot).toHaveBeenCalledTimes(2);
    expect(result.tile.renderAssetContract?.modelDeliveryStatus).toBe("ready");
    expect(result.tile.renderAssetContract?.modelAsset?.objectKey).toBe(
      "modules/current/__aurora/derived/models/tno01_a01_01.glb"
    );
  });

  it("regenerates source-backed tile GLB when the stored derived model uses an old converter", async () => {
    const tile = {
      ...buildTile("tile_sic11_a01_07"),
      resref: "sic11_a01_07",
      sourceAssetObjectKey: "modules/current/__aurora/sources/hak/_sic11/sic11_a01_07.mdl",
      sourceAssetExtension: "mdl",
      sourceAssetSizeBytes: 8192,
      sourceAssetEtag: "mdl-old",
      sourceAssetOrigin: "module-snapshot" as const,
      renderModelObjectKey: "modules/current/__aurora/derived/models/sic11_a01_07.glb",
      renderModelExtension: "glb" as const,
      renderModelSizeBytes: 2048,
      renderModelEtag: "glb-v2"
    };
    repository.findById.mockResolvedValue(tile);
    processingCache.get.mockResolvedValue(null);
    processingCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-05-25T11:00:00.000Z",
      hits: 0
    }));
    const runtimeSettingsRepository = createRuntimeSettingsRepository();
    const moduleBlobStorage = createModuleBlobStorage();
    moduleBlobStorage.putModuleObject = jest.fn().mockResolvedValue({
      key: "modules/current/__aurora/derived/models/sic11_a01_07.glb",
      size: 4096,
      etag: "glb-v5"
    });
    const generatedBytes = buildGlbWithConverterVersion(AURORA_MDL_TO_GLB_CONVERTER_VERSION);
    const derivedAssetGenerator: jest.Mocked<DerivedAssetGeneratorPort> = {
      generateDerivedAssets: jest.fn().mockResolvedValue({
        files: [
          {
            fileName: "__aurora/derived/models/sic11_a01_07.glb",
            resourceType: 0,
            bytes: generatedBytes
          }
        ],
        summary: {
          generator: "test",
          generatedFiles: 1,
          generatedBytes: generatedBytes.length
        }
      })
    };
    moduleBlobStorage.getModuleObject.mockImplementation(async (_settings, key) => {
      if (key.endsWith(".glb")) {
        const bytes = buildGlbWithConverterVersion("aurora-mdl-to-glb/v2-material-scoped-primitives");
        return {
          key,
          size: bytes.length,
          contentType: "model/gltf-binary",
          etag: "glb-v2",
          bytes
        };
      }
      return {
        key,
        size: 8192,
        contentType: "application/octet-stream",
        etag: "mdl-old",
        bytes: Buffer.from("#MAXMODEL ASCII\r\nnewmodel sic11_a01_07\r\nendmodel sic11_a01_07\r\n", "latin1")
      };
    });
    const serviceWithGenerator = new TilesApplicationService(
      repository,
      processingCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage,
      undefined,
      derivedAssetGenerator
    );

    const result = await serviceWithGenerator.processTile({
      tileId: "tile_sic11_a01_07",
      bypassCache: false
    });

    expect(derivedAssetGenerator.generateDerivedAssets).toHaveBeenCalledWith(
      expect.objectContaining({
        settingsRevision: 1,
        modulePrefix: "modules/current",
        sourceFiles: [
          expect.objectContaining({
            fileName: tile.sourceAssetObjectKey,
            resourceType: 0
          })
        ]
      })
    );
    expect(moduleBlobStorage.putModuleObject).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        fileName: "__aurora/derived/models/sic11_a01_07.glb"
      })
    );
    expect(result.tile.renderAssetContract?.modelAsset).toMatchObject({
      objectKey: "modules/current/__aurora/derived/models/sic11_a01_07.glb",
      extension: "glb",
      sizeBytes: 4096,
      etag: "glb-v5"
    });
  });

  it("keeps a source-backed tile GLB when the stored derived model uses the current converter", async () => {
    const tile = {
      ...buildTile("tile_sic11_a01_07"),
      resref: "sic11_a01_07",
      sourceAssetObjectKey: "modules/current/__aurora/sources/hak/_sic11/sic11_a01_07.mdl",
      sourceAssetExtension: "mdl",
      sourceAssetSizeBytes: 8192,
      sourceAssetEtag: "mdl-current",
      sourceAssetOrigin: "module-snapshot" as const,
      renderModelObjectKey: "modules/current/__aurora/derived/models/sic11_a01_07.glb",
      renderModelExtension: "glb" as const,
      renderModelSizeBytes: 4096,
      renderModelEtag: "glb-v5"
    };
    repository.findById.mockResolvedValue(tile);
    processingCache.get.mockResolvedValue(null);
    processingCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-05-25T11:00:00.000Z",
      hits: 0
    }));
    const runtimeSettingsRepository = createRuntimeSettingsRepository();
    const moduleBlobStorage = createModuleBlobStorage();
    moduleBlobStorage.putModuleObject = jest.fn();
    moduleBlobStorage.getModuleObject.mockResolvedValue({
      key: tile.renderModelObjectKey,
      size: 4096,
      contentType: "model/gltf-binary",
      etag: "glb-v5",
      bytes: buildGlbWithConverterVersion(AURORA_MDL_TO_GLB_CONVERTER_VERSION)
    });
    const derivedAssetGenerator: jest.Mocked<DerivedAssetGeneratorPort> = {
      generateDerivedAssets: jest.fn()
    };
    const serviceWithGenerator = new TilesApplicationService(
      repository,
      processingCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage,
      undefined,
      derivedAssetGenerator
    );

    const result = await serviceWithGenerator.processTile({
      tileId: "tile_sic11_a01_07",
      bypassCache: false
    });

    expect(derivedAssetGenerator.generateDerivedAssets).not.toHaveBeenCalled();
    expect(moduleBlobStorage.putModuleObject).not.toHaveBeenCalled();
    expect(result.tile.renderAssetContract?.modelAsset).toMatchObject({
      objectKey: tile.renderModelObjectKey,
      extension: "glb",
      sizeBytes: 4096,
      etag: "glb-v5"
    });
  });

  it("regenerates source-backed tile GLB when current converter output exceeds tile footprint", async () => {
    const tile = {
      ...buildTile("tile_sic11_a01_07"),
      resref: "sic11_a01_07",
      sourceAssetObjectKey: "modules/current/__aurora/sources/hak/_sic11/sic11_a01_07.mdl",
      sourceAssetExtension: "mdl",
      sourceAssetSizeBytes: 8192,
      sourceAssetEtag: "mdl-current",
      sourceAssetOrigin: "module-snapshot" as const,
      renderModelObjectKey: "modules/current/__aurora/derived/models/sic11_a01_07.glb",
      renderModelExtension: "glb" as const,
      renderModelSizeBytes: 4096,
      renderModelEtag: "glb-wide"
    };
    repository.findById.mockResolvedValue(tile);
    processingCache.get.mockResolvedValue(null);
    processingCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-05-25T11:00:00.000Z",
      hits: 0
    }));
    const runtimeSettingsRepository = createRuntimeSettingsRepository();
    const moduleBlobStorage = createModuleBlobStorage();
    moduleBlobStorage.putModuleObject = jest.fn().mockResolvedValue({
      key: "modules/current/__aurora/derived/models/sic11_a01_07.glb",
      size: 4096,
      etag: "glb-v5"
    });
    const generatedBytes = buildGlbWithConverterVersion(AURORA_MDL_TO_GLB_CONVERTER_VERSION);
    const derivedAssetGenerator: jest.Mocked<DerivedAssetGeneratorPort> = {
      generateDerivedAssets: jest.fn().mockResolvedValue({
        files: [
          {
            fileName: "__aurora/derived/models/sic11_a01_07.glb",
            resourceType: 0,
            bytes: generatedBytes
          }
        ],
        summary: {
          generator: "test",
          generatedFiles: 1,
          generatedBytes: generatedBytes.length
        }
      })
    };
    moduleBlobStorage.getModuleObject.mockImplementation(async (_settings, key) => {
      if (key.endsWith(".glb")) {
        const bytes = buildGlbWithConverterVersion(AURORA_MDL_TO_GLB_CONVERTER_VERSION, {
          min: [-5.0001, -0.0045, -7.301],
          max: [8.0894, 4.6677, 5.0001]
        });
        return {
          key,
          size: bytes.length,
          contentType: "model/gltf-binary",
          etag: "glb-wide",
          bytes
        };
      }
      return {
        key,
        size: 8192,
        contentType: "application/octet-stream",
        etag: "mdl-current",
        bytes: Buffer.from("#MAXMODEL ASCII\r\nnewmodel sic11_a01_07\r\nendmodel sic11_a01_07\r\n", "latin1")
      };
    });
    const serviceWithGenerator = new TilesApplicationService(
      repository,
      processingCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage,
      undefined,
      derivedAssetGenerator
    );

    const result = await serviceWithGenerator.processTile({
      tileId: "tile_sic11_a01_07",
      bypassCache: false
    });

    expect(derivedAssetGenerator.generateDerivedAssets).toHaveBeenCalled();
    expect(moduleBlobStorage.putModuleObject).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        fileName: "__aurora/derived/models/sic11_a01_07.glb"
      })
    );
    expect(result.tile.renderAssetContract?.modelAsset).toMatchObject({
      objectKey: "modules/current/__aurora/derived/models/sic11_a01_07.glb",
      extension: "glb",
      sizeBytes: 4096,
      etag: "glb-v5"
    });
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

  it("returns processed tile texture payload from blob storage", async () => {
    const runtimeSettingsRepository = createRuntimeSettingsRepository();
    const moduleBlobStorage = createModuleBlobStorage();
    const serviceWithBlob = new TilesApplicationService(
      repository,
      processingCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage
    );
    const cached = buildProcessedTileResult("tile_city_street_001");

    processingCache.get.mockResolvedValue({
      key: "a".repeat(64),
      value: cached,
      storedAt: "2026-05-25T11:00:00.000Z",
      hits: 3
    });
    moduleBlobStorage.getModuleObject.mockResolvedValue({
      key: cached.textureAtlas.objectKey ?? "modules/current/tiles/atlases/atlas_tile_city_v1.webp",
      size: cached.textureAtlas.sizeBytes ?? 262144,
      contentType: cached.textureAtlas.contentType ?? "image/webp",
      etag: cached.textureAtlas.etag,
      bytes: Buffer.from([0x01, 0x02, 0x03])
    });

    const result = await serviceWithBlob.getProcessedTileTexture("a".repeat(64));

    expect(result.cacheKey).toBe("a".repeat(64));
    expect(result.textureAtlas.atlasId).toBe(cached.textureAtlas.atlasId);
    expect(result.payload.size).toBe(cached.textureAtlas.sizeBytes);
    expect(moduleBlobStorage.getModuleObject).toHaveBeenCalledWith(
      expect.objectContaining({
        bucket: "aurora-module-assets"
      }),
      cached.textureAtlas.objectKey
    );
  });

  it("builds proxy tile texture delivery contract for cached tile", async () => {
    const runtimeSettingsRepository = createRuntimeSettingsRepository();
    const moduleBlobStorage = createModuleBlobStorage();
    const serviceWithBlob = new TilesApplicationService(
      repository,
      processingCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage
    );
    const cached = buildProcessedTileResult("tile_city_street_001");

    processingCache.get.mockResolvedValue({
      key: "a".repeat(64),
      value: cached,
      storedAt: "2026-05-25T11:00:00.000Z",
      hits: 3
    });

    const result = await serviceWithBlob.getProcessedTileTextureDelivery("a".repeat(64), "proxy");

    expect(result.textureAtlas.mode).toBe("proxy");
    expect(result.textureAtlas.proxyPath).toBe(
      `/api/v1/catalog/tiles/cache/${"a".repeat(64)}/textures`
    );
    expect(result.textureAtlas.s3Url).toBe(
      `s3://aurora-module-assets/${cached.textureAtlas.objectKey}`
    );
    expect(result.textureAtlas.directUrl).toBeUndefined();
  });

  it("builds direct tile texture delivery contract for cached tile", async () => {
    const runtimeSettingsRepository = createRuntimeSettingsRepository();
    const moduleBlobStorage = createModuleBlobStorage();
    const serviceWithBlob = new TilesApplicationService(
      repository,
      processingCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage
    );
    const cached = buildProcessedTileResult("tile_city_street_001");

    processingCache.get.mockResolvedValue({
      key: "a".repeat(64),
      value: cached,
      storedAt: "2026-05-25T11:00:00.000Z",
      hits: 3
    });

    const result = await serviceWithBlob.getProcessedTileTextureDelivery("a".repeat(64), "direct");

    expect(result.textureAtlas.mode).toBe("direct");
    expect(result.textureAtlas.directUrl).toBe(
      `http://seaweedfs:8333/aurora-module-assets/${encodeURIComponent("modules")}/${encodeURIComponent("current")}/${encodeURIComponent("tiles")}/${encodeURIComponent("atlases")}/${encodeURIComponent("atlas_tile_city_v1.webp")}`
    );
  });

  it("rejects direct tile delivery when blob settings are unavailable", async () => {
    const cached = buildProcessedTileResult("tile_city_street_001");
    processingCache.get.mockResolvedValue({
      key: "a".repeat(64),
      value: cached,
      storedAt: "2026-05-25T11:00:00.000Z",
      hits: 3
    });

    await expect(
      service.getProcessedTileTextureDelivery("a".repeat(64), "direct")
    ).rejects.toMatchObject({
      code: "TILE_DIRECT_DELIVERY_UNAVAILABLE"
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
      message: "Tile was not found. Tile id is not a model-resref catalog candidate."
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

  it("collects texture slots from binary Aurora MDL tile models", () => {
    const bytes = buildMinimalBinaryAuroraTileMdl([
      "tni01_lwalls",
      "tno01_planks02",
      "tni02_grad01"
    ]);

    expect(__tilesApplicationServiceInternals.collectTileMdlTextureReferences(bytes)).toEqual([
      "tni01_lwalls",
      "tni02_grad01",
      "tno01_planks02"
    ]);
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
    textureAtlasObjectKey: "modules/current/tiles/atlases/atlas_tile_city_v1.webp",
    textureAtlasContentType: "image/webp",
    textureAtlasSizeBytes: 262144,
    textureAtlasEtag: "atlas-city-v1",
    textureAtlasFingerprint: "static:atlas:tile_city_v1",
    walkmesh: "walkable",
    metrics: {
      triangles: 1240,
      meshes: 18,
      emitters: 0
    },
    updatedAt: "2026-05-25T00:00:00.000Z"
  };
}

function buildProcessedTileResult(tileId: string): TileProcessingResult {
  const tile = buildTile(tileId);
  return {
    tileId: tile.tileId,
    resref: tile.resref,
    name: tile.name,
    tileset: tile.tileset,
    variant: tile.variant,
    tags: tile.tags,
    benchmark: tile.benchmark,
    previewImageUrl: tile.previewImageUrl,
    textureAtlas: {
      atlasId: tile.textureAtlasId,
      cacheKey: `${tile.textureAtlasId}:${tile.tileId}`,
      strategy: "blob-cache",
      objectKey: tile.textureAtlasObjectKey,
      contentType: tile.textureAtlasContentType,
      sizeBytes: tile.textureAtlasSizeBytes,
      etag: tile.textureAtlasEtag
    },
    walkmesh: tile.walkmesh,
    metrics: tile.metrics,
    render: {
      backendType: "tile",
      frontendType: "tile",
      rendererPreset: "tile-standard"
    },
    updatedAt: tile.updatedAt,
    processedAt: "2026-05-25T10:59:00.000Z"
  };
}

function buildMinimalBinaryAuroraTileMdl(textureSlots: string[]): Buffer {
  const binaryModelBase = 12;
  const rootNodeOffset = 200;
  const rootNodeAbsOffset = binaryModelBase + rootNodeOffset;
  const rawDataOffset = 1024;
  const rawBase = binaryModelBase + rawDataOffset;
  const faceTableOffset = 600;
  const textureVertexOffset = 64;
  const bytes = Buffer.alloc(rawBase + 256);

  bytes.writeUInt32LE(0, 0);
  bytes.writeUInt32LE(rawDataOffset, 4);
  bytes.writeUInt32LE(256, 8);
  writeCString(bytes, binaryModelBase + 8, 64, "tile_test");
  bytes.writeUInt32LE(rootNodeOffset, binaryModelBase + 72);

  bytes.writeInt32LE(0, rootNodeAbsOffset + 28);
  writeCString(bytes, rootNodeAbsOffset + 32, 32, "mesh");
  writeArrayHeader(bytes, rootNodeAbsOffset + 72, 0, 0, 0);
  writeArrayHeader(bytes, rootNodeAbsOffset + 84, 0, 0, 0);
  writeArrayHeader(bytes, rootNodeAbsOffset + 96, 0, 0, 0);
  bytes.writeUInt32LE(0x20, rootNodeAbsOffset + 108);

  writeArrayHeader(bytes, rootNodeAbsOffset + 120, faceTableOffset, 1, 1);
  bytes.writeUInt32LE(1, rootNodeAbsOffset + 220);
  textureSlots.slice(0, 3).forEach((texture, index) => {
    writeCString(bytes, rootNodeAbsOffset + 232 + index * 64, 64, texture);
  });
  bytes.writeUInt32LE(0, rootNodeAbsOffset + 556);
  bytes.writeUInt16LE(3, rootNodeAbsOffset + 560);
  bytes.writeUInt32LE(textureVertexOffset, rootNodeAbsOffset + 564);
  bytes.writeUInt32LE(0xffffffff, rootNodeAbsOffset + 568);
  bytes.writeUInt32LE(0xffffffff, rootNodeAbsOffset + 572);
  bytes.writeUInt32LE(0xffffffff, rootNodeAbsOffset + 576);

  writeFloatTriplet(bytes, rawBase, [0, 0, 0]);
  writeFloatTriplet(bytes, rawBase + 12, [1, 0, 0]);
  writeFloatTriplet(bytes, rawBase + 24, [0, 1, 0]);
  writeFloatPair(bytes, rawBase + textureVertexOffset, [0, 0]);
  writeFloatPair(bytes, rawBase + textureVertexOffset + 8, [1, 0]);
  writeFloatPair(bytes, rawBase + textureVertexOffset + 16, [0, 1]);

  const faceIndexOffset = binaryModelBase + faceTableOffset + 26;
  bytes.writeUInt16LE(0, faceIndexOffset);
  bytes.writeUInt16LE(1, faceIndexOffset + 2);
  bytes.writeUInt16LE(2, faceIndexOffset + 4);
  return bytes;
}

function writeArrayHeader(
  bytes: Buffer,
  offset: number,
  arrayOffset: number,
  count: number,
  allocated: number
): void {
  bytes.writeUInt32LE(arrayOffset, offset);
  bytes.writeUInt32LE(count, offset + 4);
  bytes.writeUInt32LE(allocated, offset + 8);
}

function writeCString(bytes: Buffer, offset: number, length: number, value: string): void {
  bytes.write(value, offset, Math.max(0, length - 1), "ascii");
}

function writeFloatTriplet(bytes: Buffer, offset: number, value: [number, number, number]): void {
  bytes.writeFloatLE(value[0], offset);
  bytes.writeFloatLE(value[1], offset + 4);
  bytes.writeFloatLE(value[2], offset + 8);
}

function writeFloatPair(bytes: Buffer, offset: number, value: [number, number]): void {
  bytes.writeFloatLE(value[0], offset);
  bytes.writeFloatLE(value[1], offset + 4);
}

function buildGlbWithConverterVersion(
  converterVersion: string,
  bounds: { min: [number, number, number]; max: [number, number, number] } = {
    min: [-5, 0, -5],
    max: [5, 1, 5]
  }
): Buffer {
  const json = {
    asset: {
      version: "2.0",
      generator: `aurora-web aurora-mdl-to-glb ${converterVersion}`
    },
    meshes: [
      {
        primitives: [
          {
            attributes: {
              POSITION: 0
            }
          }
        ]
      }
    ],
    accessors: [
      {
        min: bounds.min,
        max: bounds.max
      }
    ],
    extras: {
      aurora: {
        converterVersion
      }
    }
  };
  const jsonBytes = Buffer.from(JSON.stringify(json), "utf-8");
  const jsonPadding = (4 - (jsonBytes.length % 4)) % 4;
  const jsonChunk = Buffer.concat([jsonBytes, Buffer.alloc(jsonPadding, 0x20)]);
  const glb = Buffer.alloc(20 + jsonChunk.length);
  glb.writeUInt32LE(0x46546c67, 0);
  glb.writeUInt32LE(2, 4);
  glb.writeUInt32LE(glb.length, 8);
  glb.writeUInt32LE(jsonChunk.length, 12);
  glb.writeUInt32LE(0x4e4f534a, 16);
  jsonChunk.copy(glb, 20);
  return glb;
}

function createRuntimeSettingsRepository(): jest.Mocked<RuntimeSettingsRepositoryPort> {
  return {
    get: jest.fn().mockResolvedValue({
      revision: 1,
      updatedAt: "2026-05-25T00:00:00.000Z",
      updatedBy: "test",
      paths: {
        vanillaDataPath: "",
        hakDirectoryPath: "",
        moduleDecompiledPath: "",
        modulePackedPath: "",
        tlkBasePath: "",
        tlkCustomPath: ""
      },
      blobStorage: {
        endpoint: "http://seaweedfs:8333",
        region: "us-east-1",
        bucket: "aurora-module-assets",
        modulePrefix: "modules/current",
        accessKeyId: "seaweedfs",
        secretAccessKey: "secret",
        forcePathStyle: true
      },
      telemetryDebugMode: "off",
      hakProfiles: {},
      sources: {
        placeable: {
          includeModuleTemp0: true,
          includeModulePacked: false,
          includeHaks: false,
          includeVanilla: false,
          hakProfileId: "",
          hakPriorityList: []
        },
        tile: {
          includeModuleTemp0: true,
          includeModulePacked: false,
          includeHaks: false,
          includeVanilla: false,
          hakProfileId: "",
          hakPriorityList: []
        },
        area: {
          includeModuleTemp0: true,
          includeModulePacked: false,
          includeHaks: false,
          includeVanilla: false,
          hakProfileId: "",
          hakPriorityList: []
        },
        sound: {
          includeModuleTemp0: true,
          includeModulePacked: false,
          includeHaks: false,
          includeVanilla: false,
          hakProfileId: "",
          hakPriorityList: []
        }
      },
      benchmarkCandidates: {
        placeableHeavyNoVfx: {
          resref: "",
          metrics: { triangles: 0, meshes: 0, emitters: 0 },
          context: { source: "test" }
        },
        placeableHeavyVfx: {
          resref: "",
          metrics: { triangles: 0, meshes: 0, emitters: 0 },
          context: { source: "test" }
        },
        placeableVfxPlcAlternative: {
          resref: "",
          metrics: { triangles: 0, meshes: 0, emitters: 0 },
          context: { source: "test" }
        },
        doorHeavyInstance: {
          resref: "",
          metrics: { triangles: 0, meshes: 0, emitters: 0 },
          context: { source: "test" }
        },
        doorHeavySingleMesh: {
          resref: "",
          metrics: { triangles: 0, meshes: 0, emitters: 0 },
          context: { source: "test" }
        }
      }
    }),
    save: jest.fn()
  };
}

function createModuleBlobStorage(): jest.Mocked<ModuleBlobStoragePort> {
  return {
    replaceModuleSnapshot: jest.fn(),
    listModuleSnapshot: jest.fn(),
    getModuleObject: jest.fn()
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
