import { AppException } from "../../src/common/http/app-exception";
import { CatalogApplicationService } from "../../src/modules/catalog/application/catalog.application.service";
import type {
  PlaceableProcessingCachePort
} from "../../src/modules/catalog/application/ports/placeable-processing-cache.port";
import type { TemplateCatalogRepositoryPort } from "../../src/modules/catalog/application/ports/template-catalog-repository.port";
import type { ModuleBlobStoragePort } from "../../src/modules/runtime-settings/application/ports/module-blob-storage.port";
import type { RuntimeSettingsRepositoryPort } from "../../src/modules/runtime-settings/application/ports/runtime-settings-repository.port";
import type {
  TemplateListResult,
  TemplateRecord
} from "../../src/modules/catalog/domain/template.types";

describe("CatalogApplicationService", () => {
  let repository: jest.Mocked<TemplateCatalogRepositoryPort>;
  let placeableCache: jest.Mocked<PlaceableProcessingCachePort>;
  let service: CatalogApplicationService;

  beforeEach(() => {
    repository = {
      listByKind: jest.fn(),
      findByKindAndId: jest.fn(),
      findByKindAndResref: jest.fn()
    };
    placeableCache = {
      get: jest.fn(),
      set: jest.fn()
    };
    service = new CatalogApplicationService(repository, placeableCache);
  });

  it("lists placeables through repository", async () => {
    const result: TemplateListResult = {
      items: [buildTemplate("placeable", "plc_001")],
      total: 1,
      limit: 20,
      offset: 0
    };
    repository.listByKind.mockResolvedValue(result);

    const response = await service.listPlaceables({ limit: 20, offset: 0 });

    expect(repository.listByKind).toHaveBeenCalledWith("placeable", {
      limit: 20,
      offset: 0
    });
    expect(response).toEqual(result);
  });

  it("passes placeable subtype filter to repository", async () => {
    repository.listByKind.mockResolvedValue({
      items: [],
      total: 0,
      limit: 20,
      offset: 0
    });

    await service.listPlaceables({
      subtype: "vfx",
      limit: 20,
      offset: 0
    });

    expect(repository.listByKind).toHaveBeenCalledWith("placeable", {
      subtype: "vfx",
      limit: 20,
      offset: 0
    });
  });

  it("passes placeable benchmark filter to repository", async () => {
    repository.listByKind.mockResolvedValue({
      items: [],
      total: 0,
      limit: 20,
      offset: 0
    });

    await service.listPlaceables({
      benchmark: true,
      limit: 20,
      offset: 0
    });

    expect(repository.listByKind).toHaveBeenCalledWith("placeable", {
      benchmark: true,
      limit: 20,
      offset: 0
    });
  });

  it("lists creatures through repository", async () => {
    repository.listByKind.mockResolvedValue({
      items: [],
      total: 0,
      limit: 20,
      offset: 0
    });

    await service.listCreatures({ limit: 20, offset: 0 });

    expect(repository.listByKind).toHaveBeenCalledWith("creature", {
      limit: 20,
      offset: 0
    });
  });

  it("lists items through repository", async () => {
    repository.listByKind.mockResolvedValue({
      items: [],
      total: 0,
      limit: 20,
      offset: 0
    });

    await service.listItems({ limit: 20, offset: 0 });

    expect(repository.listByKind).toHaveBeenCalledWith("item", {
      limit: 20,
      offset: 0
    });
  });

  it("returns preview payload when template exists", async () => {
    const template = {
      ...buildTemplate("placeable", "plc_001"),
      benchmarkCandidate: true,
      benchmarkBucket: "placeable_heavy_vfx"
    };
    repository.findByKindAndId.mockResolvedValue(template);

    const preview = await service.getPlaceablePreview("plc_001");

    expect(preview.templateId).toBe("plc_001");
    expect(preview.kind).toBe("placeable");
    expect(preview.placeableSubtype).toBe("generic");
    expect(preview.benchmarkCandidate).toBe(true);
    expect(preview.benchmarkBucket).toBe("placeable_heavy_vfx");
    expect(preview.resref).toBe(template.resref);
    expect(preview.previewImageUrl).toBe(template.previewImageUrl);
  });

  it("throws TEMPLATE_NOT_FOUND when template is missing", async () => {
    repository.findByKindAndId.mockResolvedValue(null);

    expect.assertions(4);
    try {
      await service.getPlaceablePreview("missing");
    } catch (error) {
      expect(error).toBeInstanceOf(AppException);
      const appError = error as AppException;
      expect(appError.code).toBe("TEMPLATE_NOT_FOUND");
      expect(appError.getStatus()).toBe(404);
      expect((appError.getResponse() as { message: string }).message).toBe(
        "placeable template was not found."
      );
    }
  });

  it("returns kind-specific not-found message for creature preview", async () => {
    repository.findByKindAndId.mockResolvedValue(null);

    expect.assertions(1);
    try {
      await service.getCreaturePreview("missing-creature");
    } catch (error) {
      expect((error as AppException).getResponse()).toMatchObject({
        message: "creature template was not found."
      });
    }
  });

  it("returns kind-specific not-found message for item preview", async () => {
    repository.findByKindAndId.mockResolvedValue(null);

    expect.assertions(1);
    try {
      await service.getItemPreview("missing-item");
    } catch (error) {
      expect((error as AppException).getResponse()).toMatchObject({
        message: "item template was not found."
      });
    }
  });

  it("returns false benchmark marker for non-benchmark preview", async () => {
    const template = buildTemplate("placeable", "plc_002");
    repository.findByKindAndId.mockResolvedValue(template);

    const preview = await service.getPlaceablePreview("plc_002");

    expect(preview).toMatchObject({
      benchmarkCandidate: false
    });
  });

  it("processes placeable into render contract and stores cache entry", async () => {
    const template: TemplateRecord = {
      ...buildTemplate("placeable", "plc_vfx_001"),
      resref: "plc_vfx_001",
      placeableSubtype: "vfx",
      benchmarkCandidate: true,
      benchmarkBucket: "placeable_heavy_vfx"
    };
    repository.findByKindAndId.mockResolvedValue(template);
    placeableCache.get.mockResolvedValue(null);
    placeableCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-05-24T10:00:00.000Z",
      hits: 0
    }));

    const result = await service.processPlaceable({
      templateId: "plc_vfx_001",
      subtypeHint: "vvx",
      bypassCache: false,
      includeBenchmarkMetadata: true
    });

    expect(result.cache.hit).toBe(false);
    expect(result.placeable.placeableSubtype).toBe("vfx");
    expect(result.placeable.render.frontendType).toBe("vfx");
    expect(result.placeable.classification.mismatchWithTemplate).toBe(false);
    expect(result.placeable.benchmarkBucket).toBe("placeable_heavy_vfx");
    expect(result.placeable.assetManifest.version).toBe("placeable-asset-manifest/v1");
    expect(placeableCache.set).toHaveBeenCalledTimes(1);
  });

  it("deduplicates concurrent placeable processing misses by cache key", async () => {
    const template: TemplateRecord = {
      ...buildTemplate("placeable", "plc_vfx_001"),
      resref: "plc_vfx_001",
      placeableSubtype: "vfx"
    };
    repository.findByKindAndId.mockResolvedValue(template);
    placeableCache.get.mockResolvedValue(null);
    placeableCache.set.mockImplementation(async (key, value) => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return {
        key,
        value,
        storedAt: "2026-05-24T10:00:00.000Z",
        hits: 0
      };
    });

    const firstPromise = service.processPlaceable({
      templateId: "plc_vfx_001",
      bypassCache: false,
      includeBenchmarkMetadata: true
    });
    const secondPromise = service.processPlaceable({
      templateId: "plc_vfx_001",
      bypassCache: false,
      includeBenchmarkMetadata: true
    });

    const [first, second] = await Promise.all([firstPromise, secondPromise]);
    expect(placeableCache.set).toHaveBeenCalledTimes(1);
    expect(first.cache.key).toBe(second.cache.key);
    expect(first.placeable.templateId).toBe("plc_vfx_001");
    expect(second.placeable.templateId).toBe("plc_vfx_001");
  });

  it("resolves placeable processing by resref", async () => {
    const template: TemplateRecord = {
      ...buildTemplate("placeable", "plc_resref_001"),
      resref: "ad_top_lion_1",
      placeableSubtype: "vfx"
    };
    repository.findByKindAndResref.mockResolvedValue(template);
    placeableCache.get.mockResolvedValue(null);
    placeableCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-05-24T10:05:00.000Z",
      hits: 0
    }));

    const result = await service.processPlaceable({
      resref: "ad_top_lion_1",
      bypassCache: false,
      includeBenchmarkMetadata: true
    });

    expect(repository.findByKindAndResref).toHaveBeenCalledWith(
      "placeable",
      "ad_top_lion_1"
    );
    expect(result.placeable.templateId).toBe("plc_resref_001");
  });

  it("returns cache hit for already processed placeable", async () => {
    placeableCache.get.mockResolvedValue({
      key: "a".repeat(64),
      storedAt: "2026-05-24T10:10:00.000Z",
      hits: 3,
      value: {
        templateId: "plc_cached_001",
        resref: "plc_cached",
        name: "Cached Placeable",
        category: "benchmark",
        placeableSubtype: "door",
        render: {
          backendType: "door",
          frontendType: "door",
          rendererPreset: "door-standard",
          isDoor: true,
          isVfx: false
        },
        benchmarkCandidate: false,
        metadata: {
          sample: true
        },
        assetManifest: buildEmptyManifest(),
        classification: {
          source: "template",
          normalizedSubtype: "door",
          mismatchWithTemplate: false
        },
        processedAt: "2026-05-24T10:09:00.000Z"
      }
    });

    const result = await service.getProcessedPlaceable("a".repeat(64));

    expect(result.cache.hit).toBe(true);
    expect(result.cache.hits).toBe(3);
    expect(result.placeable.placeableSubtype).toBe("door");
  });

  it("throws PLACEABLE_CACHE_NOT_FOUND when cache key is missing", async () => {
    placeableCache.get.mockResolvedValue(null);

    await expect(service.getProcessedPlaceable("b".repeat(64))).rejects.toMatchObject({
      code: "PLACEABLE_CACHE_NOT_FOUND"
    });
  });

  it("returns cached placeable asset payload from module blob storage", async () => {
    const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
      get: jest.fn(),
      save: jest.fn()
    };
    const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
      replaceModuleSnapshot: jest.fn(),
      listModuleSnapshot: jest.fn(),
      getModuleObject: jest.fn()
    };
    runtimeSettingsRepository.get.mockResolvedValue({
      ...buildRuntimeSettingsRecord(),
      revision: 3
    });
    moduleBlobStorage.getModuleObject.mockResolvedValue({
      key: "modules/current/models/plc_city_gate.mdl",
      size: 12,
      contentType: "application/octet-stream",
      bytes: Buffer.from("model-bytes", "utf-8")
    });

    const serviceWithBlob = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage
    );

    const cacheKey = "c".repeat(64);
    const assetId = "aabbccddeeff";
    placeableCache.get.mockResolvedValue({
      key: cacheKey,
      storedAt: "2026-05-24T10:10:00.000Z",
      hits: 1,
      value: {
        templateId: "plc_city_gate_001",
        resref: "plc_city_gate",
        name: "City Gate",
        category: "urban",
        placeableSubtype: "door",
        render: {
          backendType: "door",
          frontendType: "door",
          rendererPreset: "door-standard",
          isDoor: true,
          isVfx: false
        },
        benchmarkCandidate: false,
        metadata: { sample: true },
        assetManifest: {
          version: "placeable-asset-manifest/v1",
          source: "module-blob-snapshot",
          generatedAt: "2026-05-24T10:00:00.000Z",
          moduleHash: "hash-v1",
          assetCount: 1,
          candidatesScanned: 50,
          assets: [
            {
              assetId,
              role: "model",
              fileName: "plc_city_gate.mdl",
              objectKey: "modules/current/models/plc_city_gate.mdl",
              extension: "mdl",
              sizeBytes: 12,
              contentType: "application/octet-stream"
            }
          ]
        },
        classification: {
          source: "template",
          normalizedSubtype: "door",
          mismatchWithTemplate: false
        },
        processedAt: "2026-05-24T10:09:00.000Z"
      }
    });

    const result = await serviceWithBlob.getProcessedPlaceableAsset(cacheKey, assetId);

    expect(moduleBlobStorage.getModuleObject).toHaveBeenCalledWith(
      expect.objectContaining({
        bucket: "aurora-module-assets"
      }),
      "modules/current/models/plc_city_gate.mdl"
    );
    expect(result.asset.assetId).toBe(assetId);
    expect(result.payload.bytes.toString("utf-8")).toBe("model-bytes");
  });

  it("processes creature into cached contract", async () => {
    const template: TemplateRecord = {
      ...buildTemplate("creature", "cre_guard_human_001"),
      resref: "cre_guard_human_001"
    };
    repository.findByKindAndId.mockResolvedValue(template);
    placeableCache.get.mockResolvedValue(null);
    placeableCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-05-24T10:20:00.000Z",
      hits: 0
    }));

    const result = await service.processCreature({
      templateId: "cre_guard_human_001",
      bypassCache: false,
      includeBenchmarkMetadata: true
    });

    expect(result.cache.hit).toBe(false);
    expect(result.creature.kind).toBe("creature");
    expect(result.creature.render.frontendType).toBe("creature");
  });

  it("deduplicates concurrent creature processing misses by cache key", async () => {
    const template: TemplateRecord = {
      ...buildTemplate("creature", "cre_guard_human_001"),
      resref: "cre_guard_human_001"
    };
    repository.findByKindAndId.mockResolvedValue(template);
    placeableCache.get.mockResolvedValue(null);
    placeableCache.set.mockImplementation(async (key, value) => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return {
        key,
        value,
        storedAt: "2026-05-24T10:20:00.000Z",
        hits: 0
      };
    });

    const firstPromise = service.processCreature({
      templateId: "cre_guard_human_001",
      bypassCache: false,
      includeBenchmarkMetadata: true
    });
    const secondPromise = service.processCreature({
      templateId: "cre_guard_human_001",
      bypassCache: false,
      includeBenchmarkMetadata: true
    });

    const [first, second] = await Promise.all([firstPromise, secondPromise]);
    expect(placeableCache.set).toHaveBeenCalledTimes(1);
    expect(first.cache.key).toBe(second.cache.key);
    expect(first.creature.templateId).toBe("cre_guard_human_001");
    expect(second.creature.templateId).toBe("cre_guard_human_001");
  });

  it("processes item into cached contract", async () => {
    const template: TemplateRecord = {
      ...buildTemplate("item", "itm_health_potion_001"),
      resref: "itm_health_potion_001"
    };
    repository.findByKindAndId.mockResolvedValue(template);
    placeableCache.get.mockResolvedValue(null);
    placeableCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-05-24T10:21:00.000Z",
      hits: 0
    }));

    const result = await service.processItem({
      templateId: "itm_health_potion_001",
      bypassCache: false,
      includeBenchmarkMetadata: true
    });

    expect(result.cache.hit).toBe(false);
    expect(result.item.kind).toBe("item");
    expect(result.item.render.frontendType).toBe("item");
  });

  it("returns creature/item processed cache entries", async () => {
    placeableCache.get
      .mockResolvedValueOnce({
        key: "c".repeat(64),
        storedAt: "2026-05-24T10:22:00.000Z",
        hits: 2,
        value: {
          templateId: "cre_guard_human_001",
          kind: "creature",
          resref: "cre_guard_human_001",
          name: "guard",
          category: "npc",
          benchmarkCandidate: false,
          metadata: {},
          render: {
            backendType: "creature",
            frontendType: "creature",
            rendererPreset: "creature-standard"
          },
          processedAt: "2026-05-24T10:20:00.000Z"
        }
      })
      .mockResolvedValueOnce({
        key: "d".repeat(64),
        storedAt: "2026-05-24T10:23:00.000Z",
        hits: 1,
        value: {
          templateId: "itm_health_potion_001",
          kind: "item",
          resref: "itm_health_potion_001",
          name: "potion",
          category: "consumable",
          benchmarkCandidate: false,
          metadata: {},
          render: {
            backendType: "item",
            frontendType: "item",
            rendererPreset: "item-standard"
          },
          processedAt: "2026-05-24T10:21:00.000Z"
        }
      });

    const creature = await service.getProcessedCreature("c".repeat(64));
    const item = await service.getProcessedItem("d".repeat(64));

    expect(creature.creature.templateId).toBe("cre_guard_human_001");
    expect(item.item.templateId).toBe("itm_health_potion_001");
  });

  it("throws creature/item cache not found errors", async () => {
    placeableCache.get.mockResolvedValue(null);

    await expect(service.getProcessedCreature("e".repeat(64))).rejects.toMatchObject({
      code: "CREATURE_CACHE_NOT_FOUND"
    });
    await expect(service.getProcessedItem("f".repeat(64))).rejects.toMatchObject({
      code: "ITEM_CACHE_NOT_FOUND"
    });
  });

  it("runs benchmark and returns deterministic metrics envelope", async () => {
    repository.listByKind.mockResolvedValue({
      items: [
        {
          ...buildTemplate("placeable", "plc_bench_001"),
          resref: "plc_bench_001",
          placeableSubtype: "generic",
          benchmarkCandidate: true
        }
      ],
      total: 1,
      limit: 200,
      offset: 0
    });

    const processSpy = jest
      .spyOn(service, "processPlaceable")
      .mockResolvedValue({
        cache: {
          key: "c".repeat(64),
          hit: false,
          storedAt: "2026-05-24T10:15:00.000Z",
          hits: 0
        },
        placeable: {
          templateId: "plc_bench_001",
          resref: "plc_bench_001",
          name: "Bench",
          category: "benchmark",
          placeableSubtype: "generic",
          render: {
            backendType: "generic",
            frontendType: "placeable",
            rendererPreset: "placeable-generic",
            isDoor: false,
            isVfx: false
          },
          benchmarkCandidate: true,
          metadata: { sample: true },
          assetManifest: buildEmptyManifest(),
          classification: {
            source: "template",
            normalizedSubtype: "generic",
            mismatchWithTemplate: false
          },
          processedAt: "2026-05-24T10:14:00.000Z"
        }
      });

    const result = await service.benchmarkPlaceables({
      iterations: 3,
      warmupIterations: 1,
      bypassCache: true
    });

    expect(result.datasetFingerprint).toHaveLength(64);
    expect(result.metrics.perCandidate).toHaveLength(1);
    expect(result.metrics.overall.p95Ms).toBeGreaterThanOrEqual(0);
    expect(processSpy).toHaveBeenCalled();
  });
});

function buildTemplate(kind: TemplateRecord["kind"], id: string): TemplateRecord {
  return {
    templateId: id,
    kind,
    placeableSubtype: kind === "placeable" ? "generic" : undefined,
    resref: `${kind}_resref`,
    name: `${kind} template`,
    category: "test",
    tags: ["tag"],
    previewImageUrl: `/preview/${kind}/${id}.webp`,
    metadata: {
      sample: true
    }
  };
}

function buildEmptyManifest() {
  return {
    version: "placeable-asset-manifest/v1" as const,
    source: "module-blob-snapshot" as const,
    generatedAt: "2026-05-24T10:00:00.000Z",
    moduleHash: undefined,
    assetCount: 0,
    candidatesScanned: 0,
    assets: []
  };
}

function buildRuntimeSettingsRecord() {
  return {
    revision: 1,
    updatedAt: "2026-05-24T08:00:00.000Z",
    updatedBy: "admin.user",
    paths: {
      vanillaDataPath: "C:/nwn/data",
      hakDirectoryPath: "C:/nwn/hak",
      moduleDecompiledPath: "C:/nwn/temp0",
      modulePackedPath: "C:/nwn/module.mod",
      tlkBasePath: "C:/nwn/dialog.tlk",
      tlkCustomPath: ""
    },
    blobStorage: {
      endpoint: "http://localhost:8333",
      region: "us-east-1",
      bucket: "aurora-module-assets",
      modulePrefix: "modules/current",
      accessKeyId: "seaweedfs",
      secretAccessKey: "seaweedfs-secret",
      forcePathStyle: true
    },
    telemetryDebugMode: "off" as const,
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
        resref: "c_wingsmeph",
        metrics: { triangles: 659, meshes: 16, emitters: 0 },
        context: { source: "scene.json" }
      },
      placeableHeavyVfx: {
        resref: "ad_top_lion_1",
        metrics: { triangles: 798, meshes: 28, emitters: 1 },
        context: { source: "scene.json" }
      },
      placeableVfxPlcAlternative: {
        resref: "plc_x02",
        metrics: { triangles: 112, meshes: 5, emitters: 3 },
        context: { source: "scene.json" }
      },
      doorHeavyInstance: {
        resref: "tn_sdoor_14",
        metrics: { triangles: 250, meshes: 10, emitters: 0 },
        context: { source: "scene.json" }
      },
      doorHeavySingleMesh: {
        resref: "tn_gdoor_05",
        metrics: { triangles: 190, meshes: 6, emitters: 0, maxSingleMeshTriangles: 102 },
        context: { source: "scene.json" }
      }
    }
  };
}
