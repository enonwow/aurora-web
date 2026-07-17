import { AppException } from "../../src/common/http/app-exception";
import { AreasApplicationService } from "../../src/modules/areas/application/areas.application.service";
import type { ModuleBlobStoragePort } from "../../src/modules/runtime-settings/application/ports/module-blob-storage.port";
import type { RuntimeSettingsRepositoryPort } from "../../src/modules/runtime-settings/application/ports/runtime-settings-repository.port";
import type { AreaProcessingCachePort } from "../../src/modules/areas/application/ports/area-processing-cache.port";
import type { AreaRepositoryPort } from "../../src/modules/areas/application/ports/area-repository.port";
import type { CatalogApplicationService } from "../../src/modules/catalog/application/catalog.application.service";
import type {
  AreaObjectCounts,
  AreaListResult,
  AreaProcessingResult,
  AreaRecord
} from "../../src/modules/areas/domain/area.types";
import {
  parseAreaMetadataFromAreGff,
  parseAreaObjectsFromGitGff
} from "../../src/modules/areas/adapters/outbound/blob/aurora-gff-area-parser";

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
          objectCounts: buildObjectCounts({
            placeables: 1,
            creatures: 1,
            items: 1,
            total: 3
          }),
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
    expect(response).toEqual({
      ...result,
      items: [
        {
          ...result.items[0],
          previewImageUrl: "/api/v1/areas/area_test_001/thumbnail"
        }
      ]
    });
  });

  it("reuses in-memory area list cache for repeated identical queries", async () => {
    const result: AreaListResult = {
      items: [buildAreaListItem("area_cached_001")],
      total: 1,
      limit: 100,
      offset: 0
    };
    repository.list.mockResolvedValue(result);

    const first = await service.listAreas({ limit: 100, offset: 0 });
    const second = await service.listAreas({ limit: 100, offset: 0 });

    expect(repository.list).toHaveBeenCalledTimes(1);
    expect(second).toBe(first);
    expect(first.items[0].previewImageUrl).toBe("/api/v1/areas/area_cached_001/thumbnail");
  });

  it("deduplicates concurrent identical area list requests", async () => {
    const result: AreaListResult = {
      items: [buildAreaListItem("area_concurrent_001")],
      total: 1,
      limit: 100,
      offset: 0
    };
    repository.list.mockResolvedValue(result);

    const [first, second] = await Promise.all([
      service.listAreas({ limit: 100, offset: 0 }),
      service.listAreas({ limit: 100, offset: 0 })
    ]);

    expect(repository.list).toHaveBeenCalledTimes(1);
    expect(second).toBe(first);
    expect(first.items[0].previewImageUrl).toBe("/api/v1/areas/area_concurrent_001/thumbnail");
  });

  it("expires in-memory area list cache after ttl", async () => {
    const firstResult: AreaListResult = {
      items: [buildAreaListItem("area_cached_001")],
      total: 1,
      limit: 100,
      offset: 0
    };
    const secondResult: AreaListResult = {
      items: [buildAreaListItem("area_cached_002")],
      total: 1,
      limit: 100,
      offset: 0
    };
    repository.list.mockResolvedValueOnce(firstResult).mockResolvedValueOnce(secondResult);

    let now = 1_000;
    const dateNowSpy = jest.spyOn(Date, "now").mockImplementation(() => now);
    const first = await service.listAreas({ limit: 100, offset: 0 });
    now += 61_000;
    const second = await service.listAreas({ limit: 100, offset: 0 });
    dateNowSpy.mockRestore();

    expect(repository.list).toHaveBeenCalledTimes(2);
    expect(first.items[0].previewImageUrl).toBe("/api/v1/areas/area_cached_001/thumbnail");
    expect(second.items[0].previewImageUrl).toBe("/api/v1/areas/area_cached_002/thumbnail");
  });

  it("builds area lighting evidence from all listed areas", async () => {
    const catalogService = {
      listPlaceables: jest.fn().mockResolvedValue({
        items: [
          {
            templateId: "plc_magic_yellow",
            kind: "placeable",
            placeableSubtype: "light_source",
            resref: "plc_magic_yellow",
            name: "Magic Yellow",
            category: "light",
            tags: ["light_source"],
            previewImageUrl: "/api/v1/catalog/placeables/plc_magic_yellow/thumbnail",
            metadata: {
              source2daLightColorRaw: "7",
              source2daLightColorRow: 7,
              source2daLightColorLabel: "Yellow",
              source2daLightOffsetZ: 4,
              lightState: 2,
              modelResRef: "plc_u07"
            }
          }
        ],
        total: 1,
        limit: 1000,
        offset: 0
      }),
      processPlaceablesBatch: jest.fn().mockResolvedValue({
        items: [
          {
            cache: {
              key: "cache_plc_magic_yellow",
              hit: false,
              storedAt: "2026-06-28T00:00:00.000Z",
              hits: 0
            },
            placeable: {
              templateId: "plc_magic_yellow",
              renderPackage: {
                auroraLight: {
                  source: "source-mdl",
                  diagnostics: [],
                  lights: [
                    {
                      source: "aurora-mdl-ascii",
                      sourceModelAssetId: "asset_plc_u07",
                      sourceModelFileName: "plc_u07.mdl",
                      sourceModelObjectKey: "modules/current/models/plc_u07.mdl",
                      nodeName: "light01",
                      sourceNodeKind: "placeablelight",
                      transform: {
                        position: [0, 0, 1.25],
                        scale: 1
                      },
                      radius: 6,
                      color: [1, 0.85, 0.15],
                      shadow: true,
                      lightPriority: 3,
                      animations: [
                        {
                          animationName: "default"
                        }
                      ]
                    }
                  ]
                }
              }
            }
          }
        ]
      })
    } as unknown as jest.Mocked<CatalogApplicationService>;
    const serviceWithCatalog = new AreasApplicationService(
      repository,
      processingCache,
      undefined,
      undefined,
      undefined,
      catalogService
    );
    const area: AreaRecord = {
      ...buildArea("area_light_001"),
      tiles: [
        {
          tileInstanceId: "area_light_001:tile:0",
          areaId: "area_light_001",
          tilesetResRef: "tno01",
          row: 0,
          col: 0,
          tileIndex: 0,
          tileId: 101,
          source: "are-tile-list",
          mainLight1: 3,
          mainLight1Color: { rowId: 3, red: 1, green: 0.75, blue: 0.25 },
          sourceLight1: 5,
          sourceLight1Color: { rowId: 5, red: 0.25, green: 0.5, blue: 1 }
        }
      ],
      objects: [
        {
          objectId: "obj_torch_001",
          kind: "placeable",
          templateId: "plc_wall_torch",
          resRef: "plc_wall_torch",
          x: 1,
          y: 2,
          z: 0,
          bearing: 0
        }
      ]
    };
    repository.list.mockResolvedValue({
      items: [buildAreaListItem(area.areaId)],
      total: 1,
      limit: 1000,
      offset: 0
    });
    repository.findById.mockResolvedValue(area);

    const report = await serviceWithCatalog.getAreaLightingEvidence();

    expect(repository.list).toHaveBeenCalledWith({ limit: 1000, offset: 0 });
    expect(repository.findById).toHaveBeenCalledWith("area_light_001");
    expect(catalogService.listPlaceables).toHaveBeenCalledWith({
      subtype: "light_source",
      limit: 1000,
      offset: 0
    });
    expect(catalogService.processPlaceablesBatch).toHaveBeenCalledWith([
      {
        templateId: "plc_magic_yellow",
        resref: "plc_magic_yellow",
        bypassCache: false,
        includeBenchmarkMetadata: false
      }
    ]);
    expect(report.summary).toMatchObject({
      areasScanned: 1,
      tileLightTiles: 1,
      tileLightReferences: 2,
      placeableNameCandidates: 1,
      catalogLightSourceTemplates: 1,
      catalogLightColorTemplates: 1,
      catalogLightStateTemplates: 1,
      processedMdlLightTemplatesScanned: 1,
      processedMdlLightSourceTemplates: 1,
      processedMdlLightNodes: 1,
      processedMdlLightScanLimit: 24,
      auroraActiveLightSlotCap: 128,
      rendererCandidateLights: 5,
      rendererAcceptedLights: 5,
      rendererDroppedLights: 0,
      shadowDiagnosticEntries: 1,
      shadowMdlLightNodes: 1,
      shadowCatalogShadowSizeTemplates: 0
    });
    expect(report.tileLights[0]).toMatchObject({
      areaId: "area_light_001",
      mainLight1: 3,
      sourceLight1: 5
    });
    expect(report.placeableNameCandidates[0]).toMatchObject({
      objectId: "obj_torch_001",
      matchedTokens: expect.arrayContaining(["torch"])
    });
    expect(report.catalogLightSources[0]).toMatchObject({
      templateId: "plc_magic_yellow",
      evidence: expect.arrayContaining(["placeables.2da.LightColor", "utp.LightState"]),
      source2daLightColorRow: 7,
      source2daLightOffsetZ: 4,
      lightState: 2
    });
    expect(report.processedMdlLightSources[0]).toMatchObject({
      templateId: "plc_magic_yellow",
      cacheKey: "cache_plc_magic_yellow",
      nodes: [
        expect.objectContaining({
          nodeName: "light01",
          sourceNodeKind: "placeablelight",
          position: { x: 0, y: 0, z: 1.25 },
          scale: 1,
          radius: 6,
          quadraticAtten: 0.125,
          quadraticAttenSource:
            "C:/Projects/New Folder/export/decompiled_all.c:865404-865409 FUN_00a40b60 uploads lightQuadraticAtten = 9/(max(radius,0.1)^2*2)",
          quadraticAttenProofStatus: "source-backed-mdl-radius-quadratic-attenuation",
          auroraLightFieldParserSource: expect.stringContaining("FUN_00a5872c"),
          auroraLightFieldParserProofStatus: "source-backed-mdl-auroralight-field-parser",
          color: { red: 1, green: 0.85, blue: 0.15 },
          shadow: true,
          lightPriority: 3,
          animationNames: ["default"]
        })
      ]
    });
  });

  it("returns full area payload with composition counts", async () => {
    repository.findById.mockResolvedValue(
      buildArea("area_test_001", { lighting: buildAreaGlobalLighting() })
    );

    const detail = await service.getArea("area_test_001");

    expect(detail.areaId).toBe("area_test_001");
    expect(detail.textureAtlas.atlasId).toBe("atlas_urban_v1");
    expect(detail.textureAtlas.cacheKey).toBe("atlas_urban_v1:12x12");
    expect(detail.textureAtlas.strategy).toBe("blob-cache");
    expect(detail.textureAtlas.objectKey).toBe("modules/current/areas/atlases/atlas_urban_v1.webp");
    expect(detail.textureAtlas.contentType).toBe("image/webp");
    expect(detail.textureAtlas.sizeBytes).toBe(393216);
    expect(detail.previewImageUrl).toBe("/api/v1/areas/area_test_001/thumbnail");
    expect(detail.composition.placeables).toBe(1);
    expect(detail.composition.doors).toBe(0);
    expect(detail.composition.creatures).toBe(2);
    expect(detail.composition.items).toBe(1);
    expect(detail.composition.total).toBe(4);
    expect(detail.objects.length).toBe(4);
    expect(detail.lighting).toEqual({
      source: "are-root-fields",
      fields: [
        { field: "IsNight", value: 0 },
        { field: "SunShadows", value: 1 },
        { field: "MoonShadows", value: 0 },
        { field: "ShadowOpacity", value: 50 }
      ]
    });
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
    expect(preview.previewImageUrl).toBe("/api/v1/areas/area_test_001/thumbnail");
  });

  it("returns generated area thumbnail image payload", async () => {
    repository.findById.mockResolvedValue(
      buildArea("area_test_001", { lighting: buildAreaGlobalLighting() })
    );

    const thumbnail = await service.getAreaThumbnail("area_test_001");

    expect(thumbnail.contentType).toBe("image/svg+xml; charset=utf-8");
    expect(thumbnail.fileName).toBe("area_test_001.svg");
    expect(thumbnail.bytes.toString("utf-8")).toContain("Test Area");
    expect(thumbnail.etag).toMatch(/^W\/"/u);
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
    repository.findById.mockResolvedValue(
      buildArea("area_test_001", { lighting: buildAreaGlobalLighting() })
    );
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
    expect(result.area.tileSet).toBe("tno01");
    expect(result.area.tiles).toEqual([
      expect.objectContaining({
        tileInstanceId: "area_test_001:tile:0",
        tilesetResRef: "tno01",
        row: 0,
        col: 0,
        tileIndex: 0,
        tileId: 101,
        modelResRef: "tno01_a01_01",
        source: "are-tile-list"
      }),
      expect.objectContaining({
        tileInstanceId: "area_test_001:tile:1",
        tilesetResRef: "tno01",
        row: 0,
        col: 1,
        tileIndex: 1,
        fallbackReason: "tile-model-reference-missing"
      })
    ]);
    expect(result.area.processedAt).toEqual(expect.any(String));
    expect(result.area.lighting).toEqual(buildAreaGlobalLighting());
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
        strategy: "blob-cache",
        objectKey: "modules/current/areas/atlases/atlas_urban_v1.webp",
        contentType: "image/webp",
        sizeBytes: 393216,
        etag: "atlas-urban-v1"
      },
      soundscape: buildAreaSoundscape(),
      composition: buildObjectCounts({
        placeables: 1,
        creatures: 2,
        items: 1,
        total: 4
      }),
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
    expect(result.area.previewImageUrl).toBe("/api/v1/areas/area_test_001/thumbnail");
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
        strategy: "blob-cache",
        objectKey: "modules/current/areas/atlases/atlas_urban_v1.webp",
        contentType: "image/webp",
        sizeBytes: 393216,
        etag: "atlas-urban-v1"
      },
      soundscape: buildAreaSoundscape(),
      composition: buildObjectCounts({
        placeables: 1,
        creatures: 2,
        items: 1,
        total: 4
      }),
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
    expect(result.area.previewImageUrl).toBe("/api/v1/areas/area_test_001/thumbnail");
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
    expect(result.area.previewImageUrl).toBe("/api/v1/areas/area_test_001/thumbnail");
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
        strategy: "blob-cache",
        objectKey: "modules/current/areas/atlases/atlas_urban_v1.webp",
        contentType: "image/webp",
        sizeBytes: 393216,
        etag: "atlas-urban-v1"
      },
      soundscape: buildAreaSoundscape(),
      composition: buildObjectCounts({
        placeables: 1,
        creatures: 2,
        items: 1,
        total: 4
      }),
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
    expect(result.area.previewImageUrl).toBe("/api/v1/areas/area_test_001/thumbnail");
  });

  it("throws AREA_CACHE_NOT_FOUND when processed area key is missing", async () => {
    processingCache.get.mockResolvedValue(null);

    await expect(service.getProcessedArea("b".repeat(64))).rejects.toMatchObject({
      code: "AREA_CACHE_NOT_FOUND",
      message: "Area cache entry was not found."
    });
  });

  it("returns processed area texture payload from blob storage", async () => {
    const runtimeSettingsRepository = createRuntimeSettingsRepository();
    const moduleBlobStorage = createModuleBlobStorage();
    const serviceWithBlob = new AreasApplicationService(
      repository,
      processingCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage
    );
    const cached = buildProcessedAreaResult("area_test_001");

    processingCache.get.mockResolvedValue({
      key: "a".repeat(64),
      value: cached,
      storedAt: "2026-05-24T11:00:00.000Z",
      hits: 3
    });
    moduleBlobStorage.getModuleObject.mockResolvedValue({
      key: cached.textureAtlas.objectKey ?? "modules/current/areas/atlases/atlas_urban_v1.webp",
      size: cached.textureAtlas.sizeBytes ?? 393216,
      contentType: cached.textureAtlas.contentType ?? "image/webp",
      etag: cached.textureAtlas.etag,
      bytes: Buffer.from([0x01, 0x02, 0x03])
    });

    const result = await serviceWithBlob.getProcessedAreaTexture("a".repeat(64));

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

  it("builds proxy area texture delivery contract for cached area", async () => {
    const runtimeSettingsRepository = createRuntimeSettingsRepository();
    const moduleBlobStorage = createModuleBlobStorage();
    const serviceWithBlob = new AreasApplicationService(
      repository,
      processingCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage
    );
    const cached = buildProcessedAreaResult("area_test_001");
    processingCache.get.mockResolvedValue({
      key: "a".repeat(64),
      value: cached,
      storedAt: "2026-05-24T11:00:00.000Z",
      hits: 3
    });

    const result = await serviceWithBlob.getProcessedAreaTextureDelivery("a".repeat(64), "proxy");

    expect(result.textureAtlas.mode).toBe("proxy");
    expect(result.textureAtlas.proxyPath).toBe(`/api/v1/areas/cache/${"a".repeat(64)}/textures`);
    expect(result.textureAtlas.s3Url).toBe(
      `s3://aurora-module-assets/${cached.textureAtlas.objectKey}`
    );
    expect(result.textureAtlas.directUrl).toBeUndefined();
  });

  it("builds direct area texture delivery contract for cached area", async () => {
    const runtimeSettingsRepository = createRuntimeSettingsRepository();
    const moduleBlobStorage = createModuleBlobStorage();
    const serviceWithBlob = new AreasApplicationService(
      repository,
      processingCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage
    );
    const cached = buildProcessedAreaResult("area_test_001");
    processingCache.get.mockResolvedValue({
      key: "a".repeat(64),
      value: cached,
      storedAt: "2026-05-24T11:00:00.000Z",
      hits: 3
    });

    const result = await serviceWithBlob.getProcessedAreaTextureDelivery("a".repeat(64), "direct");

    expect(result.textureAtlas.mode).toBe("direct");
    expect(result.textureAtlas.directUrl).toBe(
      `http://seaweedfs:8333/aurora-module-assets/${encodeURIComponent("modules")}/${encodeURIComponent("current")}/${encodeURIComponent("areas")}/${encodeURIComponent("atlases")}/${encodeURIComponent("atlas_urban_v1.webp")}`
    );
  });

  it("rejects direct area delivery when blob settings are unavailable", async () => {
    const cached = buildProcessedAreaResult("area_test_001");
    processingCache.get.mockResolvedValue({
      key: "a".repeat(64),
      value: cached,
      storedAt: "2026-05-24T11:00:00.000Z",
      hits: 3
    });

    await expect(
      service.getProcessedAreaTextureDelivery("a".repeat(64), "direct")
    ).rejects.toMatchObject({
      code: "AREA_DIRECT_DELIVERY_UNAVAILABLE"
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

  it("exports placed item properties as parseable GIT ItemList bytes", async () => {
    const area = buildArea("area_item_export_001");
    area.objects = [
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
        objectId: "obj_itm_armor_001",
        kind: "item",
        templateId: "itm_hide_armor",
        resRef: "itm_hide_armor",
        tag: "ITM_HIDE_ARMOR",
        localizedName: "Placed Hide Armor",
        description: "Area item export proof",
        x: 5.5,
        y: 6.25,
        z: 0.5,
        bearing: 225,
        itemMetadata: {
          baseItem: 16,
          modelPart1: 66,
          modelPart2: 13,
          modelPart3: 63,
          bodyPartTorso: 43,
          leather1Color: 5,
          metal2Color: 8,
          identified: true,
          plot: true,
          "script.onused": "it_onuse",
          itemPropertyListEntries: JSON.stringify([
            {
              propertyName: 15,
              subtype: 66,
              costTable: 3,
              costValue: 1,
              param1: 255,
              param1Value: 0,
              chanceAppear: 100
            }
          ])
        }
      }
    ];
    repository.findById.mockResolvedValue(area);

    const exported = await service.getAreaItemGitExport(area.areaId);
    const parsed = parseAreaObjectsFromGitGff(exported.bytes);

    expect(exported).toMatchObject({
      areaId: "area_item_export_001",
      fileName: "area_item_export_001.items.git",
      contentType: "application/octet-stream",
      itemCount: 1
    });
    expect(exported.size).toBe(exported.bytes.length);
    expect(parsed?.items).toHaveLength(1);
    expect(parsed?.items[0]).toMatchObject({
      templateResRef: "itm_hide_armor",
      tag: "ITM_HIDE_ARMOR",
      localizedName: "Placed Hide Armor",
      description: "Area item export proof",
      x: 5.5,
      y: 6.25,
      z: 0.5,
      bearing: 225,
      itemMetadata: {
        baseItem: 16,
        modelPart1: 66,
        modelPart2: 13,
        modelPart3: 63,
        bodyPartTorso: 43,
        leather1Color: 5,
        metal2Color: 8,
        identified: true,
        plot: true,
        "script.onused": "it_onuse",
        itemPropertyListCount: 1
      }
    });
  });

  it("exports supported whole-area GIT root lists and ARE metadata bytes", async () => {
    const area = buildArea("area_whole_export_001", {
      lighting: buildAreaGlobalLighting()
    });
    repository.findById.mockResolvedValue(area);

    const git = await service.getAreaGitExport(area.areaId);
    const are = await service.getAreaAreExport(area.areaId);
    const parsedGit = parseAreaObjectsFromGitGff(git.bytes);
    const parsedAre = parseAreaMetadataFromAreGff(are.bytes);

    expect(git).toMatchObject({
      areaId: "area_whole_export_001",
      fileName: "area_whole_export_001.git",
      contentType: "application/octet-stream",
      objectCounts: {
        placeables: 1,
        creatures: 2,
        items: 1,
        total: 4
      }
    });
    expect(git.size).toBe(git.bytes.length);
    expect(parsedGit?.placeables).toHaveLength(1);
    expect(parsedGit?.creatures).toHaveLength(2);
    expect(parsedGit?.items).toHaveLength(1);

    expect(are).toMatchObject({
      areaId: "area_whole_export_001",
      fileName: "area_whole_export_001.are",
      contentType: "application/octet-stream",
      tileCount: 2
    });
    expect(are.size).toBe(are.bytes.length);
    expect(parsedAre).toMatchObject({
      name: "Test Area",
      tag: "area_whole_export_001",
      width: 12,
      height: 12,
      tileSet: "tno01"
    });
    expect(parsedAre?.tiles).toHaveLength(2);
  });
});

function buildArea(
  id: string,
  options: { lighting?: AreaRecord["lighting"] } = {}
): AreaRecord {
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
    textureAtlasObjectKey: "modules/current/areas/atlases/atlas_urban_v1.webp",
    textureAtlasContentType: "image/webp",
    textureAtlasSizeBytes: 393216,
    textureAtlasEtag: "atlas-urban-v1",
    textureAtlasFingerprint: "static:atlas:area_urban_v1",
    tileSet: "tno01",
    tiles: [
      {
        tileInstanceId: `${id}:tile:0`,
        areaId: id,
        tilesetResRef: "tno01",
        row: 0,
        col: 0,
        tileIndex: 0,
        tileId: 101,
        modelResRef: "tno01_a01_01",
        orientation: 1,
        height: 0.5,
        source: "are-tile-list"
      },
      {
        tileInstanceId: `${id}:tile:1`,
        areaId: id,
        tilesetResRef: "tno01",
        row: 0,
        col: 1,
        tileIndex: 1,
        tileId: 102,
        orientation: 2,
        source: "are-tile-list",
        fallbackReason: "tile-model-reference-missing"
      }
    ],
    ...(options.lighting ? { lighting: options.lighting } : {}),
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

function buildObjectCounts(overrides: Partial<AreaObjectCounts> = {}): AreaObjectCounts {
  return {
    placeables: 0,
    doors: 0,
    creatures: 0,
    encounters: 0,
    items: 0,
    sounds: 0,
    stores: 0,
    triggers: 0,
    waypoints: 0,
    total: 0,
    ...overrides
  };
}

function buildAreaGlobalLighting(): AreaRecord["lighting"] {
  return {
    source: "are-root-fields",
    fields: [
      { field: "IsNight", value: 0 },
      { field: "SunShadows", value: 1 },
      { field: "MoonShadows", value: 0 },
      { field: "ShadowOpacity", value: 50 }
    ]
  };
}

function buildAreaListItem(id: string): AreaListResult["items"][number] {
  const area = buildArea(id);
  return {
    areaId: area.areaId,
    name: area.name,
    biome: area.biome,
    width: area.width,
    height: area.height,
    tags: area.tags,
    benchmark: area.benchmark,
    previewImageUrl: area.previewImageUrl,
    textureAtlasId: area.textureAtlasId,
    objectCounts: buildObjectCounts({
      placeables: 1,
      creatures: 2,
      items: 1,
      total: 4
    }),
    updatedAt: area.updatedAt
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

function buildProcessedAreaResult(areaId: string): AreaProcessingResult {
  const area = buildArea(areaId);
  return {
    areaId: area.areaId,
    name: area.name,
    biome: area.biome,
    width: area.width,
    height: area.height,
    tags: area.tags,
    benchmark: area.benchmark,
    previewImageUrl: area.previewImageUrl,
    textureAtlas: {
      atlasId: area.textureAtlasId,
      cacheKey: `${area.textureAtlasId}:${area.width}x${area.height}`,
      strategy: "blob-cache",
      objectKey: area.textureAtlasObjectKey,
      contentType: area.textureAtlasContentType,
      sizeBytes: area.textureAtlasSizeBytes,
      etag: area.textureAtlasEtag
    },
    soundscape: area.soundscape,
    composition: buildObjectCounts({
      placeables: 1,
      creatures: 2,
      items: 1,
      total: 4
    }),
    objects: area.objects,
    updatedAt: area.updatedAt,
    processedAt: "2026-05-24T10:59:00.000Z"
  };
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
