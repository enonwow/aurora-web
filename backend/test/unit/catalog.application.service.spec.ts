import { AppException } from "../../src/common/http/app-exception";
import type { AppConfigService } from "../../src/common/config/app-config.service";
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
      benchmarkBucket: "placeable_heavy_vfx",
      metadata: {
        ...buildTemplate("placeable", "plc_vfx_001").metadata,
        useable: true
      }
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
    expect(result.placeable.placeableRuntime?.interaction.useable).toBe(true);
    expect(result.placeable.placeableValidationIssues?.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(["PLACEABLE_ONUSED_SCRIPT_MISSING"])
    );
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

  it("reuses placeable template lookup cache by templateId across repeated processing calls", async () => {
    const template: TemplateRecord = {
      ...buildTemplate("placeable", "plc_lookup_001"),
      resref: "plc_lookup_001",
      placeableSubtype: "generic"
    };
    repository.findByKindAndId.mockResolvedValue(template);
    placeableCache.get.mockResolvedValue(null);
    placeableCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-05-24T10:00:00.000Z",
      hits: 0
    }));

    await service.processPlaceable({
      templateId: "plc_lookup_001",
      bypassCache: true,
      includeBenchmarkMetadata: true
    });
    await service.processPlaceable({
      templateId: "plc_lookup_001",
      bypassCache: true,
      includeBenchmarkMetadata: true
    });

    expect(repository.findByKindAndId).toHaveBeenCalledTimes(1);
  });

  it("cleans in-flight map after completion so subsequent same-key miss reprocesses", async () => {
    const template: TemplateRecord = {
      ...buildTemplate("placeable", "plc_vfx_001"),
      resref: "plc_vfx_001",
      placeableSubtype: "vfx"
    };
    repository.findByKindAndId.mockResolvedValue(template);
    placeableCache.get.mockResolvedValue(null);
    placeableCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-05-24T10:00:00.000Z",
      hits: 0
    }));

    await service.processPlaceable({
      templateId: "plc_vfx_001",
      bypassCache: false,
      includeBenchmarkMetadata: true
    });
    await service.processPlaceable({
      templateId: "plc_vfx_001",
      bypassCache: false,
      includeBenchmarkMetadata: true
    });

    expect(placeableCache.set).toHaveBeenCalledTimes(2);
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

  it("reuses creature template lookup cache by resref across repeated processing calls", async () => {
    const template: TemplateRecord = {
      ...buildTemplate("creature", "cre_lookup_001"),
      resref: "cre_lookup_resref_001"
    };
    repository.findByKindAndResref.mockResolvedValue(template);
    placeableCache.get.mockResolvedValue(null);
    placeableCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-05-24T10:00:00.000Z",
      hits: 0
    }));

    await service.processCreature({
      resref: "cre_lookup_resref_001",
      bypassCache: true,
      includeBenchmarkMetadata: true
    });
    await service.processCreature({
      resref: "cre_lookup_resref_001",
      bypassCache: true,
      includeBenchmarkMetadata: true
    });

    expect(repository.findByKindAndResref).toHaveBeenCalledTimes(1);
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

  it("processPlaceable returns cache hit payload when cached entry exists", async () => {
    placeableCache.get.mockResolvedValue({
      key: "a".repeat(64),
      storedAt: "2026-05-24T10:10:00.000Z",
      hits: 4,
      value: {
        templateId: "plc_cached_002",
        resref: "plc_cached_002",
        name: "Cached Placeable 2",
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
        benchmarkBucket: "bucket-a",
        metadata: { sample: true },
        assetManifest: buildEmptyManifest(),
        classification: {
          source: "template",
          normalizedSubtype: "generic",
          mismatchWithTemplate: false
        },
        processedAt: "2026-05-24T10:09:00.000Z"
      }
    });
    repository.findByKindAndId.mockResolvedValue(buildTemplate("placeable", "plc_cached_002"));

    const result = await service.processPlaceable({
      templateId: "plc_cached_002",
      bypassCache: false,
      includeBenchmarkMetadata: false
    });

    expect(result.cache.hit).toBe(true);
    expect(result.cache.hits).toBe(4);
    expect(result.placeable.templateId).toBe("plc_cached_002");
    expect(result.placeable.placeableRuntime).toBeDefined();
    expect(result.placeable.placeableValidationIssues).toEqual([]);
    expect(result.placeable.benchmarkBucket).toBeUndefined();
    expect(placeableCache.set).not.toHaveBeenCalled();
  });

  it("processPlaceable bypassCache=true skips cache read/write", async () => {
    repository.findByKindAndId.mockResolvedValue(buildTemplate("placeable", "plc_uncached_001"));
    placeableCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-05-24T10:31:00.000Z",
      hits: 0
    }));

    const result = await service.processPlaceable({
      templateId: "plc_uncached_001",
      bypassCache: true,
      includeBenchmarkMetadata: true
    });

    expect(placeableCache.get).not.toHaveBeenCalled();
    expect(placeableCache.set).toHaveBeenCalledTimes(1);
    expect(result.cache.hit).toBe(false);
    expect(result.placeable.benchmarkCandidate).toBe(false);
  });

  it("returns explicit message when processed placeable cache key is missing", async () => {
    placeableCache.get.mockResolvedValue(null);

    await expect(service.getProcessedPlaceable("b".repeat(64))).rejects.toMatchObject({
      code: "PLACEABLE_CACHE_NOT_FOUND",
      message: "Placeable cache entry was not found."
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

  it("resolves cached placeable asset ids case-insensitively and with trimmed input", async () => {
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
      revision: 4
    });
    moduleBlobStorage.getModuleObject.mockResolvedValue({
      key: "modules/current/models/plc_city_gate_01.mdl",
      size: 12,
      contentType: "application/octet-stream",
      bytes: Buffer.from("asset-bytes", "utf-8")
    });

    const serviceWithBlob = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage
    );

    placeableCache.get.mockResolvedValue({
      key: "d".repeat(64),
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
          assetCount: 2,
          candidatesScanned: 50,
          assets: [
            {
              assetId: "other-id",
              role: "model",
              fileName: "plc_city_gate_00.mdl",
              objectKey: "modules/current/models/plc_city_gate_00.mdl",
              extension: "mdl",
              sizeBytes: 12,
              contentType: "application/octet-stream"
            },
            {
              assetId: "abcDEF012345",
              role: "model",
              fileName: "plc_city_gate_01.mdl",
              objectKey: "modules/current/models/plc_city_gate_01.mdl",
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

    const result = await serviceWithBlob.getProcessedPlaceableAsset(
      "d".repeat(64),
      "  AbCdEf012345  "
    );

    expect(result.asset.assetId).toBe("abcDEF012345");
    expect(result.payload.bytes.toString("utf-8")).toBe("asset-bytes");
  });

  it("throws explicit asset-not-found error when asset id is missing in manifest", async () => {
    placeableCache.get.mockResolvedValue({
      key: "e".repeat(64),
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
              assetId: "only-id",
              role: "model",
              fileName: "plc_city_gate_00.mdl",
              objectKey: "modules/current/models/plc_city_gate_00.mdl",
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

    await expect(
      service.getProcessedPlaceableAsset("e".repeat(64), "missing-id")
    ).rejects.toMatchObject({
      code: "PLACEABLE_ASSET_NOT_FOUND",
      message: "Placeable asset was not found in cached manifest."
    });
  });

  it("throws explicit blob-not-found error when module object payload is missing", async () => {
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
      revision: 5
    });
    moduleBlobStorage.getModuleObject.mockResolvedValue(null);

    const serviceWithBlob = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage
    );

    placeableCache.get.mockResolvedValue({
      key: "f".repeat(64),
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
              assetId: "only-id",
              role: "model",
              fileName: "plc_city_gate_00.mdl",
              objectKey: "modules/current/models/plc_city_gate_00.mdl",
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

    await expect(
      serviceWithBlob.getProcessedPlaceableAsset("f".repeat(64), "only-id")
    ).rejects.toMatchObject({
      code: "PLACEABLE_ASSET_BLOB_NOT_FOUND",
      message: "Placeable asset blob object was not found."
    });
  });

  it("returns placeable asset delivery contracts without downloading bytes", async () => {
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
      revision: 8
    });

    const serviceWithBlob = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage
    );

    const cacheKey = "a".repeat(64);
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
          assetCount: 2,
          candidatesScanned: 50,
          assets: [
            {
              assetId: "abcdef012345",
              role: "model",
              fileName: "plc_city_gate_00.mdl",
              objectKey: "modules/current/models/plc_city_gate_00.mdl",
              extension: "mdl",
              sizeBytes: 12,
              contentType: "application/octet-stream"
            },
            {
              assetId: "abcdef012346",
              role: "texture",
              fileName: "plc_city_gate_00.dds",
              objectKey: "modules/current/textures/plc_city_gate_00.dds",
              extension: "dds",
              sizeBytes: 48,
              contentType: "image/vnd-ms.dds"
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

    const result = await serviceWithBlob.getProcessedPlaceableAssetDelivery(cacheKey);

    expect(moduleBlobStorage.getModuleObject).not.toHaveBeenCalled();
    expect(result.moduleHash).toBe("hash-v1");
    expect(result.assets).toHaveLength(2);
    expect(result.assets[0]).toMatchObject({
      assetId: "abcdef012345",
      objectKey: "modules/current/models/plc_city_gate_00.mdl",
      contentType: "application/octet-stream",
      sizeBytes: 12,
      deliveryPath: `/api/v1/catalog/placeables/cache/${cacheKey}/assets/abcdef012345`,
      deliveryUrl: `/api/v1/catalog/placeables/cache/${cacheKey}/assets/abcdef012345`,
      s3Url: "s3://aurora-module-assets/modules/current/models/plc_city_gate_00.mdl"
    });
  });

  it("self-heals cached placeable manifest when module hash changed before delivery contracts", async () => {
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
      revision: 10
    });
    moduleBlobStorage.listModuleSnapshot.mockResolvedValue({
      bucket: "aurora-module-assets",
      prefix: "modules/current/",
      moduleHash: "hash-v2",
      totalFiles: 1,
      totalBytes: 12,
      objects: [
        {
          key: "modules/current/models/plc_city_gate.mdl",
          size: 12,
          etag: "e1"
        }
      ],
      truncated: false,
      continuationToken: undefined
    });
    placeableCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-05-24T10:32:00.000Z",
      hits: 0
    }));

    const serviceWithBlob = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage
    );

    const cacheKey = "a".repeat(64);
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
              assetId: "oldasset1",
              role: "model",
              fileName: "plc_city_gate_legacy.mdl",
              objectKey: "modules/current/models/plc_city_gate_legacy.mdl",
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

    const result = await serviceWithBlob.getProcessedPlaceableAssetDelivery(cacheKey);

    expect(moduleBlobStorage.listModuleSnapshot).toHaveBeenCalledTimes(1);
    expect(placeableCache.set).toHaveBeenCalledTimes(1);
    expect(
      (placeableCache.set.mock.calls[0]?.[1] as { assetManifest?: { moduleHash?: string } })
        .assetManifest?.moduleHash
    ).toBe("hash-v2");
    expect(result.moduleHash).toBe("hash-v2");
    expect(result.assets).toHaveLength(1);
    expect(result.assets[0]?.objectKey).toBe("modules/current/models/plc_city_gate.mdl");
  });

  it("throws PLACEABLE_CACHE_NOT_FOUND when getProcessedPlaceableAssetDelivery cache key is missing", async () => {
    placeableCache.get.mockResolvedValue(null);

    await expect(
      service.getProcessedPlaceableAssetDelivery("a".repeat(64))
    ).rejects.toMatchObject({
      code: "PLACEABLE_CACHE_NOT_FOUND",
      message: "Placeable cache entry was not found."
    });
  });

  it("returns delivery contracts without s3Url when runtime settings repository is unavailable", async () => {
    const cacheKey = "a".repeat(64);
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
              assetId: "abcdef012345",
              role: "model",
              fileName: "plc_city_gate_00.mdl",
              objectKey: "modules/current/models/plc_city_gate_00.mdl",
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

    const result = await service.getProcessedPlaceableAssetDelivery(cacheKey);

    expect(result.assets).toHaveLength(1);
    expect(result.assets[0]).toMatchObject({
      assetId: "abcdef012345",
      objectKey: "modules/current/models/plc_city_gate_00.mdl",
      deliveryPath: `/api/v1/catalog/placeables/cache/${cacheKey}/assets/abcdef012345`,
      deliveryUrl: `/api/v1/catalog/placeables/cache/${cacheKey}/assets/abcdef012345`
    });
    expect(result.assets[0].s3Url).toBeUndefined();
  });

  it("filters placeable delivery contracts by requested asset ids", async () => {
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
      revision: 9
    });

    const serviceWithBlob = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage
    );

    const cacheKey = "b".repeat(64);
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
          assetCount: 2,
          candidatesScanned: 50,
          assets: [
            {
              assetId: "abcDEF012345",
              role: "model",
              fileName: "plc_city_gate_00.mdl",
              objectKey: "modules/current/models/plc_city_gate_00.mdl",
              extension: "mdl",
              sizeBytes: 12,
              contentType: "application/octet-stream"
            },
            {
              assetId: "abcdef012346",
              role: "texture",
              fileName: "plc_city_gate_00.dds",
              objectKey: "modules/current/textures/plc_city_gate_00.dds",
              extension: "dds",
              sizeBytes: 48,
              contentType: "image/vnd-ms.dds"
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

    const filtered = await serviceWithBlob.getProcessedPlaceableAssetDelivery(cacheKey, [
      "  abcdef012345  "
    ]);
    expect(filtered.assets).toHaveLength(1);
    expect(filtered.assets[0].assetId).toBe("abcDEF012345");

    await expect(
      serviceWithBlob.getProcessedPlaceableAssetDelivery(cacheKey, ["missing"])
    ).rejects.toMatchObject({
      code: "PLACEABLE_ASSET_NOT_FOUND",
      message: "Placeable asset was not found in cached manifest."
    });
  });

  it("builds placeable asset manifest from paged module snapshot and preserves first module hash", async () => {
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
      revision: 6
    });
    moduleBlobStorage.listModuleSnapshot
      .mockResolvedValueOnce({
        bucket: "aurora-module-assets",
        prefix: "modules/current/",
        moduleHash: "hash-1",
        totalFiles: 2,
        totalBytes: 20,
        objects: [
          {
            key: "modules/current/models/plc_city_gate.mdl",
            size: 12,
            etag: "e1"
          }
        ],
        truncated: true,
        continuationToken: "page-2"
      })
      .mockResolvedValueOnce({
        bucket: "aurora-module-assets",
        prefix: "modules/current/",
        moduleHash: "hash-2",
        totalFiles: 2,
        totalBytes: 20,
        objects: [
          {
            key: "modules/current/textures/plc_city_gate.dds",
            size: 8,
            etag: "e2"
          }
        ],
        truncated: false,
        continuationToken: undefined
      });

    const serviceWithBlob = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage
    );
    repository.findByKindAndId.mockResolvedValue({
      ...buildTemplate("placeable", "plc_city_gate_001"),
      resref: "plc_city_gate",
      placeableSubtype: "door"
    });
    placeableCache.get.mockResolvedValue(null);
    placeableCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-05-24T10:31:00.000Z",
      hits: 0
    }));

    const result = await serviceWithBlob.processPlaceable({
      templateId: "plc_city_gate_001",
      bypassCache: false,
      includeBenchmarkMetadata: true
    });

    expect(moduleBlobStorage.listModuleSnapshot).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        bucket: "aurora-module-assets",
        modulePrefix: "modules/current"
      }),
      {
        limit: 1000,
        continuationToken: undefined
      }
    );
    expect(moduleBlobStorage.listModuleSnapshot).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        bucket: "aurora-module-assets",
        modulePrefix: "modules/current"
      }),
      {
        limit: 1000,
        continuationToken: "page-2"
      }
    );
    expect(result.placeable.assetManifest.moduleHash).toBe("hash-1");
    expect(result.placeable.assetManifest.candidatesScanned).toBe(2);
    expect(result.placeable.assetManifest.assetCount).toBe(2);
  });

  it("stops snapshot pagination when continuation token is missing even if page is truncated", async () => {
    const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
      get: jest.fn(),
      save: jest.fn()
    };
    const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
      replaceModuleSnapshot: jest.fn(),
      listModuleSnapshot: jest.fn(),
      getModuleObject: jest.fn()
    };
    moduleBlobStorage.listModuleSnapshot.mockResolvedValue({
      bucket: "aurora-module-assets",
      prefix: "modules/current/",
      moduleHash: "hash-single",
      totalFiles: 1,
      totalBytes: 16,
      objects: [
        {
          key: "modules/current/models/plc_city_gate.mdl",
          size: 16,
          etag: "e-single"
        }
      ],
      truncated: true,
      continuationToken: undefined
    });

    const serviceWithBlob = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage
    );
    const summary = await (
      serviceWithBlob as unknown as {
        listAllModuleSnapshotObjects: (
          settings: ReturnType<typeof buildRuntimeSettingsRecord>["blobStorage"]
        ) => Promise<{
          moduleHash?: string;
          totalFiles: number;
          totalBytes: number;
          truncated: boolean;
        }>;
      }
    ).listAllModuleSnapshotObjects(buildRuntimeSettingsRecord().blobStorage);

    expect(moduleBlobStorage.listModuleSnapshot).toHaveBeenCalledTimes(1);
    expect(summary.moduleHash).toBe("hash-single");
    expect(summary.totalFiles).toBe(1);
    expect(summary.totalBytes).toBe(16);
    expect(summary.truncated).toBe(false);
  });

  it("processes creature into cached contract", async () => {
    const template: TemplateRecord = {
      ...buildTemplate("creature", "cre_guard_human_001"),
      resref: "cre_guard_human_001",
      metadata: {
        ...buildTemplate("creature", "cre_guard_human_001").metadata,
        firstName: "City",
        lastName: "Guard",
        appearanceId: 17,
        appearanceHead: 22,
        colorSkin: 9
      }
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
    expect(result.creature.creatureRuntime).toBeDefined();
    expect(result.creature.creatureRuntime?.identity.firstName).toBe("City");
    expect(result.creature.creatureRuntime?.appearance.appearanceHead).toBe(22);
    expect(Array.isArray(result.creature.creatureValidationIssues)).toBe(true);
    expect(result.creature.creatureValidationIssues?.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(["CREATURE_COLORS_PARTIAL"])
    );
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
      resref: "itm_health_potion_001",
      metadata: {
        ...buildTemplate("item", "itm_health_potion_001").metadata,
        baseItem: 49,
        localizedName: "Health Potion",
        description: "Unknown potion",
        identifiedDescription: "Potion of Cure Moderate Wounds",
        charges: 1,
        stackSize: 10,
        identified: false
      }
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
    expect(result.item.itemRuntime).toBeDefined();
    expect(result.item.itemRuntime?.classification.baseItem).toBe(49);
    expect(result.item.itemRuntime?.identity.localizedName).toBe("Health Potion");
    expect(Array.isArray(result.item.itemValidationIssues)).toBe(true);
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
    expect(creature.creature.creatureRuntime).toBeDefined();
    expect(creature.creature.creatureValidationIssues).toBeDefined();
    expect(item.item.templateId).toBe("itm_health_potion_001");
    expect(item.item.itemRuntime).toBeDefined();
    expect(item.item.itemValidationIssues).toBeDefined();
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

  it("benchmark invokes processPlaceable exact warmup and iteration counts with expected flags", async () => {
    repository.listByKind.mockResolvedValue({
      items: [
        {
          ...buildTemplate("placeable", "plc_bench_002"),
          resref: "plc_bench_002",
          placeableSubtype: "vfx",
          benchmarkCandidate: true
        }
      ],
      total: 1,
      limit: 200,
      offset: 0
    });

    const processSpy = jest.spyOn(service, "processPlaceable").mockResolvedValue({
      cache: {
        key: "c".repeat(64),
        hit: false,
        storedAt: "2026-05-24T10:15:00.000Z",
        hits: 0
      },
      placeable: {
        templateId: "plc_bench_002",
        resref: "plc_bench_002",
        name: "Bench",
        category: "benchmark",
        placeableSubtype: "vfx",
        render: {
          backendType: "vfx",
          frontendType: "vfx",
          rendererPreset: "vfx-emitter",
          isDoor: false,
          isVfx: true
        },
        benchmarkCandidate: true,
        metadata: { sample: true },
        assetManifest: buildEmptyManifest(),
        classification: {
          source: "template",
          normalizedSubtype: "vfx",
          mismatchWithTemplate: false
        },
        processedAt: "2026-05-24T10:14:00.000Z"
      }
    });

    await service.benchmarkPlaceables({
      iterations: 4,
      warmupIterations: 2,
      bypassCache: false
    });

    expect(processSpy).toHaveBeenCalledTimes(6);
    const [warmupCallA, warmupCallB, runCall1] = processSpy.mock.calls;
    expect(warmupCallA[0]).toMatchObject({
      templateId: "plc_bench_002",
      subtypeHint: "vfx",
      bypassCache: true,
      includeBenchmarkMetadata: true
    });
    expect(warmupCallB[0]).toMatchObject({
      bypassCache: true,
      includeBenchmarkMetadata: true
    });
    expect(runCall1[0]).toMatchObject({
      bypassCache: false,
      includeBenchmarkMetadata: true
    });
  });

  it("benchmark validation fails for unknown template ids and empty benchmark configuration", async () => {
    repository.findByKindAndId.mockResolvedValue(null);
    await expect(
      service.benchmarkPlaceables({
        templateIds: ["missing-id"],
        iterations: 1,
        warmupIterations: 0,
        bypassCache: true
      })
    ).rejects.toMatchObject({
      code: "VALIDATION_FAILED",
      message: "Benchmark payload references unknown placeable template ids."
    });

    repository.findByKindAndId.mockResolvedValue(null);
    repository.listByKind.mockResolvedValue({
      items: [],
      total: 0,
      limit: 200,
      offset: 0
    });
    await expect(
      service.benchmarkPlaceables({
        iterations: 1,
        warmupIterations: 0,
        bypassCache: true
      })
    ).rejects.toMatchObject({
      code: "VALIDATION_FAILED",
      message: "No benchmark placeables are configured."
    });
  });

  it("throws TEMPLATE_NOT_FOUND from processPlaceable when neither template id nor resref resolves", async () => {
    repository.findByKindAndId.mockResolvedValue(null);
    repository.findByKindAndResref.mockResolvedValue(null);

    await expect(
      service.processPlaceable({
        templateId: "missing_placeable",
        resref: "missing_resref",
        bypassCache: true,
        includeBenchmarkMetadata: true
      })
    ).rejects.toMatchObject({
      code: "TEMPLATE_NOT_FOUND",
      message: "placeable template was not found."
    });
  });

  it("throws PLACEABLE_CACHE_NOT_FOUND when getProcessedPlaceableAsset cache key is missing", async () => {
    placeableCache.get.mockResolvedValue(null);

    await expect(
      service.getProcessedPlaceableAsset("a".repeat(64), "asset-id")
    ).rejects.toMatchObject({
      code: "PLACEABLE_CACHE_NOT_FOUND",
      message: "Placeable cache entry was not found."
    });
  });

  it("returns processCreature cache hit when bypassCache=false and cache exists", async () => {
    repository.findByKindAndId.mockResolvedValue(buildTemplate("creature", "cre_cached_001"));
    placeableCache.get.mockResolvedValue({
      key: "f".repeat(64),
      storedAt: "2026-05-24T10:10:00.000Z",
      hits: 6,
      value: {
        templateId: "cre_cached_001",
        kind: "creature",
        resref: "cre_cached_001",
        name: "cached creature",
        category: "npc",
        benchmarkCandidate: false,
        metadata: {},
        render: {
          backendType: "creature",
          frontendType: "creature",
          rendererPreset: "creature-standard"
        },
        creatureRuntime: {
          source: {},
          identity: {},
          appearance: {},
          bodyParts: {},
          colors: {},
          faction: {},
          stats: {},
          lists: {},
          scripts: {}
        },
        creatureValidationIssues: [],
        processedAt: "2026-05-24T10:09:00.000Z"
      }
    });

    const result = await service.processCreature({
      templateId: "cre_cached_001",
      bypassCache: false,
      includeBenchmarkMetadata: true
    });

    expect(result.cache.hit).toBe(true);
    expect(result.cache.hits).toBe(6);
    expect(result.creature.templateId).toBe("cre_cached_001");
    expect(placeableCache.set).not.toHaveBeenCalled();
  });

  it("processCreature bypassCache=true skips cache read and writes fresh payload", async () => {
    repository.findByKindAndId.mockResolvedValue({
      ...buildTemplate("creature", "cre_uncached_001"),
      benchmarkCandidate: undefined
    });
    placeableCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-05-24T10:31:00.000Z",
      hits: 0
    }));

    const result = await service.processCreature({
      templateId: "cre_uncached_001",
      bypassCache: true,
      includeBenchmarkMetadata: true
    });

    expect(placeableCache.get).not.toHaveBeenCalled();
    expect(placeableCache.set).toHaveBeenCalledTimes(1);
    expect(result.cache.hit).toBe(false);
    expect(result.creature.benchmarkCandidate).toBe(false);
  });

  it("resolves creature processing by resref", async () => {
    repository.findByKindAndResref.mockResolvedValue({
      ...buildTemplate("creature", "cre_resref_001"),
      resref: "cre_guard_human_001"
    });
    placeableCache.get.mockResolvedValue(null);
    placeableCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-05-24T10:20:00.000Z",
      hits: 0
    }));

    const result = await service.processCreature({
      resref: "cre_guard_human_001",
      bypassCache: false,
      includeBenchmarkMetadata: true
    });

    expect(repository.findByKindAndResref).toHaveBeenCalledWith(
      "creature",
      "cre_guard_human_001"
    );
    expect(result.creature.templateId).toBe("cre_resref_001");
  });

  it("throws TEMPLATE_NOT_FOUND for processCreature when both id and resref are missing", async () => {
    repository.findByKindAndId.mockResolvedValue(null);
    repository.findByKindAndResref.mockResolvedValue(null);

    await expect(
      service.processCreature({
        templateId: "missing_creature",
        resref: "missing_creature_resref",
        bypassCache: true,
        includeBenchmarkMetadata: true
      })
    ).rejects.toMatchObject({
      code: "TEMPLATE_NOT_FOUND",
      message: "creature template was not found."
    });
  });

  it("throws creature cache not-found with explicit message", async () => {
    placeableCache.get.mockResolvedValue(null);

    await expect(service.getProcessedCreature("f".repeat(64))).rejects.toMatchObject({
      code: "CREATURE_CACHE_NOT_FOUND",
      message: "creature cache entry was not found."
    });
  });

  it("benchmark with empty templateIds uses benchmark list query", async () => {
    repository.listByKind.mockResolvedValue({
      items: [
        {
          ...buildTemplate("placeable", "plc_bench_010"),
          resref: "plc_bench_010",
          placeableSubtype: "generic",
          benchmarkCandidate: true
        }
      ],
      total: 1,
      limit: 200,
      offset: 0
    });
    jest.spyOn(service, "processPlaceable").mockResolvedValue({
      cache: {
        key: "f".repeat(64),
        hit: false,
        storedAt: "2026-05-24T10:15:00.000Z",
        hits: 0
      },
      placeable: {
        templateId: "plc_bench_010",
        resref: "plc_bench_010",
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
        metadata: {},
        assetManifest: buildEmptyManifest(),
        classification: {
          source: "template",
          normalizedSubtype: "generic",
          mismatchWithTemplate: false
        },
        processedAt: "2026-05-24T10:14:00.000Z"
      }
    });

    await service.benchmarkPlaceables({
      templateIds: [],
      iterations: 1,
      warmupIterations: 0,
      bypassCache: true
    });

    expect(repository.listByKind).toHaveBeenCalledWith("placeable", {
      benchmark: true,
      limit: 200,
      offset: 0
    });
  });

  it("benchmark computes elapsed milliseconds from hrtime deltas", async () => {
    repository.listByKind.mockResolvedValue({
      items: [
        {
          ...buildTemplate("placeable", "plc_bench_011"),
          resref: "plc_bench_011",
          placeableSubtype: "generic",
          benchmarkCandidate: true
        }
      ],
      total: 1,
      limit: 200,
      offset: 0
    });
    jest.spyOn(service, "processPlaceable").mockResolvedValue({
      cache: {
        key: "f".repeat(64),
        hit: false,
        storedAt: "2026-05-24T10:15:00.000Z",
        hits: 0
      },
      placeable: {
        templateId: "plc_bench_011",
        resref: "plc_bench_011",
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
        metadata: {},
        assetManifest: buildEmptyManifest(),
        classification: {
          source: "template",
          normalizedSubtype: "generic",
          mismatchWithTemplate: false
        },
        processedAt: "2026-05-24T10:14:00.000Z"
      }
    });
    const hrtimeSpy = jest
      .spyOn(process.hrtime, "bigint")
      .mockReturnValueOnce(1_000_000_000n)
      .mockReturnValueOnce(1_001_000_000n)
      .mockReturnValueOnce(2_000_000_000n)
      .mockReturnValueOnce(2_001_000_000n);

    const result = await service.benchmarkPlaceables({
      iterations: 2,
      warmupIterations: 0,
      bypassCache: true
    });

    expect(result.metrics.overall.minMs).toBe(1);
    expect(result.metrics.overall.maxMs).toBe(1);
    hrtimeSpy.mockRestore();
  });

  it("hydrates missing legacy placeable manifest from module snapshot", async () => {
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
      revision: 7
    });
    moduleBlobStorage.listModuleSnapshot.mockResolvedValue({
      bucket: "aurora-module-assets",
      prefix: "modules/current/",
      moduleHash: "hash-hydrate",
      totalFiles: 1,
      totalBytes: 12,
      objects: [
        {
          key: "modules/current/models/plc_city_gate.mdl",
          size: 12,
          etag: "e1"
        }
      ],
      truncated: false,
      continuationToken: undefined
    });

    const serviceWithBlob = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage
    );
    placeableCache.get.mockResolvedValue({
      key: "f".repeat(64),
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
        classification: {
          source: "template",
          normalizedSubtype: "door",
          mismatchWithTemplate: false
        },
        processedAt: "2026-05-24T10:09:00.000Z"
      } as unknown as ReturnType<typeof buildTemplate> & { placeableSubtype: "door" }
    });

    const result = await serviceWithBlob.getProcessedPlaceable("f".repeat(64));

    expect(result.placeable.assetManifest.version).toBe("placeable-asset-manifest/v1");
    expect(result.placeable.assetManifest.assetCount).toBe(1);
    expect(moduleBlobStorage.listModuleSnapshot).toHaveBeenCalledTimes(1);
  });

  it("returns empty non-truncated snapshot when module blob storage is unavailable", async () => {
    const summary = await (
      service as unknown as {
        listAllModuleSnapshotObjects: (
          settings: ReturnType<typeof buildRuntimeSettingsRecord>["blobStorage"]
        ) => Promise<{ totalFiles: number; totalBytes: number; truncated: boolean }>;
      }
    ).listAllModuleSnapshotObjects(buildRuntimeSettingsRecord().blobStorage);

    expect(summary.totalFiles).toBe(0);
    expect(summary.totalBytes).toBe(0);
    expect(summary.truncated).toBe(false);
  });

  it("refreshes module snapshot index after ttl and when snapshot identity changes", async () => {
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
      revision: 8
    });
    moduleBlobStorage.listModuleSnapshot
      .mockResolvedValueOnce({
        bucket: "aurora-module-assets",
        prefix: "modules/current/",
        moduleHash: "hash-a",
        totalFiles: 1,
        totalBytes: 12,
        objects: [
          {
            key: "modules/current/models/plc_city_gate.mdl",
            size: 12,
            etag: "ea"
          }
        ],
        truncated: false,
        continuationToken: undefined
      })
      .mockResolvedValueOnce({
        bucket: "aurora-module-assets",
        prefix: "modules/current/",
        moduleHash: "hash-b",
        totalFiles: 2,
        totalBytes: 20,
        objects: [
          {
            key: "modules/current/models/plc_city_gate.mdl",
            size: 12,
            etag: "ea"
          },
          {
            key: "modules/current/textures/plc_city_gate.dds",
            size: 8,
            etag: "eb"
          }
        ],
        truncated: false,
        continuationToken: undefined
      });

    const serviceWithBlob = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage
    );

    let fakeNow = 1_000;
    const dateNowSpy = jest.spyOn(Date, "now").mockImplementation(() => fakeNow);
    const firstIndex = await (
      serviceWithBlob as unknown as { getModuleSnapshotIndex: () => Promise<{ candidatesScanned: number }> }
    ).getModuleSnapshotIndex();
    fakeNow = 40_000;
    const secondIndex = await (
      serviceWithBlob as unknown as { getModuleSnapshotIndex: () => Promise<{ candidatesScanned: number }> }
    ).getModuleSnapshotIndex();
    dateNowSpy.mockRestore();

    expect(moduleBlobStorage.listModuleSnapshot).toHaveBeenCalledTimes(2);
    expect(firstIndex?.candidatesScanned).toBe(1);
    expect(secondIndex?.candidatesScanned).toBe(2);
    expect(secondIndex).not.toBe(firstIndex);
  });

  it("reuses module snapshot index within ttl and refreshes exactly at 30s boundary", async () => {
    const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
      get: jest.fn(),
      save: jest.fn()
    };
    const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
      replaceModuleSnapshot: jest.fn(),
      listModuleSnapshot: jest.fn(),
      getModuleObject: jest.fn()
    };
    runtimeSettingsRepository.get.mockResolvedValue(buildRuntimeSettingsRecord());
    moduleBlobStorage.listModuleSnapshot
      .mockResolvedValueOnce({
        bucket: "aurora-module-assets",
        prefix: "modules/current/",
        moduleHash: "hash-a",
        totalFiles: 1,
        totalBytes: 1,
        objects: [{ key: "modules/current/models/a.mdl", size: 1, etag: "e1" }],
        truncated: false,
        continuationToken: undefined
      })
      .mockResolvedValueOnce({
        bucket: "aurora-module-assets",
        prefix: "modules/current/",
        moduleHash: "hash-b",
        totalFiles: 1,
        totalBytes: 1,
        objects: [{ key: "modules/current/models/b.mdl", size: 1, etag: "e2" }],
        truncated: false,
        continuationToken: undefined
      });

    const serviceWithBlob = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage
    );

    let fakeNow = 1_000;
    const dateNowSpy = jest.spyOn(Date, "now").mockImplementation(() => fakeNow);
    const firstIndex = await (
      serviceWithBlob as unknown as { getModuleSnapshotIndex: () => Promise<{ moduleHash?: string }> }
    ).getModuleSnapshotIndex();
    fakeNow = 29_500;
    const reusedIndex = await (
      serviceWithBlob as unknown as { getModuleSnapshotIndex: () => Promise<{ moduleHash?: string }> }
    ).getModuleSnapshotIndex();
    fakeNow = 31_000;
    const refreshedIndex = await (
      serviceWithBlob as unknown as { getModuleSnapshotIndex: () => Promise<{ moduleHash?: string }> }
    ).getModuleSnapshotIndex();
    dateNowSpy.mockRestore();

    expect(moduleBlobStorage.listModuleSnapshot).toHaveBeenCalledTimes(2);
    expect(reusedIndex).toBe(firstIndex);
    expect(refreshedIndex).not.toBe(firstIndex);
    expect(refreshedIndex?.moduleHash).toBe("hash-b");
  });

  it("refreshes module snapshot index when only module hash changes", async () => {
    const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
      get: jest.fn(),
      save: jest.fn()
    };
    const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
      replaceModuleSnapshot: jest.fn(),
      listModuleSnapshot: jest.fn(),
      getModuleObject: jest.fn()
    };
    runtimeSettingsRepository.get.mockResolvedValue(buildRuntimeSettingsRecord());
    moduleBlobStorage.listModuleSnapshot
      .mockResolvedValueOnce({
        bucket: "aurora-module-assets",
        prefix: "modules/current/",
        moduleHash: "hash-a",
        totalFiles: 1,
        totalBytes: 1,
        objects: [{ key: "modules/current/models/shared.mdl", size: 1, etag: "e1" }],
        truncated: false,
        continuationToken: undefined
      })
      .mockResolvedValueOnce({
        bucket: "aurora-module-assets",
        prefix: "modules/current/",
        moduleHash: "hash-b",
        totalFiles: 1,
        totalBytes: 1,
        objects: [{ key: "modules/current/models/changed.mdl", size: 1, etag: "e2" }],
        truncated: false,
        continuationToken: undefined
      });

    const serviceWithBlob = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage
    );

    let fakeNow = 1_000;
    const dateNowSpy = jest.spyOn(Date, "now").mockImplementation(() => fakeNow);
    const firstIndex = await (
      serviceWithBlob as unknown as { getModuleSnapshotIndex: () => Promise<{ moduleHash?: string }> }
    ).getModuleSnapshotIndex();
    fakeNow = 40_000;
    const secondIndex = await (
      serviceWithBlob as unknown as { getModuleSnapshotIndex: () => Promise<{ moduleHash?: string }> }
    ).getModuleSnapshotIndex();
    dateNowSpy.mockRestore();

    expect(secondIndex).not.toBe(firstIndex);
    expect(firstIndex?.moduleHash).toBe("hash-a");
    expect(secondIndex?.moduleHash).toBe("hash-b");
  });

  it("refreshes module snapshot index when bucket/prefix identity changes", async () => {
    const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
      get: jest.fn(),
      save: jest.fn()
    };
    const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
      replaceModuleSnapshot: jest.fn(),
      listModuleSnapshot: jest.fn(),
      getModuleObject: jest.fn()
    };
    runtimeSettingsRepository.get
      .mockResolvedValueOnce({
        ...buildRuntimeSettingsRecord(),
        blobStorage: {
          ...buildRuntimeSettingsRecord().blobStorage,
          bucket: "ab",
          modulePrefix: "c"
        }
      })
      .mockResolvedValueOnce({
        ...buildRuntimeSettingsRecord(),
        blobStorage: {
          ...buildRuntimeSettingsRecord().blobStorage,
          bucket: "a",
          modulePrefix: "bc"
        }
      });
    moduleBlobStorage.listModuleSnapshot
      .mockResolvedValueOnce({
        bucket: "ab",
        prefix: "c/",
        moduleHash: "h",
        totalFiles: 1,
        totalBytes: 1,
        objects: [{ key: "c/first.mdl", size: 1, etag: "e1" }],
        truncated: false,
        continuationToken: undefined
      })
      .mockResolvedValueOnce({
        bucket: "a",
        prefix: "bc/",
        moduleHash: "h",
        totalFiles: 1,
        totalBytes: 1,
        objects: [{ key: "bc/second.mdl", size: 1, etag: "e2" }],
        truncated: false,
        continuationToken: undefined
      });

    const serviceWithBlob = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage
    );

    let fakeNow = 1_000;
    const dateNowSpy = jest.spyOn(Date, "now").mockImplementation(() => fakeNow);
    const firstIndex = await (
      serviceWithBlob as unknown as {
        getModuleSnapshotIndex: () => Promise<{ byBasename: Map<string, unknown> }>;
      }
    ).getModuleSnapshotIndex();
    fakeNow = 40_000;
    const secondIndex = await (
      serviceWithBlob as unknown as {
        getModuleSnapshotIndex: () => Promise<{ byBasename: Map<string, unknown> }>;
      }
    ).getModuleSnapshotIndex();
    dateNowSpy.mockRestore();

    expect(secondIndex).not.toBe(firstIndex);
    expect(secondIndex?.byBasename.has("second")).toBe(true);
  });

  it("treats undefined moduleHash differently than empty moduleHash when caching snapshot index", async () => {
    const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
      get: jest.fn(),
      save: jest.fn()
    };
    const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
      replaceModuleSnapshot: jest.fn(),
      listModuleSnapshot: jest.fn(),
      getModuleObject: jest.fn()
    };
    runtimeSettingsRepository.get.mockResolvedValue(buildRuntimeSettingsRecord());
    moduleBlobStorage.listModuleSnapshot
      .mockResolvedValueOnce({
        bucket: "aurora-module-assets",
        prefix: "modules/current/",
        moduleHash: undefined,
        totalFiles: 1,
        totalBytes: 1,
        objects: [{ key: "modules/current/models/hashless_a.mdl", size: 1, etag: "e1" }],
        truncated: false,
        continuationToken: undefined
      })
      .mockResolvedValueOnce({
        bucket: "aurora-module-assets",
        prefix: "modules/current/",
        moduleHash: "",
        totalFiles: 1,
        totalBytes: 1,
        objects: [{ key: "modules/current/models/hashless_b.mdl", size: 1, etag: "e2" }],
        truncated: false,
        continuationToken: undefined
      });

    const serviceWithBlob = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage
    );

    let fakeNow = 1_000;
    const dateNowSpy = jest.spyOn(Date, "now").mockImplementation(() => fakeNow);
    const firstIndex = await (
      serviceWithBlob as unknown as {
        getModuleSnapshotIndex: () => Promise<{ byBasename: Map<string, unknown>; moduleHash?: string }>;
      }
    ).getModuleSnapshotIndex();
    fakeNow = 40_000;
    const secondIndex = await (
      serviceWithBlob as unknown as {
        getModuleSnapshotIndex: () => Promise<{ byBasename: Map<string, unknown>; moduleHash?: string }>;
      }
    ).getModuleSnapshotIndex();
    dateNowSpy.mockRestore();

    expect(secondIndex).not.toBe(firstIndex);
    expect(firstIndex?.moduleHash).toBeUndefined();
    expect(secondIndex?.moduleHash).toBe("");
    expect(secondIndex?.byBasename.has("hashless_b")).toBe(true);
  });

  it("skips module hash probing in test mode when cached placeable already has manifest", async () => {
    const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
      get: jest.fn(),
      save: jest.fn()
    };
    const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
      replaceModuleSnapshot: jest.fn(),
      listModuleSnapshot: jest.fn(),
      getModuleObject: jest.fn()
    };
    const appConfig = { isTest: true } as unknown as AppConfigService;
    placeableCache.get.mockResolvedValue({
      key: "f".repeat(64),
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
        assetManifest: buildEmptyManifest(),
        classification: {
          source: "template",
          normalizedSubtype: "door",
          mismatchWithTemplate: false
        },
        processedAt: "2026-05-24T10:09:00.000Z"
      } as unknown as ReturnType<typeof buildTemplate> & { placeableSubtype: "door" }
    });

    const serviceWithBlob = new CatalogApplicationService(
      repository,
      placeableCache,
      appConfig,
      runtimeSettingsRepository,
      moduleBlobStorage
    );

    await serviceWithBlob.getProcessedPlaceable("f".repeat(64));

    expect(moduleBlobStorage.listModuleSnapshot).not.toHaveBeenCalled();
  });

  it("caches failed module hash probes to avoid repeated snapshot listing on consecutive reads", async () => {
    const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
      get: jest.fn(),
      save: jest.fn()
    };
    const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
      replaceModuleSnapshot: jest.fn(),
      listModuleSnapshot: jest.fn(),
      getModuleObject: jest.fn()
    };
    runtimeSettingsRepository.get.mockResolvedValue(buildRuntimeSettingsRecord());
    moduleBlobStorage.listModuleSnapshot.mockRejectedValue(new Error("blob_timeout"));
    placeableCache.get.mockResolvedValue({
      key: "f".repeat(64),
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
        assetManifest: buildEmptyManifest(),
        classification: {
          source: "template",
          normalizedSubtype: "door",
          mismatchWithTemplate: false
        },
        processedAt: "2026-05-24T10:09:00.000Z"
      } as unknown as ReturnType<typeof buildTemplate> & { placeableSubtype: "door" }
    });

    const serviceWithBlob = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage
    );

    await serviceWithBlob.getProcessedPlaceable("f".repeat(64));
    await serviceWithBlob.getProcessedPlaceable("f".repeat(64));

    expect(moduleBlobStorage.listModuleSnapshot).toHaveBeenCalledTimes(1);
  });

  it("reuses previous index object when cache key is unchanged after ttl refresh", async () => {
    const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
      get: jest.fn(),
      save: jest.fn()
    };
    const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
      replaceModuleSnapshot: jest.fn(),
      listModuleSnapshot: jest.fn(),
      getModuleObject: jest.fn()
    };
    runtimeSettingsRepository.get.mockResolvedValue(buildRuntimeSettingsRecord());
    moduleBlobStorage.listModuleSnapshot.mockResolvedValue({
      bucket: "aurora-module-assets",
      prefix: "modules/current/",
      moduleHash: "stable-hash",
      totalFiles: 1,
      totalBytes: 1,
      objects: [{ key: "modules/current/models/stable.mdl", size: 1, etag: "e-stable" }],
      truncated: false,
      continuationToken: undefined
    });

    const serviceWithBlob = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage
    );

    let fakeNow = 1_000;
    const dateNowSpy = jest.spyOn(Date, "now").mockImplementation(() => fakeNow);
    const firstIndex = await (
      serviceWithBlob as unknown as { getModuleSnapshotIndex: () => Promise<object> }
    ).getModuleSnapshotIndex();
    fakeNow = 40_000;
    const secondIndex = await (
      serviceWithBlob as unknown as { getModuleSnapshotIndex: () => Promise<object> }
    ).getModuleSnapshotIndex();
    dateNowSpy.mockRestore();

    expect(moduleBlobStorage.listModuleSnapshot).toHaveBeenCalledTimes(2);
    expect(secondIndex).toBe(firstIndex);
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
