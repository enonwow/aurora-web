import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AppException } from "../../src/common/http/app-exception";
import type { AppConfigService } from "../../src/common/config/app-config.service";
import { CatalogApplicationService } from "../../src/modules/catalog/application/catalog.application.service";
import type {
  PlaceableProcessingCachePort
} from "../../src/modules/catalog/application/ports/placeable-processing-cache.port";
import type { TemplateCatalogRepositoryPort } from "../../src/modules/catalog/application/ports/template-catalog-repository.port";
import type { ModuleBlobStoragePort } from "../../src/modules/runtime-settings/application/ports/module-blob-storage.port";
import type { DerivedAssetGeneratorPort } from "../../src/modules/runtime-settings/application/ports/derived-asset-generator.port";
import type { RuntimeSettingsRepositoryPort } from "../../src/modules/runtime-settings/application/ports/runtime-settings-repository.port";
import type { RuntimeSettingsRecord } from "../../src/modules/runtime-settings/domain/runtime-settings.types";
import { convertAuroraAsciiMdlToGlb } from "../../src/modules/runtime-settings/adapters/outbound/derived/aurora-mdl-ascii-to-glb.converter";
import type {
  PlaceableRenderPackage,
  TemplateListResult,
  TemplateRecord
} from "../../src/modules/catalog/domain/template.types";

const MULTI_TEXTURE_PLACEABLE_ASCII_MDL = `
newmodel plc_multi
beginmodelgeom plc_multi
node trimesh mesh_wood
  parent plc_multi
  texture0 tx_wood
  verts 3
    0 0 0
    1 0 0
    0 1 0
  tverts 3
    0 0
    1 0
    0 1
  faces 1
    0 1 2 1 0 1 2 1
endnode
node trimesh mesh_metal
  parent plc_multi
  bitmap tx_metal
  verts 3
    0 0 1
    1 0 1
    0 1 1
  tverts 3
    0 0
    1 0
    0 1
  faces 1
    0 1 2 1 0 1 2 1
endnode
endmodelgeom plc_multi
`;

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
    expect(response).toEqual({
      ...result,
      items: [
        {
          ...result.items[0],
          previewImageUrl: "/api/v1/catalog/placeables/plc_001/thumbnail"
        }
      ]
    });
  });

  it("reuses in-memory placeable list cache for repeated identical queries", async () => {
    const result: TemplateListResult = {
      items: [buildTemplate("placeable", "plc_cached_list_001")],
      total: 1,
      limit: 100,
      offset: 0
    };
    repository.listByKind.mockResolvedValue(result);

    const first = await service.listPlaceables({ limit: 100, offset: 0 });
    const second = await service.listPlaceables({ limit: 100, offset: 0 });

    expect(repository.listByKind).toHaveBeenCalledTimes(1);
    expect(second).toBe(first);
    expect(first.items[0].previewImageUrl).toBe(
      "/api/v1/catalog/placeables/plc_cached_list_001/thumbnail"
    );
  });

  it("deduplicates concurrent identical placeable list requests", async () => {
    const result: TemplateListResult = {
      items: [buildTemplate("placeable", "plc_concurrent_list_001")],
      total: 1,
      limit: 100,
      offset: 0
    };
    repository.listByKind.mockResolvedValue(result);

    const [first, second] = await Promise.all([
      service.listPlaceables({ limit: 100, offset: 0 }),
      service.listPlaceables({ limit: 100, offset: 0 })
    ]);

    expect(repository.listByKind).toHaveBeenCalledTimes(1);
    expect(second).toBe(first);
    expect(first.items[0].previewImageUrl).toBe(
      "/api/v1/catalog/placeables/plc_concurrent_list_001/thumbnail"
    );
  });

  it("expires in-memory placeable list cache after ttl", async () => {
    const firstResult: TemplateListResult = {
      items: [buildTemplate("placeable", "plc_cached_list_001")],
      total: 1,
      limit: 100,
      offset: 0
    };
    const secondResult: TemplateListResult = {
      items: [buildTemplate("placeable", "plc_cached_list_002")],
      total: 1,
      limit: 100,
      offset: 0
    };
    repository.listByKind
      .mockResolvedValueOnce(firstResult)
      .mockResolvedValueOnce(secondResult);

    let now = 1_000;
    const dateNowSpy = jest.spyOn(Date, "now").mockImplementation(() => now);
    const first = await service.listPlaceables({ limit: 100, offset: 0 });
    now += 61_000;
    const second = await service.listPlaceables({ limit: 100, offset: 0 });
    dateNowSpy.mockRestore();

    expect(repository.listByKind).toHaveBeenCalledTimes(2);
    expect(first.items[0].previewImageUrl).toBe(
      "/api/v1/catalog/placeables/plc_cached_list_001/thumbnail"
    );
    expect(second.items[0].previewImageUrl).toBe(
      "/api/v1/catalog/placeables/plc_cached_list_002/thumbnail"
    );
  });

  it("keeps on-demand texture lookup enabled for batch render packages", async () => {
    const query = {
      templateId: "plc_batch_texture",
      appearanceType: 12,
      bypassCache: true,
      includeBenchmarkMetadata: true
    };
    const processSpy = jest
      .spyOn(service, "processPlaceable")
      .mockResolvedValue({
        cache: {
          key: "f".repeat(64),
          hit: false,
          storedAt: "2026-05-24T10:10:00.000Z",
          hits: 0
        },
        placeable: {
          ...buildTemplate("placeable", "plc_batch_texture"),
          render: {
            backendType: "generic",
            frontendType: "placeable",
            rendererPreset: "placeable-generic",
            isDoor: false,
            isVfx: false
          },
          assetManifest: buildEmptyManifest(),
          classification: {
            source: "template",
            normalizedSubtype: "generic",
            mismatchWithTemplate: false
          },
          processedAt: "2026-05-24T10:10:00.000Z"
        }
      } as Awaited<ReturnType<CatalogApplicationService["processPlaceable"]>>);

    const result = await service.processPlaceablesBatch([query]);

    expect(result.items).toHaveLength(1);
    expect(processSpy).toHaveBeenCalledWith(query, {
      allowOnDemandDerivedModelGeneration: true,
      allowExpensiveSourceReferenceScans: false,
      allowOnDemandTextureLookup: true
    });
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
    expect(preview.previewImageUrl).toBe("/api/v1/catalog/placeables/plc_001/thumbnail");
  });

  it("returns generated placeable thumbnail image payload", async () => {
    repository.findByKindAndId.mockResolvedValue(buildTemplate("placeable", "plc_001"));

    const thumbnail = await service.getPlaceableThumbnail("plc_001");

    expect(repository.findByKindAndId).toHaveBeenCalledWith("placeable", "plc_001");
    expect(thumbnail.contentType).toBe("image/svg+xml; charset=utf-8");
    expect(thumbnail.fileName).toBe("plc_001.svg");
    expect(thumbnail.bytes.toString("utf-8")).toContain("placeable_resref");
    expect(thumbnail.etag).toMatch(/^W\/"/u);
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
    expect(result.placeable.renderPackage?.diagnostics.map((entry) => entry.code)).toEqual(
      expect.arrayContaining(["VFX_PLACEABLE_KIND_NOT_EFFECTVISUALEFFECT"])
    );
    expect(result.placeable.classification.mismatchWithTemplate).toBe(false);
    expect(result.placeable.benchmarkBucket).toBe("placeable_heavy_vfx");
    expect(result.placeable.assetManifest.version).toBe("placeable-asset-manifest/v1");
    expect(result.placeable.placeableRuntime?.interaction.useable).toBe(true);
    expect(result.placeable.placeableValidationIssues?.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(["PLACEABLE_ONUSED_SCRIPT_MISSING"])
    );
    expect(placeableCache.set).toHaveBeenCalledTimes(1);
  });

  it("returns missing_assets render package for empty manifest in test mode", async () => {
    const template: TemplateRecord = {
      ...buildTemplate("placeable", "plc_empty_001"),
      resref: "plc_empty",
      placeableSubtype: "generic"
    };
    repository.findByKindAndId.mockResolvedValue(template);
    const appConfig = { isTest: true } as unknown as AppConfigService;
    placeableCache.get.mockResolvedValue(null);
    placeableCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-05-24T10:00:00.000Z",
      hits: 0
    }));

    const serviceWithTestConfig = new CatalogApplicationService(
      repository,
      placeableCache,
      appConfig
    );

    const result = await serviceWithTestConfig.processPlaceable({
      templateId: "plc_empty_001",
      bypassCache: false,
      includeBenchmarkMetadata: true
    });

    expect(result.placeable.renderPackage?.status).toBe("missing_assets");
    expect(result.placeable.renderPackage?.assetRefs).toEqual({});
  });

  it("returns missing_derived render package when only raw model assets are discovered", async () => {
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
      moduleHash: "hash-raw-model",
      totalFiles: 1,
      totalBytes: 12,
      objects: [
        {
          key: "modules/current/models/plc_raw.mdl",
          size: 12,
          etag: "model-hash"
        }
      ],
      truncated: false,
      continuationToken: undefined
    });

    const template: TemplateRecord = {
      ...buildTemplate("placeable", "plc_raw_001"),
      resref: "plc_raw",
      placeableSubtype: "generic"
    };
    repository.findByKindAndId.mockResolvedValue(template);
    placeableCache.get.mockResolvedValue(null);
    placeableCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-05-24T10:10:00.000Z",
      hits: 0
    }));

    const serviceWithBlob = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage
    );

    const result = await serviceWithBlob.processPlaceable({
      templateId: "plc_raw_001",
      bypassCache: false,
      includeBenchmarkMetadata: true
    });

    expect(result.placeable.renderPackage?.status).toBe("missing_derived");
    expect(result.placeable.renderPackage?.assetRefs.modelAssetIds?.length).toBeGreaterThan(0);
    expect(result.placeable.renderPackage?.modelUrl).toBeUndefined();
    expect(result.placeable.renderPackage?.glbUrl).toBeUndefined();
  });

  it("generates and stores a derived glb on demand when a raw placeable model is discovered", async () => {
    const runtimeSettings = buildRuntimeSettingsRecord();
    const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
      get: jest.fn().mockResolvedValue(runtimeSettings),
      save: jest.fn()
    };
    const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
      replaceModuleSnapshot: jest.fn(),
      listModuleSnapshot: jest.fn(),
      getModuleObject: jest.fn(),
      putModuleObject: jest.fn()
    };
    moduleBlobStorage.listModuleSnapshot.mockResolvedValue({
      bucket: "aurora-module-assets",
      prefix: "modules/current/",
      moduleHash: "hash-raw-model",
      totalFiles: 1,
      totalBytes: 12,
      objects: [
        {
          key: "modules/current/models/plc_raw.mdl",
          size: 12,
          etag: "model-hash"
        }
      ],
      truncated: false,
      continuationToken: undefined
    });
    moduleBlobStorage.getModuleObject.mockImplementation(async (_settings, key) => {
      if (key === "modules/current/models/plc_raw.mdl") {
        return {
          key,
          size: 12,
          contentType: "application/octet-stream",
          etag: "model-hash",
          bytes: Buffer.from("mdl")
        };
      }
      if (key === "modules/current/__aurora/derived/models/plc_raw.glb") {
        return {
          key,
          size: 3,
          contentType: "model/gltf-binary",
          etag: "derived-hash",
          bytes: Buffer.from("glb")
        };
      }
      return null;
    });
    (moduleBlobStorage.putModuleObject as jest.Mock).mockResolvedValue({
      key: "modules/current/__aurora/derived/models/plc_raw.glb",
      size: 3,
      etag: "derived-hash"
    });
    const derivedAssetGenerator: jest.Mocked<DerivedAssetGeneratorPort> = {
      generateDerivedAssets: jest.fn(
        async (_input: Parameters<DerivedAssetGeneratorPort["generateDerivedAssets"]>[0]) => ({
        files: [
          {
            fileName: "__aurora/derived/models/plc_raw.glb",
            resourceType: 0,
            bytes: Buffer.from("glb")
          }
        ],
        summary: {
          generator: "test-generator",
          generatedFiles: 1,
          generatedBytes: 3
        }
      }))
    };

    const template: TemplateRecord = {
      ...buildTemplate("placeable", "plc_raw_001"),
      resref: "plc_raw",
      placeableSubtype: "generic"
    };
    repository.findByKindAndId.mockResolvedValue(template);
    placeableCache.get.mockResolvedValue(null);
    placeableCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-05-24T10:10:00.000Z",
      hits: 0
    }));

    const serviceWithDerived = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage,
      derivedAssetGenerator
    );

    const result = await serviceWithDerived.processPlaceable({
      templateId: "plc_raw_001",
      bypassCache: false,
      includeBenchmarkMetadata: true
    });

    expect(derivedAssetGenerator.generateDerivedAssets).toHaveBeenCalledWith({
      settingsRevision: runtimeSettings.revision,
      modulePrefix: runtimeSettings.blobStorage.modulePrefix,
      sourceFiles: [
        expect.objectContaining({
          fileName: "modules/current/models/plc_raw.mdl",
          bytes: Buffer.from("mdl")
        })
      ]
    });
    expect(moduleBlobStorage.putModuleObject).toHaveBeenCalledWith(
      runtimeSettings.blobStorage,
      expect.objectContaining({
        fileName: "__aurora/derived/models/plc_raw.glb",
        bytes: Buffer.from("glb")
      })
    );
    expect(result.placeable.renderPackage?.status).toBe("ready");
    expect(result.placeable.renderPackage?.glbUrl).toMatch(
      /^\/api\/v1\/catalog\/placeables\/cache\/.+\/assets\/.+\.glb$/u
    );
  });

  it("returns ready render package with delivery urls when derived glb is discovered", async () => {
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
      moduleHash: "hash-derived-model",
      totalFiles: 2,
      totalBytes: 128,
      objects: [
        {
          key: "modules/current/models/plc_ready.glb",
          size: 120,
          etag: "derived-hash"
        },
        {
          key: "modules/current/textures/plc_ready.dds",
          size: 8,
          etag: "texture-hash"
        }
      ],
      truncated: false,
      continuationToken: undefined
    });

    const template: TemplateRecord = {
      ...buildTemplate("placeable", "plc_ready_001"),
      resref: "plc_ready",
      placeableSubtype: "generic"
    };
    repository.findByKindAndId.mockResolvedValue(template);
    placeableCache.get.mockResolvedValue(null);
    placeableCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-05-24T10:10:00.000Z",
      hits: 0
    }));

    const serviceWithBlob = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage
    );

    const result = await serviceWithBlob.processPlaceable({
      templateId: "plc_ready_001",
      bypassCache: false,
      includeBenchmarkMetadata: true
    });

    const renderPackage = result.placeable.renderPackage;
    expect(renderPackage?.status).toBe("ready");
    const derivedModelAssetId = renderPackage?.assetRefs.derivedModelAssetIds?.[0];
    expect(derivedModelAssetId).toBeDefined();
    const assetById = new Map(
      result.placeable.assetManifest.assets.map((asset) => [asset.assetId, asset])
    );
    expect(renderPackage?.glbUrl).toBe(
      `/api/v1/catalog/placeables/cache/${result.cache.key}/assets/${derivedModelAssetId}.glb`
    );
    expect(renderPackage?.modelUrl).toBeUndefined();

    const textureAssetIds = renderPackage?.assetRefs.textureAssetIds ?? [];
    expect(textureAssetIds.length).toBeGreaterThan(0);
    expect(renderPackage?.textureUrls).toEqual(
      textureAssetIds.map((assetId) => {
        const asset = assetById.get(assetId);
        return `/api/v1/catalog/placeables/cache/${result.cache.key}/assets/${assetId}.${asset?.extension}`;
      })
    );
  });

  it("prefers glb delivery URL when gltf and glb derived blob assets both exist", async () => {
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
      moduleHash: "hash-dual-derived-model",
      totalFiles: 2,
      totalBytes: 248,
      objects: [
        {
          key: "modules/current/models/plc_dual.gltf",
          size: 128,
          etag: "gltf-hash"
        },
        {
          key: "modules/current/models/plc_dual.glb",
          size: 120,
          etag: "glb-hash"
        }
      ],
      truncated: false,
      continuationToken: undefined
    });

    const template: TemplateRecord = {
      ...buildTemplate("placeable", "plc_dual_001"),
      resref: "plc_dual",
      placeableSubtype: "generic"
    };
    repository.findByKindAndId.mockResolvedValue(template);
    placeableCache.get.mockResolvedValue(null);
    placeableCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-05-24T10:10:00.000Z",
      hits: 0
    }));

    const serviceWithBlob = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage
    );

    const result = await serviceWithBlob.processPlaceable({
      templateId: "plc_dual_001",
      bypassCache: false,
      includeBenchmarkMetadata: true
    });

    const gltfAsset = result.placeable.assetManifest.assets.find(
      (asset) => asset.fileName === "plc_dual.gltf"
    );
    const glbAsset = result.placeable.assetManifest.assets.find(
      (asset) => asset.fileName === "plc_dual.glb"
    );
    expect(gltfAsset).toBeDefined();
    expect(glbAsset).toBeDefined();
    expect(result.placeable.renderPackage?.assetRefs.derivedModelAssetIds).toEqual([
      glbAsset?.assetId,
      gltfAsset?.assetId
    ]);
    expect(result.placeable.renderPackage?.glbUrl).toBe(
      `/api/v1/catalog/placeables/cache/${result.cache.key}/assets/${glbAsset?.assetId}.glb`
    );
    expect(result.placeable.renderPackage?.modelUrl).toBeUndefined();
  });

  it("adds blob texture assets from Aurora texture references embedded in derived glb", async () => {
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
      moduleHash: "hash-glb-texture-ref",
      totalFiles: 2,
      totalBytes: 136,
      objects: [
        {
          key: "modules/current/__aurora/derived/models/plc_cache_chest.glb",
          size: 120,
          etag: "derived-hash"
        },
        {
          key: "modules/current/__aurora/sources/hak/lc_core/textures/tx_chestwood.tga",
          size: 16,
          etag: "texture-hash"
        }
      ],
      truncated: false,
      continuationToken: undefined
    });
    moduleBlobStorage.getModuleObject.mockImplementation(async (_settings, key) => {
      if (key !== "modules/current/__aurora/derived/models/plc_cache_chest.glb") {
        return null;
      }
      const bytes = buildGlbWithTextureReferences(["tx_chestwood"]);
      return {
        key,
        size: bytes.length,
        contentType: "model/gltf-binary",
        bytes
      };
    });

    const template: TemplateRecord = {
      ...buildTemplate("placeable", "plc_cache_chest_001"),
      resref: "plc_cache_chest",
      placeableSubtype: "generic",
      metadata: {
        lookupModelResRef: "plc_cache_chest"
      }
    };
    repository.findByKindAndId.mockResolvedValue(template);
    placeableCache.get.mockResolvedValue(null);
    placeableCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-05-24T10:10:00.000Z",
      hits: 0
    }));

    const serviceWithBlob = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage
    );

    const result = await serviceWithBlob.processPlaceable({
      templateId: "plc_cache_chest_001",
      bypassCache: false,
      includeBenchmarkMetadata: true
    });

    const textureAsset = result.placeable.assetManifest.assets.find(
      (asset) => asset.fileName === "tx_chestwood.tga"
    );
    expect(textureAsset).toBeDefined();
    expect(textureAsset).toMatchObject({
      role: "texture",
      objectKey: "modules/current/__aurora/sources/hak/lc_core/textures/tx_chestwood.tga",
      extension: "tga",
      contentType: "image/x-tga"
    });
    const textureAssetId = textureAsset!.assetId;
    expect(result.placeable.renderPackage?.assetRefs.textureAssetIds).toContain(
      textureAssetId
    );
    expect(result.placeable.renderPackage?.textureUrls).toContain(
      `/api/v1/catalog/placeables/cache/${result.cache.key}/assets/${textureAssetId}.tga`
    );
  });

  it("resolves on-demand material assets before collecting material texture maps", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "aurora-placeable-material-hak-"));
    const hakPath = join(tempRoot, "materials.hak");
    await writeFile(
      hakPath,
      buildHakV10File([
        {
          resref: "mat_ref",
          restype: 2072,
          bytes: Buffer.from(
            ["renderhint NormalAndSpecMapped", "texture0 mat_ref_d", "texture1 mat_ref_n"].join(
              "\n"
            ),
            "utf-8"
          )
        },
        { resref: "mat_ref_d", restype: 2033, bytes: Buffer.from([1, 2, 3]) },
        { resref: "mat_ref_n", restype: 2033, bytes: Buffer.from([4, 5, 6]) }
      ])
    );

    try {
      const settings = buildRuntimeSettingsRecord();
      settings.paths.hakDirectoryPath = tempRoot;
      settings.paths.moduleDecompiledPath = "";
      settings.sources.placeable.includeHaks = true;
      settings.sources.placeable.includeVanilla = false;
      settings.sources.placeable.hakProfileId = "lc_models";
      settings.hakProfiles.lc_models = ["materials.hak"];
      const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
        get: jest.fn().mockResolvedValue(settings),
        save: jest.fn()
      };
      const storedObjects = new Map<
        string,
        { bytes: Buffer; contentType: string; etag: string }
      >();
      const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
        replaceModuleSnapshot: jest.fn(),
        listModuleSnapshot: jest.fn(),
        getModuleObject: jest.fn(),
        putModuleObject: jest.fn()
      };
      const putModuleObject =
        moduleBlobStorage.putModuleObject as jest.MockedFunction<
          NonNullable<ModuleBlobStoragePort["putModuleObject"]>
        >;
      const derivedKey = "modules/current/__aurora/derived/models/plc_material.glb";
      moduleBlobStorage.listModuleSnapshot.mockResolvedValue({
        bucket: "aurora-module-assets",
        prefix: "modules/current/",
        moduleHash: "hash-on-demand-material",
        totalFiles: 1,
        totalBytes: 120,
        objects: [{ key: derivedKey, size: 120, etag: "derived-hash" }],
        truncated: false,
        continuationToken: undefined
      });
      moduleBlobStorage.getModuleObject.mockImplementation(async (_settings, key) => {
        if (key === derivedKey) {
          const bytes = buildGlbWithTextureReferences(["mat_ref"]);
          return {
            key,
            size: bytes.length,
            contentType: "model/gltf-binary",
            bytes
          };
        }
        const stored = storedObjects.get(key);
        return stored
          ? {
              key,
              size: stored.bytes.length,
              contentType: stored.contentType,
              etag: stored.etag,
              bytes: stored.bytes
            }
          : null;
      });
      putModuleObject.mockImplementation(async (_settings, file) => {
        const normalizedFileName = file.fileName.replace(/\\/gu, "/").replace(/^\/+/u, "");
        const key = `modules/current/${normalizedFileName}`;
        const bytes = Buffer.from(file.bytes);
        const etag = `etag-${storedObjects.size + 1}`;
        storedObjects.set(key, {
          bytes,
          contentType: "application/octet-stream",
          etag
        });
        return { key, size: bytes.length, etag };
      });

      repository.findByKindAndId.mockResolvedValue({
        ...buildTemplate("placeable", "plc_material_001"),
        resref: "plc_material",
        placeableSubtype: "generic",
        metadata: {
          lookupModelResRef: "plc_material"
        }
      });
      placeableCache.get.mockResolvedValue(null);
      placeableCache.set.mockImplementation(async (key, value) => ({
        key,
        value,
        storedAt: "2026-05-24T10:10:00.000Z",
        hits: 0
      }));

      const serviceWithBlob = new CatalogApplicationService(
        repository,
        placeableCache,
        undefined,
        runtimeSettingsRepository,
        moduleBlobStorage
      );

      const result = await serviceWithBlob.processPlaceable({
        templateId: "plc_material_001",
        bypassCache: false,
        includeBenchmarkMetadata: true
      });

      expect(moduleBlobStorage.putModuleObject).toHaveBeenCalledTimes(3);
      expect(result.placeable.assetManifest.assets).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            role: "material",
            fileName: "mat_ref.mtr"
          }),
          expect.objectContaining({
            role: "texture",
            fileName: "mat_ref_d.dds"
          }),
          expect.objectContaining({
            role: "texture",
            fileName: "mat_ref_n.dds"
          })
        ])
      );
      const textureAssets = result.placeable.assetManifest.assets.filter(
        (asset) => asset.role === "texture"
      );
      expect(textureAssets.map((asset) => asset.fileName).sort()).toEqual([
        "mat_ref_d.dds",
        "mat_ref_n.dds"
      ]);
      expect(result.placeable.renderPackage?.textureUrls).toEqual(
        textureAssets.map(
          (asset) =>
            `/api/v1/catalog/placeables/cache/${result.cache.key}/assets/${asset.assetId}.dds`
        )
      );
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it("keeps TXI sidecars from suppressing same-basename image textures", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "aurora-placeable-txi-sidecar-hak-"));
    const hakPath = join(tempRoot, "textures.hak");
    await writeFile(
      hakPath,
      buildHakV10File([
        { resref: "pee", restype: 3, bytes: Buffer.from([1, 2, 3]) }
      ])
    );

    try {
      const settings = buildRuntimeSettingsRecord();
      settings.paths.hakDirectoryPath = tempRoot;
      settings.paths.moduleDecompiledPath = "";
      settings.sources.placeable.includeHaks = true;
      settings.sources.placeable.includeVanilla = false;
      settings.sources.placeable.hakProfileId = "lc_models";
      settings.hakProfiles.lc_models = ["textures.hak"];
      const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
        get: jest.fn().mockResolvedValue(settings),
        save: jest.fn()
      };
      const storedObjects = new Map<
        string,
        { bytes: Buffer; contentType: string; etag: string }
      >();
      const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
        replaceModuleSnapshot: jest.fn(),
        listModuleSnapshot: jest.fn(),
        getModuleObject: jest.fn(),
        putModuleObject: jest.fn()
      };
      const putModuleObject =
        moduleBlobStorage.putModuleObject as jest.MockedFunction<
          NonNullable<ModuleBlobStoragePort["putModuleObject"]>
        >;
      const derivedKey = "modules/current/__aurora/derived/models/zlc_pee.glb";
      const txiKey = "modules/current/__aurora/sources/hak/cep3_core0/pee.txi";
      moduleBlobStorage.listModuleSnapshot.mockResolvedValue({
        bucket: "aurora-module-assets",
        prefix: "modules/current/",
        moduleHash: "hash-txi-sidecar",
        totalFiles: 2,
        totalBytes: 124,
        objects: [
          { key: derivedKey, size: 120, etag: "derived-hash" },
          { key: txiKey, size: 4, etag: "txi-hash" }
        ],
        truncated: false,
        continuationToken: undefined
      });
      moduleBlobStorage.getModuleObject.mockImplementation(async (_settings, key) => {
        if (key === derivedKey) {
          const bytes = buildGlbWithTextureReferences(["pee"]);
          return {
            key,
            size: bytes.length,
            contentType: "model/gltf-binary",
            bytes
          };
        }
        if (key === txiKey) {
          return {
            key,
            size: 4,
            contentType: "application/octet-stream",
            etag: "txi-hash",
            bytes: Buffer.from("txi\n")
          };
        }
        const stored = storedObjects.get(key);
        return stored
          ? {
              key,
              size: stored.bytes.length,
              contentType: stored.contentType,
              etag: stored.etag,
              bytes: stored.bytes
            }
          : null;
      });
      putModuleObject.mockImplementation(async (_settings, file) => {
        const normalizedFileName = file.fileName.replace(/\\/gu, "/").replace(/^\/+/u, "");
        const key = `modules/current/${normalizedFileName}`;
        const bytes = Buffer.from(file.bytes);
        const etag = `etag-${storedObjects.size + 1}`;
        storedObjects.set(key, {
          bytes,
          contentType: "application/octet-stream",
          etag
        });
        return { key, size: bytes.length, etag };
      });

      repository.findByKindAndId.mockResolvedValue({
        ...buildTemplate("placeable", "plc_pee_001"),
        resref: "zlc_pee",
        placeableSubtype: "generic",
        metadata: {
          lookupModelResRef: "zlc_pee"
        }
      });
      placeableCache.get.mockResolvedValue(null);
      placeableCache.set.mockImplementation(async (key, value) => ({
        key,
        value,
        storedAt: "2026-05-24T10:10:00.000Z",
        hits: 0
      }));

      const serviceWithBlob = new CatalogApplicationService(
        repository,
        placeableCache,
        undefined,
        runtimeSettingsRepository,
        moduleBlobStorage
      );

      const result = await serviceWithBlob.processPlaceable({
        templateId: "plc_pee_001",
        bypassCache: false,
        includeBenchmarkMetadata: true
      });

      expect(result.placeable.assetManifest.assets).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            role: "material",
            fileName: "pee.txi"
          }),
          expect.objectContaining({
            role: "texture",
            fileName: "pee.tga"
          })
        ])
      );
      const textureAsset = result.placeable.assetManifest.assets.find(
        (asset) => asset.fileName === "pee.tga"
      );
      expect(result.placeable.renderPackage?.textureUrls).toContain(
        `/api/v1/catalog/placeables/cache/${result.cache.key}/assets/${textureAsset?.assetId}.tga`
      );
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it("falls back to source model texture references when lightweight batch GLB metadata is empty", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "aurora-placeable-source-material-hak-"));
    const hakPath = join(tempRoot, "materials.hak");
    await writeFile(
      hakPath,
      buildHakV10File([
        {
          resref: "mat_ref",
          restype: 2072,
          bytes: Buffer.from("texture0 mat_ref_d\n", "utf-8")
        },
        { resref: "mat_ref_d", restype: 2033, bytes: Buffer.from([1, 2, 3]) }
      ])
    );

    try {
      const settings = buildRuntimeSettingsRecord();
      settings.paths.hakDirectoryPath = tempRoot;
      settings.paths.moduleDecompiledPath = "";
      settings.sources.placeable.includeHaks = true;
      settings.sources.placeable.includeVanilla = false;
      settings.sources.placeable.hakProfileId = "lc_models";
      settings.hakProfiles.lc_models = ["materials.hak"];
      const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
        get: jest.fn().mockResolvedValue(settings),
        save: jest.fn()
      };
      const storedObjects = new Map<
        string,
        { bytes: Buffer; contentType: string; etag: string }
      >();
      const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
        replaceModuleSnapshot: jest.fn(),
        listModuleSnapshot: jest.fn(),
        getModuleObject: jest.fn(),
        putModuleObject: jest.fn()
      };
      const putModuleObject =
        moduleBlobStorage.putModuleObject as jest.MockedFunction<
          NonNullable<ModuleBlobStoragePort["putModuleObject"]>
        >;
      const derivedKey = "modules/current/__aurora/derived/models/plc_source_material.glb";
      const sourceKey =
        "modules/current/__aurora/sources/hak/materials/plc_source_material.mdl";
      moduleBlobStorage.listModuleSnapshot.mockResolvedValue({
        bucket: "aurora-module-assets",
        prefix: "modules/current/",
        moduleHash: "hash-source-material-fallback",
        totalFiles: 2,
        totalBytes: 240,
        objects: [
          { key: derivedKey, size: 120, etag: "derived-hash" },
          { key: sourceKey, size: 120, etag: "source-hash" }
        ],
        truncated: false,
        continuationToken: undefined
      });
      moduleBlobStorage.getModuleObject.mockImplementation(async (_settings, key) => {
        if (key === derivedKey) {
          const bytes = buildGlbFromJson({ asset: { version: "2.0" } });
          return {
            key,
            size: bytes.length,
            contentType: "model/gltf-binary",
            bytes
          };
        }
        if (key === sourceKey) {
          const bytes = Buffer.from(
            [
              "newmodel plc_source_material",
              "beginmodelgeom plc_source_material",
              "node trimesh mesh01",
              "  texture0 mat_ref",
              "endnode",
              "endmodelgeom plc_source_material"
            ].join("\n"),
            "utf-8"
          );
          return {
            key,
            size: bytes.length,
            contentType: "application/octet-stream",
            bytes
          };
        }
        const stored = storedObjects.get(key);
        return stored
          ? {
              key,
              size: stored.bytes.length,
              contentType: stored.contentType,
              etag: stored.etag,
              bytes: stored.bytes
            }
          : null;
      });
      putModuleObject.mockImplementation(async (_settings, file) => {
        const normalizedFileName = file.fileName.replace(/\\/gu, "/").replace(/^\/+/u, "");
        const key = `modules/current/${normalizedFileName}`;
        const bytes = Buffer.from(file.bytes);
        const etag = `etag-${storedObjects.size + 1}`;
        storedObjects.set(key, {
          bytes,
          contentType: "application/octet-stream",
          etag
        });
        return { key, size: bytes.length, etag };
      });

      repository.findByKindAndId.mockResolvedValue({
        ...buildTemplate("placeable", "plc_source_material_001"),
        resref: "plc_source_material",
        placeableSubtype: "generic",
        metadata: {
          lookupModelResRef: "plc_source_material"
        }
      });
      placeableCache.get.mockResolvedValue(null);
      placeableCache.set.mockImplementation(async (key, value) => ({
        key,
        value,
        storedAt: "2026-05-24T10:10:00.000Z",
        hits: 0
      }));

      const serviceWithBlob = new CatalogApplicationService(
        repository,
        placeableCache,
        undefined,
        runtimeSettingsRepository,
        moduleBlobStorage
      );

      const result = await serviceWithBlob.processPlaceable(
        {
          templateId: "plc_source_material_001",
          bypassCache: false,
          includeBenchmarkMetadata: true
        },
        {
          allowExpensiveSourceReferenceScans: false,
          allowOnDemandTextureLookup: true
        }
      );

      expect(moduleBlobStorage.putModuleObject).toHaveBeenCalledTimes(2);
      expect(result.placeable.assetManifest.assets).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            role: "material",
            fileName: "mat_ref.mtr"
          }),
          expect.objectContaining({
            role: "texture",
            fileName: "mat_ref_d.dds"
          })
        ])
      );
      expect(result.placeable.renderPackage?.textureUrls).toHaveLength(1);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it("adds blob texture assets from standard gltf image URI references in derived glb", async () => {
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
      moduleHash: "hash-standard-gltf-image-uri",
      totalFiles: 2,
      totalBytes: 136,
      objects: [
        {
          key: "modules/current/__aurora/derived/models/plc_image_uri.glb",
          size: 120,
          etag: "derived-hash"
        },
        {
          key: "modules/current/__aurora/sources/hak/lc_core/textures/tx_image_uri.dds",
          size: 16,
          etag: "texture-hash"
        }
      ],
      truncated: false,
      continuationToken: undefined
    });
    moduleBlobStorage.getModuleObject.mockImplementation(async (_settings, key) => {
      if (key !== "modules/current/__aurora/derived/models/plc_image_uri.glb") {
        return null;
      }
      const bytes = buildGlbFromJson({
        asset: { version: "2.0", generator: "catalog-test" },
        images: [
          { uri: "textures/tx_image_uri.dds" },
          { uri: "data:image/png;base64,ignored" }
        ],
        materials: [
          {
            pbrMetallicRoughness: {
              baseColorTexture: { index: 0 }
            }
          }
        ]
      });
      return {
        key,
        size: bytes.length,
        contentType: "model/gltf-binary",
        bytes
      };
    });

    repository.findByKindAndId.mockResolvedValue({
      ...buildTemplate("placeable", "plc_image_uri_001"),
      resref: "plc_image_uri",
      placeableSubtype: "generic",
      metadata: {
        lookupModelResRef: "plc_image_uri"
      }
    });
    placeableCache.get.mockResolvedValue(null);
    placeableCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-05-24T10:10:00.000Z",
      hits: 0
    }));

    const serviceWithBlob = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage
    );

    const result = await serviceWithBlob.processPlaceable({
      templateId: "plc_image_uri_001",
      bypassCache: false,
      includeBenchmarkMetadata: true
    });

    expect(result.placeable.placeableSubtype).toBe("generic");
    const textureAsset = result.placeable.assetManifest.assets.find(
      (asset) => asset.fileName === "tx_image_uri.dds"
    );
    expect(textureAsset).toMatchObject({
      role: "texture",
      objectKey: "modules/current/__aurora/sources/hak/lc_core/textures/tx_image_uri.dds"
    });
    expect(result.placeable.renderPackage?.textureUrls).toContain(
      `/api/v1/catalog/placeables/cache/${result.cache.key}/assets/${textureAsset!.assetId}.dds`
    );
  });

  it("orders render package texture urls by Aurora source priority when blob textures collide", async () => {
    const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
      get: jest.fn(),
      save: jest.fn()
    };
    const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
      replaceModuleSnapshot: jest.fn(),
      listModuleSnapshot: jest.fn(),
      getModuleObject: jest.fn()
    };
    const settings = buildRuntimeSettingsRecord();
    settings.sources.placeable.includeHaks = true;
    settings.sources.placeable.hakPriorityList = ["lc_high.hak", "lc_low.hak"];
    runtimeSettingsRepository.get.mockResolvedValue(settings);
    moduleBlobStorage.listModuleSnapshot.mockResolvedValue({
      bucket: "aurora-module-assets",
      prefix: "modules/current/",
      moduleHash: "hash-texture-priority",
      totalFiles: 5,
      totalBytes: 184,
      objects: [
        {
          key: "modules/current/__aurora/derived/models/plc_priority.glb",
          size: 120,
          etag: "derived-hash"
        },
        {
          key: "modules/current/__aurora/sources/vanilla/textures/tx_shared.dds",
          size: 16,
          etag: "vanilla"
        },
        {
          key: "modules/current/__aurora/sources/hak/lc_low/textures/tx_shared.dds",
          size: 16,
          etag: "hak-low"
        },
        {
          key: "modules/current/textures/tx_shared.dds",
          size: 16,
          etag: "module"
        },
        {
          key: "modules/current/__aurora/sources/hak/lc_high/textures/tx_shared.dds",
          size: 16,
          etag: "hak-high"
        }
      ],
      truncated: false,
      continuationToken: undefined
    });
    moduleBlobStorage.getModuleObject.mockImplementation(async (_settings, key) => {
      if (key !== "modules/current/__aurora/derived/models/plc_priority.glb") {
        return null;
      }
      const bytes = buildGlbWithTextureReferences(["tx_shared"]);
      return {
        key,
        size: bytes.length,
        contentType: "model/gltf-binary",
        bytes
      };
    });

    repository.findByKindAndId.mockResolvedValue({
      ...buildTemplate("placeable", "plc_priority_001"),
      resref: "plc_priority",
      placeableSubtype: "generic",
      metadata: {
        lookupModelResRef: "plc_priority"
      }
    });
    placeableCache.get.mockResolvedValue(null);
    placeableCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-05-24T10:10:00.000Z",
      hits: 0
    }));

    const serviceWithBlob = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage
    );

    const result = await serviceWithBlob.processPlaceable({
      templateId: "plc_priority_001",
      bypassCache: false,
      includeBenchmarkMetadata: true
    });

    const textureAssetsByObjectKey = new Map(
      result.placeable.assetManifest.assets
        .filter((asset) => asset.role === "texture")
        .map((asset) => [asset.objectKey, asset])
    );
    const expectedTextureAssets = [
      textureAssetsByObjectKey.get("modules/current/textures/tx_shared.dds"),
      textureAssetsByObjectKey.get(
        "modules/current/__aurora/sources/hak/lc_high/textures/tx_shared.dds"
      ),
      textureAssetsByObjectKey.get(
        "modules/current/__aurora/sources/hak/lc_low/textures/tx_shared.dds"
      ),
      textureAssetsByObjectKey.get(
        "modules/current/__aurora/sources/vanilla/textures/tx_shared.dds"
      )
    ];
    expect(expectedTextureAssets.every(Boolean)).toBe(true);
    expect(result.placeable.renderPackage?.textureUrls).toEqual(
      expectedTextureAssets.map(
        (asset) =>
          `/api/v1/catalog/placeables/cache/${result.cache.key}/assets/${asset!.assetId}.dds`
      )
    );
  });

  it("uses texture references from converter-generated multi-material glb to collect blob texture assets", async () => {
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
    const generatedGlb = convertAuroraAsciiMdlToGlb(MULTI_TEXTURE_PLACEABLE_ASCII_MDL).bytes;
    moduleBlobStorage.listModuleSnapshot.mockResolvedValue({
      bucket: "aurora-module-assets",
      prefix: "modules/current/",
      moduleHash: "hash-converter-multi-texture",
      totalFiles: 3,
      totalBytes: generatedGlb.length + 32,
      objects: [
        {
          key: "modules/current/__aurora/derived/models/plc_multi.glb",
          size: generatedGlb.length,
          etag: "derived-hash"
        },
        {
          key: "modules/current/__aurora/sources/hak/lc_core/textures/tx_wood.dds",
          size: 16,
          etag: "wood-texture-hash"
        },
        {
          key: "modules/current/__aurora/sources/hak/lc_core/textures/tx_metal.tga",
          size: 16,
          etag: "metal-texture-hash"
        }
      ],
      truncated: false,
      continuationToken: undefined
    });
    moduleBlobStorage.getModuleObject.mockImplementation(async (_settings, key) => {
      if (key !== "modules/current/__aurora/derived/models/plc_multi.glb") {
        return null;
      }
      return {
        key,
        size: generatedGlb.length,
        contentType: "model/gltf-binary",
        bytes: generatedGlb
      };
    });

    repository.findByKindAndId.mockResolvedValue({
      ...buildTemplate("placeable", "plc_multi_001"),
      resref: "plc_multi",
      placeableSubtype: "generic",
      metadata: {
        lookupModelResRef: "plc_multi"
      }
    });
    placeableCache.get.mockResolvedValue(null);
    placeableCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-05-24T10:10:00.000Z",
      hits: 0
    }));

    const serviceWithBlob = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage
    );

    const result = await serviceWithBlob.processPlaceable({
      templateId: "plc_multi_001",
      bypassCache: false,
      includeBenchmarkMetadata: true
    });

    const textureAssets = result.placeable.assetManifest.assets.filter(
      (asset) => asset.role === "texture"
    );
    expect(textureAssets.map((asset) => asset.fileName)).toEqual([
      "tx_metal.tga",
      "tx_wood.dds"
    ]);
    expect(result.placeable.renderPackage?.textureUrls).toEqual(
      textureAssets.map(
        (asset) =>
          `/api/v1/catalog/placeables/cache/${result.cache.key}/assets/${asset.assetId}.${asset.extension}`
      )
    );
  });

  it("extracts Aurora material bump/env texture tokens from MTR assets", async () => {
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
    moduleBlobStorage.getModuleObject.mockResolvedValue({
      key: "modules/current/materials/fx_smoke.mtr",
      size: 128,
      contentType: "text/plain",
      bytes: Buffer.from(
        [
          "bumpmaptexture fxpa_smoke_bump",
          "bumpyshinytexture fxpa_smoke_shiny",
          "envmaptexture fxpa_smoke_env",
          "bumpreplacementtexture fxpa_smoke_repl",
          "blending additive",
          "blending punchthrough",
          "decal 1",
          "oParam float g_fShadowAlphaCutoff 0.5",
          "oParam int g_iShaderMode 2"
        ].join("\n"),
        "latin1"
      )
    });
    const serviceWithBlob = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage
    );

    const references = await (
      serviceWithBlob as unknown as {
        collectTextureReferencesFromMaterialAssets: (
          assets: Array<{ role: string; objectKey: string }>
        ) => Promise<string[]>;
      }
    ).collectTextureReferencesFromMaterialAssets([
      {
        role: "material",
        objectKey: "modules/current/materials/fx_smoke.mtr"
      }
    ]);

    expect(references).toEqual([
      "fxpa_smoke_bump",
      "fxpa_smoke_env",
      "fxpa_smoke_repl",
      "fxpa_smoke_shiny"
    ]);
    expect(references).not.toEqual(
      expect.arrayContaining([
        "additive",
        "punchthrough",
        "1",
        "g_fshadowalphacutoff",
        "g_ishadermode"
      ])
    );
    expect(moduleBlobStorage.getModuleObject).toHaveBeenCalledWith(
      expect.objectContaining({ bucket: "aurora-module-assets" }),
      "modules/current/materials/fx_smoke.mtr"
    );
  });

  it("extracts Aurora MTR material blending/decal source state", async () => {
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
    moduleBlobStorage.getModuleObject.mockImplementation(async (_settings, key) => {
      const sourceByKey = new Map([
        [
          "modules/current/materials/fx_add.mtr",
          ["blending additive", "decal 0"].join("\n")
        ],
        [
          "modules/current/materials/fx_punch.mtr",
          ["blending punchthrough", "decal 1"].join("\n")
        ],
        [
          "modules/current/materials/fx_unknown.mtr",
          ["blending alpha", "decal maybe"].join("\n")
        ]
      ]);
      const source = sourceByKey.get(key);
      if (!source) {
        return null;
      }
      return {
        key,
        size: source.length,
        contentType: "text/plain",
        bytes: Buffer.from(source, "latin1")
      };
    });
    const serviceWithBlob = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage
    );
    const materialAssets = [
      {
        assetId: "asset_material_add",
        role: "material",
        fileName: "fx_add.mtr",
        objectKey: "modules/current/materials/fx_add.mtr"
      },
      {
        assetId: "asset_material_punch",
        role: "material",
        fileName: "fx_punch.mtr",
        objectKey: "modules/current/materials/fx_punch.mtr"
      },
      {
        assetId: "asset_material_unknown",
        role: "material",
        fileName: "fx_unknown.mtr",
        objectKey: "modules/current/materials/fx_unknown.mtr"
      }
    ];

    const auroraMaterial = await (
      serviceWithBlob as unknown as {
        collectAuroraMaterialPayloadFromMaterialAssets: (
          assets: Array<{
            assetId: string;
            role: string;
            fileName: string;
            objectKey: string;
          }>
        ) => Promise<PlaceableRenderPackage["auroraMaterial"] | undefined>;
      }
    ).collectAuroraMaterialPayloadFromMaterialAssets(materialAssets);

    expect(auroraMaterial).toEqual({
      source: "mtr",
      materials: [
        {
          source: "aurora-mtr",
          materialAssetId: "asset_material_add",
          materialFileName: "fx_add.mtr",
          materialObjectKey: "modules/current/materials/fx_add.mtr",
          state: {
            blending: "additive",
            auroraBlendField48: 0,
            auroraBlendField4c: 2,
            decal: false
          }
        },
        {
          source: "aurora-mtr",
          materialAssetId: "asset_material_punch",
          materialFileName: "fx_punch.mtr",
          materialObjectKey: "modules/current/materials/fx_punch.mtr",
          state: {
            blending: "punchthrough",
            auroraBlendField48: 2,
            auroraBlendField4c: 3,
            decal: true
          }
        }
      ],
      diagnostics: []
    });

    const decorated = await (
      serviceWithBlob as unknown as {
        decorateRenderPackageWithAuroraMaterial: (
          assetManifest: { assets: typeof materialAssets },
          renderPackage: PlaceableRenderPackage,
          subtype?: string
        ) => Promise<PlaceableRenderPackage>;
      }
    ).decorateRenderPackageWithAuroraMaterial(
      { assets: materialAssets },
      {
        status: "missing_derived",
        diagnostics: [],
        assetRefs: {
          materialAssetIds: ["asset_material_add", "asset_material_punch"]
        }
      },
      "vfx"
    );

    expect(decorated.status).toBe("missing_derived");
    expect(decorated.auroraMaterial).toEqual(auroraMaterial);
    expect(decorated.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "VFX_AURORA_MTR_MATERIAL_STATE_PRESERVED"
        })
      ])
    );
  });

  it("extracts emitter texture references from binary source MDL when derived model is missing", async () => {
    const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
      get: jest.fn(),
      save: jest.fn()
    };
    const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
      replaceModuleSnapshot: jest.fn(),
      listModuleSnapshot: jest.fn(),
      getModuleObject: jest.fn(),
      putModuleObject: jest.fn()
    };
    const derivedAssetGenerator: jest.Mocked<DerivedAssetGeneratorPort> = {
      generateDerivedAssets: jest.fn()
    };
    runtimeSettingsRepository.get.mockResolvedValue(buildRuntimeSettingsRecord());
    const sourceModelBytes = buildEmitterOnlyBinaryMdl("fxpa_smoke01", {
      emitterType: "Fountain",
      renderMode: "Billboard_to_World_Z",
      blendMode: "Normal",
      xGridRaw: 4,
      yGridRaw: 4,
      fps: 12,
      frameStart: 1,
      frameEnd: 15,
      spawnType: 1,
      chunkName: "red_m_giblet",
      twoSidedTexture: true,
      loop: true,
      renderOrder: -3,
      random: true,
      isTinted: false,
      splat: true,
      controllerRows: 2,
      simulation: {
        xSize: 60,
        ySize: 40,
        birthrate: 5,
        lifeExp: 1.5,
        mass: -0.25,
        velocity: 3,
        randvel: 1,
        spread: 6.28,
        particleRot: 0.75,
        bounce: true,
        bounceCoefficient: 0.33,
        blurLength: 2,
        deadspace: 0.25,
        p2p: true,
        p2pBezier: true,
        p2pBezier2: 0.2,
        p2pBezier3: 0.8,
        combineTime: 0.4,
        grav: 2,
        drag: 1,
        threshold: 1.5,
        inherit: true,
        inheritVel: true,
        inheritLocal: true,
        inheritPart: true,
        affectedByWind: true,
        sizeStart: 0.5,
        sizeMid: 0.75,
        sizeEnd: 0.1,
        sizeStartY: 0.6,
        sizeMidY: 0.8,
        sizeEndY: 0.2,
        alphaStart: 1,
        alphaMid: 0.5,
        alphaEnd: 0,
        colorStart: [1, 0.4, 0],
        colorMid: [0.5, 0.2, 0],
        colorEnd: [0.2, 0.1, 0],
        percentStart: 0.1,
        percentMid: 0.6,
        percentEnd: 0.9
      },
      transform: {
        position: [0, 0, 5],
        orientationQuaternion: [0.7070903778076172, 0, 0, 0.7071231603622437]
      }
    });
    const chunkModelBytes = Buffer.from("newmodel red_m_giblet\n", "latin1");
    const chunkModelGlbBytes = Buffer.from("chunk glb");
    derivedAssetGenerator.generateDerivedAssets.mockImplementation(async (input) => {
      const isChunkModel = input.sourceFiles.some((file) =>
        file.fileName.includes("red_m_giblet.mdl")
      );
      if (!isChunkModel) {
        return {
          files: [],
          summary: {
            generator: "test-generator",
            generatedFiles: 0,
            generatedBytes: 0,
            failureReasons: ["no renderable geometry"]
          }
        };
      }
      return {
        files: [
          {
            fileName: "__aurora/derived/models/red_m_giblet.glb",
            resourceType: 0,
            bytes: chunkModelGlbBytes
          }
        ],
        summary: {
          generator: "test-generator",
          generatedFiles: 1,
          generatedBytes: chunkModelGlbBytes.length
        }
      };
    });
    (moduleBlobStorage.putModuleObject as jest.Mock).mockResolvedValue({
      key: "modules/current/__aurora/derived/models/red_m_giblet.glb",
      etag: "chunk-model-glb",
      size: chunkModelGlbBytes.length
    });
    moduleBlobStorage.listModuleSnapshot.mockResolvedValue({
      bucket: "aurora-module-assets",
      prefix: "modules/current/",
      moduleHash: "hash-source-emitter-texture",
      totalFiles: 3,
      totalBytes: sourceModelBytes.length + chunkModelBytes.length + 16,
      objects: [
        {
          key: "modules/current/models/cot_fx01.mdl",
          size: sourceModelBytes.length,
          etag: "source-model"
        },
        {
          key: "modules/current/models/red_m_giblet.mdl",
          size: chunkModelBytes.length,
          etag: "chunk-model"
        },
        {
          key: "modules/current/textures/fxpa_smoke01.tga",
          size: 16,
          etag: "source-texture"
        }
      ],
      truncated: false,
      continuationToken: undefined
    });
    moduleBlobStorage.getModuleObject.mockImplementation(async (_settings, key) => {
      if (key === "modules/current/models/cot_fx01.mdl") {
        return {
          key,
          size: sourceModelBytes.length,
          contentType: "application/octet-stream",
          bytes: sourceModelBytes
        };
      }
      if (key === "modules/current/models/red_m_giblet.mdl") {
        return {
          key,
          size: chunkModelBytes.length,
          contentType: "application/octet-stream",
          bytes: chunkModelBytes
        };
      }
      if (key === "modules/current/__aurora/derived/models/red_m_giblet.glb") {
        return {
          key,
          size: chunkModelGlbBytes.length,
          contentType: "model/gltf-binary",
          bytes: chunkModelGlbBytes
        };
      }
      return null;
    });

    repository.findByKindAndId.mockResolvedValue({
      ...buildTemplate("placeable", "plc_cot_fx01"),
      resref: "plc_cot_fx01",
      placeableSubtype: "vfx",
      metadata: {
        lookupModelResRef: "cot_fx01"
      }
    });
    placeableCache.get.mockResolvedValue(null);
    placeableCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-05-24T10:10:00.000Z",
      hits: 0
    }));

    const serviceWithBlob = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage,
      derivedAssetGenerator
    );

    const result = await serviceWithBlob.processPlaceable({
      templateId: "plc_cot_fx01",
      bypassCache: false,
      includeBenchmarkMetadata: true
    });

    expect(result.placeable.renderPackage?.status).toBe("ready");
    const textureAsset = result.placeable.assetManifest.assets.find(
      (asset) => asset.fileName === "fxpa_smoke01.tga"
    );
    const chunkModelAsset = result.placeable.assetManifest.assets.find(
      (asset) => asset.fileName === "red_m_giblet.glb"
    );
    const chunkSourceModelAsset = result.placeable.assetManifest.assets.find(
      (asset) => asset.fileName === "red_m_giblet.mdl"
    );
    expect(textureAsset).toBeDefined();
    expect(chunkModelAsset).toBeDefined();
    expect(chunkSourceModelAsset).toBeDefined();
    expect(derivedAssetGenerator.generateDerivedAssets).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceFiles: [
          expect.objectContaining({
            fileName: "modules/current/models/red_m_giblet.mdl",
            bytes: chunkModelBytes
          })
        ]
      })
    );
    expect(result.placeable.renderPackage?.assetRefs.chunkModelAssetIds).toContain(
      chunkModelAsset!.assetId
    );
    expect(
      result.placeable.renderPackage?.diagnostics.map((diagnostic) => diagnostic.code)
    ).toEqual(
      expect.arrayContaining([
        "VFX_CHUNKNAME_OVERRIDES_TEXTURE",
        "VFX_CHUNK_MODEL_RESOURCE_READY"
      ])
    );
    expect(result.placeable.renderPackage?.textureUrls).toContain(
      `/api/v1/catalog/placeables/cache/${result.cache.key}/assets/${textureAsset!.assetId}.tga`
    );
    expect(result.placeable.renderPackage?.auroraEmitter?.emitters[0]).toMatchObject({
      source: "aurora-mdl-binary",
      sourceModelFileName: "cot_fx01.mdl",
      sourceModelObjectKey: "modules/current/models/cot_fx01.mdl",
      nodeName: "emit_smoke",
      texture: "fxpa_smoke01",
      chunkName: "red_m_giblet",
      chunkModelAssetId: chunkModelAsset!.assetId,
      chunkModelFileName: "red_m_giblet.glb",
      chunkModelObjectKey: "modules/current/__aurora/derived/models/red_m_giblet.glb",
      emitterType: "Fountain",
      renderMode: "Billboard_to_World_Z",
      blendMode: "Normal",
      atlas: {
        xGridRaw: 4,
        yGridRaw: 4,
        effectiveXGrid: 4,
        effectiveYGrid: 4,
        fps: 12,
        frameStart: 1,
        frameEnd: 15,
        random: true
      },
      simulation: {
        xSize: 60,
        ySize: 40,
        spawnType: 1,
        birthrate: 5,
        lifeExp: 1.5,
        mass: -0.25,
        velocity: 3,
        randvel: 1,
        spread: expect.closeTo(6.28, 6),
        particleRot: 0.75,
        bounce: true,
        bounceCoefficient: expect.closeTo(0.33, 6),
        blurLength: 2,
        deadspace: 0.25,
        p2p: true,
        p2pType: "bezier",
        p2pBezier2: expect.closeTo(0.2, 6),
        p2pBezier3: expect.closeTo(0.8, 6),
        combineTime: expect.closeTo(0.4, 6),
        grav: 2,
        drag: 1,
        threshold: 1.5,
        inherit: true,
        inheritVel: true,
        inheritLocal: true,
        inheritPart: true,
        affectedByWind: true,
        sizeStart: 0.5,
        sizeMid: 0.75,
        sizeEnd: expect.closeTo(0.1, 6),
        sizeStartY: expect.closeTo(0.6, 6),
        sizeMidY: expect.closeTo(0.8, 6),
        sizeEndY: expect.closeTo(0.2, 6),
        alphaStart: 1,
        alphaMid: 0.5,
        alphaEnd: 0,
        colorStart: [1, expect.closeTo(0.4, 6), 0],
        colorMid: [0.5, expect.closeTo(0.2, 6), 0],
        colorEnd: [expect.closeTo(0.2, 6), expect.closeTo(0.1, 6), 0],
        percentStart: expect.closeTo(0.1, 6),
        percentMid: expect.closeTo(0.6, 6),
        percentEnd: expect.closeTo(0.9, 6)
      },
      sourceState: {
        twoSidedTexture: true,
        loop: true,
        renderOrder: -3,
        isTinted: false,
        splat: true
      },
      transform: {
        position: [0, 0, 5],
        orientation: {
          axis: [1, 0, 0],
          angleRadians: expect.closeTo(1.5707499652607495, 6)
        }
      }
    });
  });

  it("refreshes cached VFX manifests when chunkName model resolution was missing", async () => {
    const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
      get: jest.fn(),
      save: jest.fn()
    };
    const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
      replaceModuleSnapshot: jest.fn(),
      listModuleSnapshot: jest.fn(),
      getModuleObject: jest.fn(),
      putModuleObject: jest.fn()
    };
    const derivedAssetGenerator: jest.Mocked<DerivedAssetGeneratorPort> = {
      generateDerivedAssets: jest.fn()
    };
    runtimeSettingsRepository.get.mockResolvedValue(buildRuntimeSettingsRecord());
    const sourceModelBytes = buildEmitterOnlyBinaryMdl("fxpa_ash01", {
      emitterType: "Explosion",
      renderMode: "Billboard_to_World_Z",
      blendMode: "Lighten",
      chunkName: "fx_lavaspurt",
      simulation: {
        birthrate: 1,
        lifeExp: 4,
        xSize: 900,
        ySize: 900
      }
    });
    const chunkModelBytes = Buffer.from("newmodel fx_lavaspurt\n", "latin1");
    const chunkModelGlbBytes = Buffer.from("lava spurt glb");

    derivedAssetGenerator.generateDerivedAssets.mockResolvedValue({
      files: [
        {
          fileName: "__aurora/derived/models/fx_lavaspurt.glb",
          resourceType: 0,
          bytes: chunkModelGlbBytes
        }
      ],
      summary: {
        generator: "test-generator",
        generatedFiles: 1,
        generatedBytes: chunkModelGlbBytes.length
      }
    });
    (moduleBlobStorage.putModuleObject as jest.Mock).mockResolvedValue({
      key: "modules/current/__aurora/derived/models/fx_lavaspurt.glb",
      etag: "chunk-lava-glb",
      size: chunkModelGlbBytes.length
    });
    moduleBlobStorage.listModuleSnapshot.mockResolvedValue({
      bucket: "aurora-module-assets",
      prefix: "modules/current/",
      moduleHash: "hash-lava-chunk",
      totalFiles: 3,
      totalBytes: sourceModelBytes.length + chunkModelBytes.length + 16,
      objects: [
        {
          key: "modules/current/models/zlc_flr_sprtlava.mdl",
          size: sourceModelBytes.length,
          etag: "source-lava"
        },
        {
          key: "modules/current/models/fx_lavaspurt.mdl",
          size: chunkModelBytes.length,
          etag: "chunk-lava"
        },
        {
          key: "modules/current/textures/fxpa_ash01.tga",
          size: 16,
          etag: "ash-texture"
        }
      ],
      truncated: false,
      continuationToken: undefined
    });
    moduleBlobStorage.getModuleObject.mockImplementation(async (_settings, key) => {
      if (key === "modules/current/models/zlc_flr_sprtlava.mdl") {
        return {
          key,
          size: sourceModelBytes.length,
          contentType: "application/octet-stream",
          bytes: sourceModelBytes
        };
      }
      if (key === "modules/current/models/fx_lavaspurt.mdl") {
        return {
          key,
          size: chunkModelBytes.length,
          contentType: "application/octet-stream",
          bytes: chunkModelBytes
        };
      }
      if (key === "modules/current/__aurora/derived/models/fx_lavaspurt.glb") {
        return {
          key,
          size: chunkModelGlbBytes.length,
          contentType: "model/gltf-binary",
          bytes: chunkModelGlbBytes
        };
      }
      return null;
    });
    repository.findByKindAndId.mockResolvedValue({
      ...buildTemplate("placeable", "plc_zlc_flr_sprtlava"),
      resref: "zlc_flr_sprtlava",
      name: "VFX: Spurts, Lava*",
      placeableSubtype: "vfx",
      metadata: {
        lookupModelResRef: "zlc_flr_sprtlava"
      }
    });

    const staleAsset = {
      assetId: "source-lava-asset",
      role: "model" as const,
      fileName: "zlc_flr_sprtlava.mdl",
      objectKey: "modules/current/models/zlc_flr_sprtlava.mdl",
      extension: "mdl",
      sizeBytes: sourceModelBytes.length,
      contentType: "application/octet-stream",
      etag: "source-lava"
    };
    placeableCache.get.mockResolvedValue({
      key: "cached-lava",
      storedAt: "2026-05-24T10:10:00.000Z",
      hits: 1,
      value: {
        templateId: "plc_zlc_flr_sprtlava",
        resref: "zlc_flr_sprtlava",
        name: "VFX: Spurts, Lava*",
        category: "effects",
        placeableSubtype: "vfx",
        render: {
          backendType: "vfx",
          frontendType: "vfx",
          rendererPreset: "vfx-emitter",
          isDoor: false,
          isVfx: true
        },
        benchmarkCandidate: false,
        metadata: {
          lookupModelResRef: "zlc_flr_sprtlava"
        },
        placeableRuntime: {
          source: {},
          identity: {},
          interaction: {},
          locking: {},
          trap: {},
          state: {}
        },
        placeableValidationIssues: [],
        assetManifest: {
          version: "placeable-asset-manifest/v1",
          source: "module-blob-snapshot",
          generatedAt: "2026-05-24T10:00:00.000Z",
          moduleHash: "hash-lava-chunk",
          assetCount: 1,
          candidatesScanned: 3,
          assets: [staleAsset]
        },
        renderPackage: {
          status: "ready",
          diagnostics: [
            {
              code: "VFX_CHUNK_MODEL_MISSING",
              severity: "warn",
              message: "Chunk model 'fx_lavaspurt' was referenced but was not found."
            }
          ],
          assetRefs: {
            modelAssetIds: [staleAsset.assetId],
            otherAssetIds: [staleAsset.assetId]
          },
          auroraEmitter: {
            source: "source-mdl",
            emitters: [
              {
                source: "aurora-mdl-binary",
                sourceModelAssetId: staleAsset.assetId,
                sourceModelFileName: staleAsset.fileName,
                sourceModelObjectKey: staleAsset.objectKey,
                nodeName: "fx_lavabase01",
                texture: "fxpa_ash01",
                chunkName: "fx_lavaspurt",
                emitterType: "Explosion",
                renderMode: "Billboard_to_World_Z"
              }
            ],
            diagnostics: []
          }
        },
        classification: {
          source: "template",
          normalizedSubtype: "vfx",
          mismatchWithTemplate: false
        },
        processedAt: "2026-05-24T10:00:00.000Z"
      }
    });
    placeableCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-05-24T10:20:00.000Z",
      hits: 0
    }));

    const serviceWithBlob = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage,
      derivedAssetGenerator
    );

    const result = await serviceWithBlob.processPlaceable({
      templateId: "plc_zlc_flr_sprtlava",
      bypassCache: false,
      includeBenchmarkMetadata: true
    });

    const chunkModelAsset = result.placeable.assetManifest.assets.find(
      (asset) => asset.fileName === "fx_lavaspurt.glb"
    );
    expect(chunkModelAsset).toBeDefined();
    expect(placeableCache.set).toHaveBeenCalled();
    expect(result.placeable.renderPackage?.assetRefs.chunkModelAssetIds).toContain(
      chunkModelAsset!.assetId
    );
    expect(result.placeable.renderPackage?.auroraEmitter?.emitters[0]).toMatchObject({
      chunkName: "fx_lavaspurt",
      chunkModelAssetId: chunkModelAsset!.assetId,
      chunkModelFileName: "fx_lavaspurt.glb"
    });
    expect(
      result.placeable.renderPackage?.diagnostics.map((diagnostic) => diagnostic.code)
    ).toEqual(
      expect.arrayContaining([
        "VFX_CHUNKNAME_OVERRIDES_TEXTURE",
        "VFX_CHUNK_MODEL_RESOURCE_READY"
      ])
    );
    expect(
      result.placeable.renderPackage?.diagnostics.map((diagnostic) => diagnostic.code)
    ).not.toContain("VFX_CHUNK_MODEL_MISSING");
  });

  it("preserves binary Aurora emitter birthrate keyframes instead of collapsing animated VFX to the first row", async () => {
    const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
      get: jest.fn(),
      save: jest.fn()
    };
    const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
      replaceModuleSnapshot: jest.fn(),
      listModuleSnapshot: jest.fn(),
      getModuleObject: jest.fn(),
      putModuleObject: jest.fn()
    };
    const derivedAssetGenerator: jest.Mocked<DerivedAssetGeneratorPort> = {
      generateDerivedAssets: jest.fn()
    };
    runtimeSettingsRepository.get.mockResolvedValue(buildRuntimeSettingsRecord());
    derivedAssetGenerator.generateDerivedAssets.mockResolvedValue({
      files: [],
      summary: {
        generator: "test-generator",
        generatedFiles: 0,
        generatedBytes: 0,
        failureReasons: ["no renderable geometry"]
      }
    });

    const sourceModelBytes = buildEmitterOnlyBinaryMdl("fxpa_keyed_birth", {
      emitterType: "Fountain",
      renderMode: "Normal",
      blendMode: "Lighten",
      simulation: {
        birthrateKeyframes: [
          [0, 0],
          [0.25, 18],
          [1, 0]
        ],
        lifeExp: 1.5,
        sizeStartKeyframes: [
          [0, 0],
          [0.5, 3],
          [1, 1]
        ],
        sizeEnd: 1,
        alphaStartKeyframes: [
          [0, 0],
          [0.25, 1],
          [1, 0]
        ],
        alphaEnd: 0,
        colorStartKeyframes: [
          [0, 1, 0, 0],
          [0.5, 0, 1, 0],
          [1, 0, 0, 1]
        ],
        colorMidKeyframes: [
          [0, 1, 1, 0],
          [1, 0, 1, 1]
        ],
        colorEndKeyframes: [
          [0, 0.2, 0, 0],
          [1, 0, 0.2, 0]
        ],
        percentStartKeyframes: [
          [0, 0],
          [1, 0.1]
        ],
        percentMidKeyframes: [
          [0, 0.4],
          [1, 0.6]
        ],
        percentEndKeyframes: [
          [0, 0.8],
          [1, 1]
        ]
      }
    });
    moduleBlobStorage.listModuleSnapshot.mockResolvedValue({
      bucket: "aurora-module-assets",
      prefix: "modules/current/",
      moduleHash: "hash-keyed-emitter",
      totalFiles: 3,
      totalBytes: sourceModelBytes.length + 16 + 12,
      objects: [
        {
          key: "modules/current/models/plc_keyed_birth.mdl",
          size: sourceModelBytes.length,
          etag: "source-model"
        },
        {
          key: "modules/current/__aurora/derived/models/plc_keyed_birth.glb",
          size: 12,
          etag: "stale-primary-derived"
        },
        {
          key: "modules/current/textures/fxpa_keyed_birth.tga",
          size: 16,
          etag: "source-texture"
        }
      ],
      truncated: false,
      continuationToken: undefined
    });
    moduleBlobStorage.getModuleObject.mockImplementation(async (_settings, key) => {
      if (key === "modules/current/models/plc_keyed_birth.mdl") {
        return {
          key,
          size: sourceModelBytes.length,
          contentType: "application/octet-stream",
          bytes: sourceModelBytes
        };
      }
      return null;
    });
    repository.findByKindAndId.mockResolvedValue({
      ...buildTemplate("placeable", "plc_keyed_birth"),
      resref: "plc_keyed_birth",
      placeableSubtype: "vfx",
      metadata: {
        lookupModelResRef: "plc_keyed_birth"
      }
    });
    placeableCache.get.mockResolvedValue(null);
    placeableCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-05-24T10:10:00.000Z",
      hits: 0
    }));

    const serviceWithBlob = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage,
      derivedAssetGenerator
    );

    const result = await serviceWithBlob.processPlaceable({
      templateId: "plc_keyed_birth",
      bypassCache: false,
      includeBenchmarkMetadata: true
    });

    expect(derivedAssetGenerator.generateDerivedAssets).not.toHaveBeenCalled();
    expect(result.placeable.renderPackage?.status).toBe("ready");
    expect(
      result.placeable.renderPackage?.diagnostics.map((diagnostic) => diagnostic.code)
    ).toEqual(
      expect.arrayContaining([
        "PLACEABLE_RENDER_READY",
        "VFX_AURORA_MDL_EMITTER_PAYLOAD_READY",
        "VFX_AURORA_MDL_EMITTER_PREVIEW_NON_CANONICAL"
      ])
    );
    expect(
      result.placeable.renderPackage?.diagnostics.map((diagnostic) => diagnostic.code)
    ).not.toContain("PLACEABLE_RENDER_DERIVED_MISSING");
    expect(
      result.placeable.renderPackage?.diagnostics.map((diagnostic) => diagnostic.code)
    ).not.toContain("VFX_PROJECT_RENDER_PACKAGE_NOT_RUNTIME_PARITY");
    expect(result.placeable.renderPackage?.assetRefs.derivedModelAssetIds).toBeUndefined();
    expect(result.placeable.renderPackage?.glbUrl).toBeUndefined();

    const emitter = result.placeable.renderPackage?.auroraEmitter?.emitters[0];
    expect(emitter?.simulation?.birthrate).toBe(0);
    expect(emitter?.simulation?.timeline?.birthrate).toEqual([
      { time: 0, value: 0 },
      { time: expect.closeTo(0.25, 6), value: 18 },
      { time: 1, value: 0 }
    ]);
    expect(emitter?.simulation?.timeline?.sizeStart).toEqual([
      { time: 0, value: 0 },
      { time: expect.closeTo(0.5, 6), value: 3 },
      { time: 1, value: 1 }
    ]);
    expect(emitter?.simulation?.timeline?.alphaStart).toEqual([
      { time: 0, value: 0 },
      { time: expect.closeTo(0.25, 6), value: 1 },
      { time: 1, value: 0 }
    ]);
    expect(emitter?.simulation?.colorStart).toEqual([1, 0, 0]);
    expect(emitter?.simulation?.colorMid).toEqual([1, 1, 0]);
    expect(emitter?.simulation?.colorTimeline?.colorStart).toEqual([
      { time: 0, value: [1, 0, 0] },
      { time: expect.closeTo(0.5, 6), value: [0, 1, 0] },
      { time: 1, value: [0, 0, 1] }
    ]);
    expect(emitter?.simulation?.colorTimeline?.colorMid).toEqual([
      { time: 0, value: [1, 1, 0] },
      { time: 1, value: [0, 1, 1] }
    ]);
    expect(emitter?.simulation?.colorTimeline?.colorEnd).toEqual([
      { time: 0, value: [expect.closeTo(0.2, 6), 0, 0] },
      { time: 1, value: [0, expect.closeTo(0.2, 6), 0] }
    ]);
    expect(emitter?.simulation?.timeline?.percentStart).toEqual([
      { time: 0, value: 0 },
      { time: 1, value: expect.closeTo(0.1, 6) }
    ]);
    expect(emitter?.simulation?.timeline?.percentMid).toEqual([
      { time: 0, value: expect.closeTo(0.4, 6) },
      { time: 1, value: expect.closeTo(0.6, 6) }
    ]);
    expect(emitter?.simulation?.timeline?.percentEnd).toEqual([
      { time: 0, value: expect.closeTo(0.8, 6) },
      { time: 1, value: 1 }
    ]);
  });

  it("promotes source MDL light-node VFX without derived model assets", async () => {
    const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
      get: jest.fn(),
      save: jest.fn()
    };
    const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
      replaceModuleSnapshot: jest.fn(),
      listModuleSnapshot: jest.fn(),
      getModuleObject: jest.fn(),
      putModuleObject: jest.fn()
    };
    const derivedAssetGenerator: jest.Mocked<DerivedAssetGeneratorPort> = {
      generateDerivedAssets: jest.fn()
    };
    runtimeSettingsRepository.get.mockResolvedValue(buildRuntimeSettingsRecord());
    derivedAssetGenerator.generateDerivedAssets.mockResolvedValue({
      files: [],
      summary: {
        generator: "test-generator",
        generatedFiles: 0,
        generatedBytes: 0,
        failureReasons: ["no renderable geometry"]
      }
    });

    const sourceModel = Buffer.from(
      [
        "#MAXMODEL ASCII",
        "newmodel dlp_light_08",
        "beginmodelgeom dlp_light_08",
        "node dummy dlp_light_08",
        "  parent NULL",
        "endnode",
        "node light pulsing_light03",
        "  parent dlp_light_08",
        "  position 0.0 0.0 2.5",
        "  radius 3.0",
        "  multiplier 3.0",
        "  color 0.0 0.592157 0.141176",
        "  ambientonly 0",
        "  nDynamicType 1",
        "  affectDynamic 1",
        "  shadow 1",
        "  lightpriority 2",
        "  lensflares 0",
        "  fadingLight 0",
        "endnode",
        "endmodelgeom dlp_light_08",
        "newanim default dlp_light_08",
        " length 4.66667",
        " transtime 0.25",
        "animroot dlp_light_08",
        "node light pulsing_light03",
        "  parent dlp_light_08",
        "    positionkey",
        "      0.0  0.0 0.0 2.5",
        "      4.66667  0.0 0.0 2.5",
        "    endlist",
        "    colorkey",
        "      0.0   0.0392157 0.6 0.164706",
        "      2.33333   0.0 1.0 0.164706",
        "      4.66667   0.0392157 0.6 0.164706",
        "    endlist",
        "    radiuskey",
        "      0.0   3.0",
        "      2.33333   10.0",
        "      4.66667   3.0",
        "    endlist",
        "endnode",
        "doneanim default dlp_light_08",
        "donemodel dlp_light_08"
      ].join("\n")
    );
    moduleBlobStorage.listModuleSnapshot.mockResolvedValue({
      bucket: "aurora-module-assets",
      prefix: "modules/current/",
      moduleHash: "hash-light-node-vfx",
      totalFiles: 1,
      totalBytes: sourceModel.length,
      objects: [
        {
          key: "modules/current/models/dlp_light_08.mdl",
          size: sourceModel.length,
          etag: "source-light-model"
        }
      ],
      truncated: false,
      continuationToken: undefined
    });
    moduleBlobStorage.getModuleObject.mockImplementation(async (_settings, key) => {
      if (key === "modules/current/models/dlp_light_08.mdl") {
        return {
          key,
          size: sourceModel.length,
          contentType: "application/octet-stream",
          bytes: sourceModel
        };
      }
      return null;
    });
    repository.findByKindAndId.mockResolvedValue({
      ...buildTemplate("placeable", "plc_dlp_light_08"),
      resref: "dlp_light_08",
      name: "VFX: Pulse Light, Green*",
      placeableSubtype: "vfx",
      metadata: {
        lookupModelResRef: "dlp_light_08"
      }
    });
    placeableCache.get.mockResolvedValue(null);
    placeableCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-05-24T10:10:00.000Z",
      hits: 0
    }));

    const serviceWithBlob = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage,
      derivedAssetGenerator
    );

    const result = await serviceWithBlob.processPlaceable({
      templateId: "plc_dlp_light_08",
      bypassCache: false,
      includeBenchmarkMetadata: true
    });

    const renderPackage = result.placeable.renderPackage;
    expect(renderPackage?.status).toBe("ready");
    expect(renderPackage?.glbUrl).toBeUndefined();
    expect(renderPackage?.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(
      expect.arrayContaining([
        "PLACEABLE_RENDER_READY",
        "VFX_AURORA_MDL_LIGHT_PAYLOAD_READY",
        "VFX_AURORA_MDL_LIGHT_PREVIEW_NON_CANONICAL"
      ])
    );
    expect(renderPackage?.diagnostics.map((diagnostic) => diagnostic.code)).not.toContain(
      "PLACEABLE_RENDER_DERIVED_MISSING"
    );
    expect(renderPackage?.diagnostics.map((diagnostic) => diagnostic.code)).not.toContain(
      "VFX_AURORA_MDL_EMITTER_PAYLOAD_MISSING"
    );

    const light = renderPackage?.auroraLight?.lights[0];
    expect(light).toMatchObject({
      source: "aurora-mdl-ascii",
      sourceModelFileName: "dlp_light_08.mdl",
      nodeName: "pulsing_light03",
      parentNodeName: "dlp_light_08",
      radius: 3,
      multiplier: 3,
      color: [0, expect.closeTo(0.592157, 6), expect.closeTo(0.141176, 6)],
      ambientOnly: false,
      dynamicType: 1,
      affectDynamic: true,
      shadow: true,
      lightPriority: 2
    });
    expect(light?.transform?.position).toEqual([0, 0, 2.5]);
    expect(light?.animations?.[0]).toMatchObject({
      animationName: "default",
      lengthSeconds: expect.closeTo(4.66667, 6),
      transitionSeconds: expect.closeTo(0.25, 6),
      positionTimeline: [
        { time: 0, value: [0, 0, 2.5] },
        { time: expect.closeTo(4.66667, 6), value: [0, 0, 2.5] }
      ],
      colorTimeline: [
        { time: 0, value: [expect.closeTo(0.0392157, 6), 0.6, expect.closeTo(0.164706, 6)] },
        { time: expect.closeTo(2.33333, 6), value: [0, 1, expect.closeTo(0.164706, 6)] },
        {
          time: expect.closeTo(4.66667, 6),
          value: [expect.closeTo(0.0392157, 6), 0.6, expect.closeTo(0.164706, 6)]
        }
      ],
      radiusTimeline: [
        { time: 0, value: 3 },
        { time: expect.closeTo(2.33333, 6), value: 10 },
        { time: expect.closeTo(4.66667, 6), value: 3 }
      ]
    });
  });

  it("preserves binary Aurora emitter animation-state controllers from source MDL animation roots", async () => {
    const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
      get: jest.fn(),
      save: jest.fn()
    };
    const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
      replaceModuleSnapshot: jest.fn(),
      listModuleSnapshot: jest.fn(),
      getModuleObject: jest.fn(),
      putModuleObject: jest.fn()
    };
    const derivedAssetGenerator: jest.Mocked<DerivedAssetGeneratorPort> = {
      generateDerivedAssets: jest.fn()
    };
    runtimeSettingsRepository.get.mockResolvedValue(buildRuntimeSettingsRecord());
    derivedAssetGenerator.generateDerivedAssets.mockResolvedValue({
      files: [],
      summary: {
        generator: "test-generator",
        generatedFiles: 0,
        generatedBytes: 0,
        failureReasons: ["no renderable geometry"]
      }
    });

    const sourceModelBytes = buildEmitterOnlyBinaryMdl("phod_fx_pntgrm", {
      emitterType: "Fountain",
      renderMode: "Billboard_to_World_Z",
      blendMode: "Lighten",
      simulation: {
        birthrate: 3,
        lifeExp: 4,
        alphaEnd: 0.2
      },
      animations: [
        {
          name: "off2on",
          lengthSeconds: 2,
          birthrateValues: [0, 4, 4]
        },
        {
          name: "off",
          lengthSeconds: 2,
          birthrateValues: [0, 0],
          alphaEndValues: [0, 0]
        },
        {
          name: "on",
          lengthSeconds: 2,
          birthrateValues: [4, 4],
          alphaEndValues: [1]
        }
      ]
    });
    moduleBlobStorage.listModuleSnapshot.mockResolvedValue({
      bucket: "aurora-module-assets",
      prefix: "modules/current/",
      moduleHash: "hash-binary-animation-emitter",
      totalFiles: 3,
      totalBytes: sourceModelBytes.length + 16 + 12,
      objects: [
        {
          key: "modules/current/models/phod_fx_pntgrm2.mdl",
          size: sourceModelBytes.length,
          etag: "source-model"
        },
        {
          key: "modules/current/__aurora/derived/models/phod_fx_pntgrm2.glb",
          size: 12,
          etag: "stale-primary-derived"
        },
        {
          key: "modules/current/textures/phod_fx_pntgrm.tga",
          size: 16,
          etag: "source-texture"
        }
      ],
      truncated: false,
      continuationToken: undefined
    });
    moduleBlobStorage.getModuleObject.mockImplementation(async (_settings, key) => {
      if (key === "modules/current/models/phod_fx_pntgrm2.mdl") {
        return {
          key,
          size: sourceModelBytes.length,
          contentType: "application/octet-stream",
          bytes: sourceModelBytes
        };
      }
      return null;
    });
    repository.findByKindAndId.mockResolvedValue({
      ...buildTemplate("placeable", "plc_phod_fx_pntgrm2"),
      resref: "phod_fx_pntgrm2",
      placeableSubtype: "vfx",
      metadata: {
        lookupModelResRef: "phod_fx_pntgrm2"
      }
    });
    placeableCache.get.mockResolvedValue(null);
    placeableCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-05-24T10:10:00.000Z",
      hits: 0
    }));

    const serviceWithBlob = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage,
      derivedAssetGenerator
    );

    const result = await serviceWithBlob.processPlaceable({
      templateId: "plc_phod_fx_pntgrm2",
      bypassCache: false,
      includeBenchmarkMetadata: true
    });

    const emitter = result.placeable.renderPackage?.auroraEmitter?.emitters[0];
    expect(emitter).toMatchObject({
      source: "aurora-mdl-binary",
      nodeName: "emit_smoke",
      texture: "phod_fx_pntgrm",
      simulation: {
        birthrate: 3,
        lifeExp: 4,
        alphaEnd: expect.closeTo(0.2, 6)
      }
    });
    expect(emitter?.animations?.map((animation) => animation.animationName)).toEqual([
      "off2on",
      "off",
      "on"
    ]);
    expect(emitter?.animations?.find((animation) => animation.animationName === "off")).toMatchObject({
      lengthSeconds: 2,
      transitionSeconds: 0,
      simulation: {
        birthrate: 0,
        alphaEnd: 0,
        timeline: {
          birthrate: [
            { time: 0, value: 0 },
            { time: 2, value: 0 }
          ],
          alphaEnd: [
            { time: 0, value: 0 },
            { time: 2, value: 0 }
          ]
        }
      }
    });
    expect(emitter?.animations?.find((animation) => animation.animationName === "on")).toMatchObject({
      lengthSeconds: 2,
      transitionSeconds: 0,
      simulation: {
        birthrate: 4,
        alphaEnd: 1,
        timeline: {
          birthrate: [
            { time: 0, value: 4 },
            { time: 2, value: 4 }
          ]
        }
      }
    });
    expect(
      emitter?.animations?.find((animation) => animation.animationName === "off2on")?.simulation
        ?.timeline?.birthrate
    ).toEqual([
      { time: 0, value: 0 },
      { time: 1, value: 4 },
      { time: 2, value: 4 }
    ]);
  });

  it("preserves ASCII Aurora emitter key controllers from animation blocks", async () => {
    const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
      get: jest.fn(),
      save: jest.fn()
    };
    const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
      replaceModuleSnapshot: jest.fn(),
      listModuleSnapshot: jest.fn(),
      getModuleObject: jest.fn(),
      putModuleObject: jest.fn()
    };
    runtimeSettingsRepository.get.mockResolvedValue(buildRuntimeSettingsRecord());
    const sourceModelBytes = Buffer.from(
      [
        "newmodel plc_ascii_keyed",
        "node emitter keyed_ascii",
        "  update Fountain",
        "  render Normal",
        "  blend Lighten",
        "  texture fxpa_ascii_keyed",
        "  birthrate 0",
        "  lifeExp 2",
        "  sizeStart 0",
        "  sizeEnd 1",
        "  alphaStart 0",
        "  alphaEnd 0",
        "  blastRadius 2.5",
        "  blastLength 1.25",
        "  lightningScale 1.5",
        "  lightningDelay 0.2",
        "  lightningRadius 0.75",
        "  colorMid 1 1 0",
        "  percentStart 0.1",
        "  percentMid 0.6",
        "  percentEnd 0.9",
        "  birthratekey 3",
        "    0.00 0",
        "    0.25 12",
        "    1.00 0",
        "  sizeStartkey 3",
        "    0.00 0",
        "    0.50 3",
        "    1.00 1",
        "  alphaStartkey 3",
        "    0.00 0",
        "    0.25 1",
        "    1.00 0",
        "  colorStartkey 3",
        "    0.00 1 0 0",
        "    0.50 0 1 0",
        "    1.00 0 0 1",
        "  colorEndkey 2",
        "    0.00 0.2 0 0",
        "    1.00 0 0.2 0",
        "  colorMidkey 2",
        "    0.00 1 1 0",
        "    1.00 0 1 1",
        "  percentStartkey 2",
        "    0.00 0",
        "    1.00 0.1",
        "  percentMidkey 2",
        "    0.00 0.4",
        "    1.00 0.6",
        "  percentEndkey 2",
        "    0.00 0.8",
        "    1.00 1",
        "  lightningScalekey 2",
        "    0.00 0.5",
        "    1.00 2.0",
        "  lightningDelaykey 2",
        "    0.00 0.1",
        "    1.00 0.4",
        "  lightningRadiuskey 2",
        "    0.00 0.25",
        "    1.00 1.0",
        "endnode",
        "newanim impact plc_ascii_keyed",
        "  event 0.25 detonate",
        "doneanim"
      ].join("\n"),
      "latin1"
    );
    moduleBlobStorage.listModuleSnapshot.mockResolvedValue({
      bucket: "aurora-module-assets",
      prefix: "modules/current/",
      moduleHash: "hash-ascii-keyed-emitter",
      totalFiles: 2,
      totalBytes: sourceModelBytes.length + 16,
      objects: [
        {
          key: "modules/current/models/plc_ascii_keyed.mdl",
          size: sourceModelBytes.length,
          etag: "source-model"
        },
        {
          key: "modules/current/textures/fxpa_ascii_keyed.tga",
          size: 16,
          etag: "source-texture"
        }
      ],
      truncated: false,
      continuationToken: undefined
    });
    moduleBlobStorage.getModuleObject.mockImplementation(async (_settings, key) => {
      if (key === "modules/current/models/plc_ascii_keyed.mdl") {
        return {
          key,
          size: sourceModelBytes.length,
          contentType: "application/octet-stream",
          bytes: sourceModelBytes
        };
      }
      return null;
    });
    repository.findByKindAndId.mockResolvedValue({
      ...buildTemplate("placeable", "plc_ascii_keyed"),
      resref: "plc_ascii_keyed",
      placeableSubtype: "vfx",
      metadata: {
        lookupModelResRef: "plc_ascii_keyed"
      }
    });
    placeableCache.get.mockResolvedValue(null);
    placeableCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-05-24T10:10:00.000Z",
      hits: 0
    }));

    const serviceWithBlob = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage
    );

    const result = await serviceWithBlob.processPlaceable({
      templateId: "plc_ascii_keyed",
      bypassCache: false,
      includeBenchmarkMetadata: true
    });

    const emitter = result.placeable.renderPackage?.auroraEmitter?.emitters[0];
    expect(emitter).toMatchObject({
      source: "aurora-mdl-ascii",
      nodeName: "keyed_ascii",
      texture: "fxpa_ascii_keyed",
      renderMode: "Normal",
      blendMode: "Lighten",
      simulation: {
        birthrate: 0,
        lifeExp: 2,
        sizeStart: 0,
        alphaStart: 0,
        blastRadius: 2.5,
        blastLength: 1.25,
        lightningScale: 0.5,
        lightningDelay: 0.1,
        lightningRadius: 0.25,
        colorStart: [1, 0, 0],
        colorMid: [1, 1, 0],
        percentStart: 0,
        percentMid: 0.4,
        percentEnd: 0.8
      }
    });
    expect(emitter?.simulation?.timeline?.birthrate).toEqual([
      { time: 0, value: 0 },
      { time: expect.closeTo(0.25, 6), value: 12 },
      { time: 1, value: 0 }
    ]);
    expect(emitter?.simulation?.timeline?.sizeStart).toEqual([
      { time: 0, value: 0 },
      { time: expect.closeTo(0.5, 6), value: 3 },
      { time: 1, value: 1 }
    ]);
    expect(emitter?.simulation?.timeline?.alphaStart).toEqual([
      { time: 0, value: 0 },
      { time: expect.closeTo(0.25, 6), value: 1 },
      { time: 1, value: 0 }
    ]);
    expect(emitter?.simulation?.colorTimeline?.colorStart).toEqual([
      { time: 0, value: [1, 0, 0] },
      { time: expect.closeTo(0.5, 6), value: [0, 1, 0] },
      { time: 1, value: [0, 0, 1] }
    ]);
    expect(emitter?.simulation?.colorTimeline?.colorEnd).toEqual([
      { time: 0, value: [expect.closeTo(0.2, 6), 0, 0] },
      { time: 1, value: [0, expect.closeTo(0.2, 6), 0] }
    ]);
    expect(emitter?.simulation?.colorTimeline?.colorMid).toEqual([
      { time: 0, value: [1, 1, 0] },
      { time: 1, value: [0, 1, 1] }
    ]);
    expect(emitter?.simulation?.timeline?.percentStart).toEqual([
      { time: 0, value: 0 },
      { time: 1, value: expect.closeTo(0.1, 6) }
    ]);
    expect(emitter?.simulation?.timeline?.percentMid).toEqual([
      { time: 0, value: expect.closeTo(0.4, 6) },
      { time: 1, value: expect.closeTo(0.6, 6) }
    ]);
    expect(emitter?.simulation?.timeline?.percentEnd).toEqual([
      { time: 0, value: expect.closeTo(0.8, 6) },
      { time: 1, value: 1 }
    ]);
    expect(emitter?.simulation?.timeline?.lightningScale).toEqual([
      { time: 0, value: expect.closeTo(0.5, 6) },
      { time: 1, value: 2 }
    ]);
    expect(emitter?.simulation?.timeline?.lightningDelay).toEqual([
      { time: 0, value: expect.closeTo(0.1, 6) },
      { time: 1, value: expect.closeTo(0.4, 6) }
    ]);
    expect(emitter?.simulation?.timeline?.lightningRadius).toEqual([
      { time: 0, value: expect.closeTo(0.25, 6) },
      { time: 1, value: 1 }
    ]);
    expect(emitter?.events).toEqual([
      {
        time: expect.closeTo(0.25, 6),
        type: "detonate",
        animationName: "impact"
      }
    ]);
  });

  it("uses Aurora source precedence instead of duplicating identical emitter models from hak and vanilla", async () => {
    const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
      get: jest.fn(),
      save: jest.fn()
    };
    const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
      replaceModuleSnapshot: jest.fn(),
      listModuleSnapshot: jest.fn(),
      getModuleObject: jest.fn(),
      putModuleObject: jest.fn()
    };
    runtimeSettingsRepository.get.mockResolvedValue(buildRuntimeSettingsRecord());
    const hakEmitterBytes = buildEmitterOnlyBinaryMdl("fx_hak_fog", {
      emitterType: "Fountain",
      renderMode: "Billboard_to_World_Z",
      blendMode: "Normal",
      simulation: {
        xSize: 40,
        ySize: 40,
        birthrate: 5,
        lifeExp: 10,
        velocity: 0.2,
        randvel: 0.1,
        spread: 300,
        sizeStart: 14,
        sizeEnd: 26,
        alphaStart: 0.4,
        alphaEnd: 0,
        colorStart: [0.69, 0.69, 0.69],
        colorEnd: [0.68, 0.68, 0.68]
      }
    });
    const vanillaEmitterBytes = buildEmitterOnlyBinaryMdl("fx_vanilla_fog", {
      emitterType: "Fountain",
      renderMode: "Billboard_to_World_Z",
      blendMode: "Normal",
      simulation: {
        xSize: 40,
        ySize: 40,
        birthrate: 1,
        lifeExp: 20,
        velocity: 0.2,
        randvel: 0.1,
        spread: 300,
        sizeStart: 6,
        sizeEnd: 15,
        alphaStart: 0.2,
        alphaEnd: 0,
        colorStart: [0.59, 0.59, 0.59],
        colorEnd: [0.38, 0.38, 0.38]
      }
    });
    moduleBlobStorage.listModuleSnapshot.mockResolvedValue({
      bucket: "aurora-module-assets",
      prefix: "modules/current/",
      moduleHash: "hash-duplicate-vfx-source",
      totalFiles: 4,
      totalBytes: hakEmitterBytes.length + vanillaEmitterBytes.length + 24,
      objects: [
        {
          key: "modules/current/__aurora/sources/vanilla/models/dag_fog_med.mdl",
          size: vanillaEmitterBytes.length,
          etag: "vanilla-model"
        },
        {
          key: "modules/current/__aurora/sources/hak/q_placeables/dag_fog_med.mdl",
          size: hakEmitterBytes.length,
          etag: "hak-model"
        },
        {
          key: "modules/current/__aurora/sources/vanilla/textures/fx_vanilla_fog.tga",
          size: 12,
          etag: "vanilla-texture"
        },
        {
          key: "modules/current/__aurora/sources/hak/q_placeables/textures/fx_hak_fog.tga",
          size: 12,
          etag: "hak-texture"
        }
      ],
      truncated: false,
      continuationToken: undefined
    });
    moduleBlobStorage.getModuleObject.mockImplementation(async (_settings, key) => {
      if (key === "modules/current/__aurora/sources/hak/q_placeables/dag_fog_med.mdl") {
        return {
          key,
          size: hakEmitterBytes.length,
          contentType: "application/octet-stream",
          bytes: hakEmitterBytes
        };
      }
      if (key === "modules/current/__aurora/sources/vanilla/models/dag_fog_med.mdl") {
        return {
          key,
          size: vanillaEmitterBytes.length,
          contentType: "application/octet-stream",
          bytes: vanillaEmitterBytes
        };
      }
      return {
        key,
        size: 12,
        contentType: "image/tga",
        bytes: Buffer.from("texture bytes")
      };
    });

    repository.findByKindAndId.mockResolvedValue({
      ...buildTemplate("placeable", "plc_dag_fog_med"),
      resref: "dag_fog_med",
      placeableSubtype: "vfx",
      metadata: {
        lookupModelResRef: "dag_fog_med"
      }
    });
    placeableCache.get.mockResolvedValue(null);
    placeableCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-05-24T10:10:00.000Z",
      hits: 0
    }));

    const serviceWithBlob = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage
    );

    const result = await serviceWithBlob.processPlaceable({
      templateId: "plc_dag_fog_med",
      bypassCache: false,
      includeBenchmarkMetadata: true
    });

    const emitters = result.placeable.renderPackage?.auroraEmitter?.emitters ?? [];
    expect(emitters).toHaveLength(1);
    expect(emitters[0]).toMatchObject({
      sourceModelFileName: "dag_fog_med.mdl",
      sourceModelObjectKey: "modules/current/__aurora/sources/hak/q_placeables/dag_fog_med.mdl",
      texture: "fx_hak_fog",
      renderMode: "Billboard_to_World_Z",
      simulation: {
        birthrate: 5,
        lifeExp: 10,
        sizeStart: 14,
        sizeEnd: 26
      }
    });
  });

  it("extracts ASCII emitter atlas playback fields from source MDL", async () => {
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
    const sourceModelBytes = Buffer.from(
      [
        "newmodel cot_fx01",
        "node emitter fire!03",
        "  position 0.0466596 -0.126434 0.0124961",
        "  orientation 1.0 0.0 0.0 -1.42244",
        "  update Fountain",
        "  render Billboard_to_World_Z",
        "  Blend Normal",
        "  spawnType 0",
        "  texture fxpa_smoke01",
        "  renderhint normaltangents",
        "  customShaderVS fx_smoke_vs",
        "  customShaderFS fx_smoke_fs",
        "  customShaderGS fx_smoke_gs",
        "  bumpmaptexture fxpa_smoke_bump",
        "  bumpyshinytexture fxpa_smoke_shiny",
        "  envmaptexture fxpa_smoke_env",
        "  bumpreplacementtexture fxpa_smoke_repl",
        "  chunkName Red_M_Giblet",
        "  colorStart 0.392157 0.0 0.0",
        "  colorEnd 0.184314 0.0 0.0",
        "  alphaStart 0.5",
        "  alphaEnd 0.0",
        "  xSize 60.0",
        "  ySize 40.0",
        "  renderorder -3",
        "  transparency 1",
        "  twosided 1",
        "  twosidedtex 1",
        "  sample_framebuffer 2",
        "  volumetric 1",
        "  loop 0",
        "  m_isTinted 0",
        "  splat 1",
        "  rotatetexture 1",
        "  sizeStart 1.0",
        "  sizeMid 4.0",
        "  sizeEnd 6.0",
        "  sizeStart_y 0.0",
        "  sizeMid_y 2.0",
        "  sizeEnd_y 0.0",
        "  birthrate 5",
        "  lifeExp 5.0",
        "  mass -0.75",
        "  spread 1.0472",
        "  particleRot 0.2",
        "  velocity 0.5",
        "  randvel 0.4",
        "  bounce 1",
        "  bounce_co 0.35",
        "  blurlength 1.2",
        "  deadspace 0.25",
        "  p2p 1",
        "  p2p_sel 2",
        "  grav 0.8",
        "  drag 0.3",
        "  threshold 0.4",
        "  inherit 1",
        "  inheritvel 0",
        "  inherit_local 1",
        "  inherit_part 1",
        "  affectedByWind 1",
        "  alphaMid 0.85",
        "  xgrid 4",
        "  ygrid 4",
        "  fps 10",
        "  framestart 0",
        "  frameend 24",
        "  random 1",
        "  node reference REFm",
        "    parent fire!03",
        "    position 0 0 0.63",
        "    orientation 0 0 0 0",
        "  endnode",
        "endnode"
      ].join("\n"),
      "latin1"
    );
    moduleBlobStorage.listModuleSnapshot.mockResolvedValue({
      bucket: "aurora-module-assets",
      prefix: "modules/current/",
      moduleHash: "hash-source-emitter-atlas",
      totalFiles: 6,
      totalBytes: sourceModelBytes.length + 80,
      objects: [
        {
          key: "modules/current/models/cot_fx01.mdl",
          size: sourceModelBytes.length,
          etag: "source-model"
        },
        {
          key: "modules/current/textures/fxpa_smoke01.tga",
          size: 16,
          etag: "source-texture"
        },
        {
          key: "modules/current/textures/fxpa_smoke_bump.tga",
          size: 16,
          etag: "source-bump-texture"
        },
        {
          key: "modules/current/textures/fxpa_smoke_shiny.tga",
          size: 16,
          etag: "source-bumpy-shiny-texture"
        },
        {
          key: "modules/current/textures/fxpa_smoke_env.tga",
          size: 16,
          etag: "source-env-texture"
        },
        {
          key: "modules/current/textures/fxpa_smoke_repl.tga",
          size: 16,
          etag: "source-bump-replacement-texture"
        }
      ],
      truncated: false,
      continuationToken: undefined
    });
    moduleBlobStorage.getModuleObject.mockImplementation(async (_settings, key) => {
      if (key !== "modules/current/models/cot_fx01.mdl") {
        return null;
      }
      return {
        key,
        size: sourceModelBytes.length,
        contentType: "application/octet-stream",
        bytes: sourceModelBytes
      };
    });

    repository.findByKindAndId.mockResolvedValue({
      ...buildTemplate("placeable", "plc_cot_fx01"),
      resref: "plc_cot_fx01",
      placeableSubtype: "vfx",
      metadata: {
        lookupModelResRef: "cot_fx01"
      }
    });
    placeableCache.get.mockResolvedValue(null);
    placeableCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-05-24T10:10:00.000Z",
      hits: 0
    }));

    const serviceWithBlob = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage
    );

    const result = await serviceWithBlob.processPlaceable({
      templateId: "plc_cot_fx01",
      bypassCache: false,
      includeBenchmarkMetadata: true
    });

    const textureFileNames = result.placeable.assetManifest.assets
      .filter((asset) => asset.role === "texture")
      .map((asset) => asset.fileName)
      .sort((left, right) => left.localeCompare(right));
    expect(textureFileNames).toEqual([
      "fxpa_smoke_bump.tga",
      "fxpa_smoke_env.tga",
      "fxpa_smoke_repl.tga",
      "fxpa_smoke_shiny.tga",
      "fxpa_smoke01.tga"
    ]);
    expect(result.placeable.renderPackage?.auroraEmitter?.emitters[0]).toMatchObject({
      source: "aurora-mdl-ascii",
      nodeName: "fire!03",
      texture: "fxpa_smoke01",
      chunkName: "red_m_giblet",
      emitterType: "Fountain",
      renderMode: "Billboard_to_World_Z",
      blendMode: "Normal",
      atlas: {
        xGridRaw: 4,
        yGridRaw: 4,
        effectiveXGrid: 4,
        effectiveYGrid: 4,
        fps: 10,
        frameStart: 0,
        frameEnd: 24,
        random: true
      },
      simulation: {
        xSize: 60,
        ySize: 40,
        spawnType: 0,
        birthrate: 5,
        lifeExp: 5,
        mass: -0.75,
        velocity: 0.5,
        randvel: 0.4,
        spread: 1.0472,
        particleRot: 0.2,
        bounce: true,
        bounceCoefficient: 0.35,
        blurLength: 1.2,
        deadspace: 0.25,
        p2p: true,
        p2pType: "2",
        grav: 0.8,
        drag: 0.3,
        threshold: 0.4,
        inherit: true,
        inheritVel: false,
        inheritLocal: true,
        inheritPart: true,
        affectedByWind: true,
        sizeStart: 1,
        sizeMid: 4,
        sizeEnd: 6,
        sizeStartY: 0,
        sizeMidY: 2,
        sizeEndY: 0,
        alphaStart: 0.5,
        alphaMid: 0.85,
        alphaEnd: 0,
        colorStart: [0.392157, 0, 0],
        colorEnd: [0.184314, 0, 0]
      },
      transform: {
        position: [0.0466596, -0.126434, 0.0124961],
        orientation: {
          axis: [1, 0, 0],
          angleRadians: -1.42244
        }
      },
      referenceNodes: [
        {
          nodeName: "REFm",
          parentNodeName: "fire!03",
          transform: {
            position: [0, 0, 0.63]
          }
        }
      ],
      sourceState: {
        renderOrder: -3,
        renderHintRaw: "normaltangents",
        renderHintMode: 3,
        customShaderVS: "fx_smoke_vs",
        customShaderFS: "fx_smoke_fs",
        customShaderGS: "fx_smoke_gs",
        transparency: true,
        twoSidedMaterial: true,
        twoSidedTexture: true,
        sampleFramebuffer: 2,
        volumetric: true,
        loop: false,
        isTinted: false,
        splat: true,
        rotateTexture: true
      }
    });
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

  it("refreshes cached generic manifests when source MDL assets have legacy unknown roles", async () => {
    const runtimeSettings = buildRuntimeSettingsRecord();
    const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
      get: jest.fn().mockResolvedValue(runtimeSettings),
      save: jest.fn()
    };
    const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
      replaceModuleSnapshot: jest.fn(),
      listModuleSnapshot: jest.fn(),
      getModuleObject: jest.fn(),
      putModuleObject: jest.fn()
    };
    moduleBlobStorage.listModuleSnapshot.mockResolvedValue({
      bucket: "aurora-module-assets",
      prefix: "modules/current/",
      moduleHash: "hash-bodybag-model-role",
      totalFiles: 1,
      totalBytes: 12,
      objects: [
        {
          key: "modules/current/__aurora/sources/vanilla/models/plc_u02.mdl",
          size: 12,
          etag: "model-hash"
        }
      ],
      truncated: false,
      continuationToken: undefined
    });
    moduleBlobStorage.getModuleObject.mockImplementation(async (_settings, key) => {
      if (key === "modules/current/__aurora/sources/vanilla/models/plc_u02.mdl") {
        return {
          key,
          size: 12,
          contentType: "application/octet-stream",
          etag: "model-hash",
          bytes: Buffer.from("mdl")
        };
      }
      if (key === "modules/current/__aurora/derived/models/plc_u02.glb") {
        return {
          key,
          size: 3,
          contentType: "model/gltf-binary",
          etag: "derived-hash",
          bytes: Buffer.from("glb")
        };
      }
      return null;
    });
    (moduleBlobStorage.putModuleObject as jest.Mock).mockResolvedValue({
      key: "modules/current/__aurora/derived/models/plc_u02.glb",
      size: 3,
      etag: "derived-hash"
    });
    const derivedAssetGenerator: jest.Mocked<DerivedAssetGeneratorPort> = {
      generateDerivedAssets: jest.fn(
        async (_input: Parameters<DerivedAssetGeneratorPort["generateDerivedAssets"]>[0]) => ({
        files: [
          {
            fileName: "__aurora/derived/models/plc_u02.glb",
            resourceType: 0,
            bytes: Buffer.from("glb")
          }
        ],
        summary: {
          generator: "test-generator",
          generatedFiles: 1,
          generatedBytes: 3
        }
      }))
    };

    repository.findByKindAndId.mockResolvedValue({
      ...buildTemplate("placeable", "plc_invis_corpse_bdy"),
      resref: "invis_corpse_bdy",
      placeableSubtype: "generic",
      metadata: {
        lookupModelResRef: "plc_u02",
        bodyBag: true
      }
    });
    placeableCache.get.mockResolvedValue({
      key: "b".repeat(64),
      storedAt: "2026-05-24T10:10:00.000Z",
      hits: 3,
      value: {
        templateId: "plc_invis_corpse_bdy",
        resref: "invis_corpse_bdy",
        name: "corpse",
        category: "placeable",
        placeableSubtype: "generic",
        render: {
          backendType: "generic",
          frontendType: "placeable",
          rendererPreset: "placeable-generic",
          isDoor: false,
          isVfx: false
        },
        benchmarkCandidate: false,
        metadata: {
          lookupModelResRef: "plc_u02",
          bodyBag: true
        },
        assetManifest: {
          version: "placeable-asset-manifest/v1",
          source: "module-blob-snapshot",
          generatedAt: "2026-05-24T10:00:00.000Z",
          moduleHash: "hash-bodybag-model-role",
          assetCount: 1,
          candidatesScanned: 1,
          assets: [
            {
              assetId: "legacy-mdl",
              role: "unknown",
              fileName: "plc_u02.mdl",
              objectKey: "modules/current/__aurora/sources/vanilla/models/plc_u02.mdl",
              extension: "mdl",
              sizeBytes: 12,
              contentType: "application/octet-stream",
              etag: "model-hash"
            }
          ]
        },
        renderPackage: {
          status: "unsupported",
          diagnostics: [
            {
              code: "PLACEABLE_RENDER_UNSUPPORTED_ASSET_SET",
              severity: "warn",
              message:
                "Placeable assets were found but no recognized source model asset exists."
            }
          ],
          assetRefs: {
            otherAssetIds: ["legacy-mdl"]
          }
        },
        classification: {
          source: "template",
          normalizedSubtype: "generic",
          mismatchWithTemplate: false
        },
        processedAt: "2026-05-24T10:09:00.000Z"
      }
    });
    placeableCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-05-24T10:11:00.000Z",
      hits: 0
    }));

    const serviceWithDerived = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage,
      derivedAssetGenerator
    );

    const result = await serviceWithDerived.processPlaceable({
      templateId: "plc_invis_corpse_bdy",
      bypassCache: false,
      includeBenchmarkMetadata: true
    });

    expect(result.cache.hit).toBe(true);
    expect(result.placeable.placeableSubtype).toBe("generic");
    expect(result.placeable.assetManifest.assets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fileName: "plc_u02.mdl",
          role: "model"
        }),
        expect.objectContaining({
          fileName: "plc_u02.glb",
          role: "model"
        })
      ])
    );
    expect(result.placeable.renderPackage?.status).toBe("ready");
    expect(result.placeable.renderPackage?.assetRefs.modelAssetIds).toBeDefined();
    expect(result.placeable.renderPackage?.glbUrl).toMatch(
      /^\/api\/v1\/catalog\/placeables\/cache\/.+\/assets\/.+\.glb$/u
    );
    expect(derivedAssetGenerator.generateDerivedAssets).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceFiles: [
          expect.objectContaining({
            fileName: "modules/current/__aurora/sources/vanilla/models/plc_u02.mdl",
            bytes: Buffer.from("mdl")
          })
        ]
      })
    );
  });

  it("uses template lookup model fallback for blocked area instance appearance rows", async () => {
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
      moduleHash: "hash-area-fallback-model",
      totalFiles: 1,
      totalBytes: 120,
      objects: [
        {
          key: "modules/current/__aurora/derived/models/plc_fallback.glb",
          size: 120,
          etag: "derived-hash"
        }
      ],
      truncated: false,
      continuationToken: undefined
    });
    moduleBlobStorage.getModuleObject.mockResolvedValue(null);
    repository.resolvePlaceableAppearanceModel = jest.fn().mockResolvedValue(null);
    repository.findByKindAndId.mockResolvedValue({
      ...buildTemplate("placeable", "plc_reserved_row_fallback"),
      resref: "reserved_row_fallback",
      placeableSubtype: "generic",
      metadata: {
        lookupModelResRef: "plc_fallback"
      }
    });
    placeableCache.get.mockResolvedValue(null);
    placeableCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-05-24T10:11:00.000Z",
      hits: 0
    }));

    const serviceWithBlob = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage
    );

    const result = await serviceWithBlob.processPlaceable({
      templateId: "plc_reserved_row_fallback",
      appearanceType: 15542,
      bypassCache: true,
      includeBenchmarkMetadata: true
    });

    expect(result.placeable.metadata.areaInstanceModelLookupStatus).toBe("blocked");
    expect(result.placeable.assetManifest.assets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fileName: "plc_fallback.glb",
          role: "model"
        })
      ])
    );
    expect(result.placeable.renderPackage?.status).toBe("ready");
    expect(result.placeable.renderPackage?.diagnostics).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "PLACEABLE_RENDER_AREA_INSTANCE_MODEL_UNRESOLVED"
        })
      ])
    );
  });

  it("processPlaceable cache hit hydrates render package urls for derived gltf assets", async () => {
    const cacheKey = "a".repeat(64);
    const derivedAssetId = "derivedgltf001";
    const textureAssetId = "texturedds001";

    placeableCache.get.mockResolvedValue({
      key: cacheKey,
      storedAt: "2026-05-24T10:10:00.000Z",
      hits: 2,
      value: {
        templateId: "plc_cached_003",
        resref: "plc_cached_003",
        name: "Cached Placeable 3",
        category: "benchmark",
        placeableSubtype: "generic",
        render: {
          backendType: "generic",
          frontendType: "placeable",
          rendererPreset: "placeable-generic",
          isDoor: false,
          isVfx: false
        },
        benchmarkCandidate: false,
        metadata: { sample: true },
        placeableRuntime: {
          source: {},
          identity: {},
          interaction: {},
          locking: {},
          trap: {},
          state: {},
          scripts: {}
        },
        placeableValidationIssues: [],
        assetManifest: {
          version: "placeable-asset-manifest/v1",
          source: "module-blob-snapshot",
          generatedAt: "2026-05-24T10:00:00.000Z",
          moduleHash: "hash-v1",
          assetCount: 2,
          candidatesScanned: 10,
          assets: [
            {
              assetId: derivedAssetId,
              role: "unknown",
              fileName: "plc_cached_003.gltf",
              objectKey: "modules/current/models/plc_cached_003.gltf",
              extension: "gltf",
              sizeBytes: 24,
              contentType: "model/gltf+json"
            },
            {
              assetId: textureAssetId,
              role: "texture",
              fileName: "plc_cached_003.dds",
              objectKey: "modules/current/textures/plc_cached_003.dds",
              extension: "dds",
              sizeBytes: 8,
              contentType: "image/vnd-ms.dds"
            }
          ]
        },
        renderPackage: {
          status: "ready",
          diagnostics: [
            {
              code: "PLACEABLE_RENDER_READY",
              severity: "warn",
              message: "Derived model asset exists; backend render package can be produced."
            }
          ],
          assetRefs: {
            derivedModelAssetIds: [derivedAssetId],
            textureAssetIds: [textureAssetId]
          }
        },
        classification: {
          source: "template",
          normalizedSubtype: "generic",
          mismatchWithTemplate: false
        },
        processedAt: "2026-05-24T10:09:00.000Z"
      }
    });
    repository.findByKindAndId.mockResolvedValue(buildTemplate("placeable", "plc_cached_003"));

    const result = await service.processPlaceable({
      templateId: "plc_cached_003",
      bypassCache: false,
      includeBenchmarkMetadata: true
    });

    expect(result.cache.hit).toBe(true);
    const responseCacheKey = result.cache.key;
    expect(result.placeable.renderPackage?.status).toBe("ready");
    expect(result.placeable.renderPackage?.modelUrl).toBe(
      `/api/v1/catalog/placeables/cache/${responseCacheKey}/assets/${derivedAssetId}.gltf`
    );
    expect(result.placeable.renderPackage?.glbUrl).toBeUndefined();
    expect(result.placeable.renderPackage?.textureUrls).toEqual([
      `/api/v1/catalog/placeables/cache/${responseCacheKey}/assets/${textureAssetId}.dds`
    ]);
    expect(placeableCache.set).not.toHaveBeenCalled();
  });

  it("processPlaceable cache hit reuses cached Aurora emitter payload without rereading source MDL", async () => {
    const sourceModelAssetId = "sourcemdl001";
    const textureAssetId = "texturetga001";
    const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
      get: jest.fn().mockResolvedValue(buildRuntimeSettingsRecord()),
      save: jest.fn()
    };
    const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
      replaceModuleSnapshot: jest.fn(),
      listModuleSnapshot: jest.fn().mockResolvedValue({
        bucket: "aurora-module-assets",
        prefix: "modules/current",
        moduleHash: "hash-vfx",
        totalFiles: 0,
        totalBytes: 0,
        objects: [],
        truncated: false
      }),
      getModuleObject: jest.fn()
    };
    const serviceWithBlob = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage
    );

    placeableCache.get.mockResolvedValue({
      key: "c".repeat(64),
      storedAt: "2026-05-24T10:10:00.000Z",
      hits: 7,
      value: {
        templateId: "plc_cached_vfx",
        resref: "phod_fx_pntgrm2",
        name: "Cached VFX",
        category: "benchmark",
        placeableSubtype: "vfx",
        render: {
          backendType: "vfx",
          frontendType: "vfx",
          rendererPreset: "vfx-aurora",
          isDoor: false,
          isVfx: true
        },
        benchmarkCandidate: false,
        metadata: { sample: true },
        placeableRuntime: {
          source: {},
          identity: {},
          interaction: {},
          locking: {},
          trap: {},
          state: {},
          scripts: {}
        },
        placeableValidationIssues: [],
        assetManifest: {
          version: "placeable-asset-manifest/v1",
          source: "module-blob-snapshot",
          generatedAt: "2026-05-24T10:00:00.000Z",
          moduleHash: "hash-vfx",
          assetCount: 2,
          candidatesScanned: 10,
          assets: [
            {
              assetId: sourceModelAssetId,
              role: "model",
              fileName: "phod_fx_pntgrm2.mdl",
              objectKey: "modules/current/models/phod_fx_pntgrm2.mdl",
              extension: "mdl",
              sizeBytes: 128,
              contentType: "application/octet-stream"
            },
            {
              assetId: textureAssetId,
              role: "texture",
              fileName: "phod_fx_pntgrm2.tga",
              objectKey: "modules/current/textures/phod_fx_pntgrm2.tga",
              extension: "tga",
              sizeBytes: 64,
              contentType: "image/x-tga"
            }
          ]
        },
        renderPackage: {
          status: "ready",
          diagnostics: [
            {
              code: "PLACEABLE_RENDER_READY",
              severity: "warn",
              message: "Derived model asset exists; backend render package can be produced."
            }
          ],
          assetRefs: {
            modelAssetIds: [sourceModelAssetId],
            textureAssetIds: [textureAssetId]
          },
          auroraEmitter: {
            source: "source-mdl",
            emitters: [
              {
                source: "aurora-mdl-ascii",
                sourceModelAssetId,
                sourceModelFileName: "phod_fx_pntgrm2.mdl",
                sourceModelObjectKey: "modules/current/models/phod_fx_pntgrm2.mdl",
                nodeName: "cached_emitter",
                texture: "phod_fx_pntgrm2",
                emitterType: "emitter",
                renderMode: "Billboard_to_World_Z",
                simulation: {
                  birthrate: 12,
                  lifeExp: 1.5
                }
              }
            ],
            diagnostics: []
          }
        },
        classification: {
          source: "template",
          normalizedSubtype: "vfx",
          mismatchWithTemplate: false
        },
        processedAt: "2026-05-24T10:09:00.000Z"
      }
    });
    repository.findByKindAndId.mockResolvedValue({
      ...buildTemplate("placeable", "plc_cached_vfx"),
      placeableSubtype: "vfx",
      resref: "phod_fx_pntgrm2"
    });

    const result = await serviceWithBlob.processPlaceable({
      templateId: "plc_cached_vfx",
      bypassCache: false,
      includeBenchmarkMetadata: true
    });

    expect(result.cache.hit).toBe(true);
    expect(result.placeable.renderPackage?.auroraEmitter?.emitters[0]?.nodeName).toBe(
      "cached_emitter"
    );
    expect(
      result.placeable.renderPackage?.diagnostics.map((diagnostic) => diagnostic.code)
    ).toContain("VFX_AURORA_MDL_EMITTER_PAYLOAD_READY");
    expect(result.placeable.renderPackage?.textureUrls).toEqual([
      `/api/v1/catalog/placeables/cache/${result.cache.key}/assets/${textureAssetId}.tga`
    ]);
    expect(moduleBlobStorage.getModuleObject).not.toHaveBeenCalled();
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
      deliveryPath: `/api/v1/catalog/placeables/cache/${cacheKey}/assets/abcdef012345.mdl`,
      deliveryUrl: `/api/v1/catalog/placeables/cache/${cacheKey}/assets/abcdef012345.mdl`,
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

    expect(moduleBlobStorage.listModuleSnapshot).toHaveBeenCalledTimes(2);
    expect(moduleBlobStorage.listModuleSnapshot).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        bucket: "aurora-module-assets",
        modulePrefix: "modules/current"
      }),
      { limit: 1 }
    );
    expect(moduleBlobStorage.listModuleSnapshot).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        bucket: "aurora-module-assets",
        modulePrefix: "modules/current"
      }),
      { limit: 1000, continuationToken: undefined }
    );
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
      deliveryPath: `/api/v1/catalog/placeables/cache/${cacheKey}/assets/abcdef012345.mdl`,
      deliveryUrl: `/api/v1/catalog/placeables/cache/${cacheKey}/assets/abcdef012345.mdl`
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
    fakeNow = 301_000;
    const secondIndex = await (
      serviceWithBlob as unknown as { getModuleSnapshotIndex: () => Promise<{ candidatesScanned: number }> }
    ).getModuleSnapshotIndex();
    dateNowSpy.mockRestore();

    expect(moduleBlobStorage.listModuleSnapshot).toHaveBeenCalledTimes(2);
    expect(firstIndex?.candidatesScanned).toBe(1);
    expect(secondIndex?.candidatesScanned).toBe(2);
    expect(secondIndex).not.toBe(firstIndex);
  });

  it("reuses module snapshot index within ttl and refreshes exactly at 5 minute boundary", async () => {
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
    fakeNow = 299_500;
    const reusedIndex = await (
      serviceWithBlob as unknown as { getModuleSnapshotIndex: () => Promise<{ moduleHash?: string }> }
    ).getModuleSnapshotIndex();
    fakeNow = 301_000;
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
    fakeNow = 301_000;
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
    fakeNow = 301_000;
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
    fakeNow = 301_000;
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

  it("refreshes cached ready placeable manifest when derived GLB references recoverable textures", async () => {
    const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
      get: jest.fn().mockResolvedValue(buildRuntimeSettingsRecord()),
      save: jest.fn()
    };
    const derivedKey = "modules/current/__aurora/derived/models/plc_cached_texture.glb";
    const textureKey = "modules/current/textures/tx_recovered.dds";
    const derivedBytes = buildGlbWithTextureReferences(["tx_recovered"]);
    const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
      replaceModuleSnapshot: jest.fn(),
      listModuleSnapshot: jest.fn().mockResolvedValue({
        bucket: "aurora-module-assets",
        prefix: "modules/current/",
        moduleHash: "hash-texture-recovery",
        totalFiles: 2,
        totalBytes: derivedBytes.length + 8,
        objects: [
          { key: derivedKey, size: derivedBytes.length, etag: "glb-etag" },
          { key: textureKey, size: 8, etag: "texture-etag" }
        ],
        truncated: false,
        continuationToken: undefined
      }),
      getModuleObject: jest.fn().mockImplementation(async (_settings, key) => {
        if (key !== derivedKey) {
          return null;
        }
        return {
          key,
          size: derivedBytes.length,
          contentType: "model/gltf-binary",
          bytes: derivedBytes
        };
      })
    };
    placeableCache.get.mockResolvedValue({
      key: "f".repeat(64),
      storedAt: "2026-05-24T10:10:00.000Z",
      hits: 1,
      value: {
        templateId: "plc_cached_texture",
        resref: "plc_cached_texture",
        name: "Cached Texture",
        category: "urban",
        placeableSubtype: "generic",
        render: {
          backendType: "placeable",
          frontendType: "placeable",
          rendererPreset: "placeable-standard",
          isDoor: false,
          isVfx: false
        },
        benchmarkCandidate: false,
        metadata: {},
        assetManifest: {
          ...buildEmptyManifest(),
          moduleHash: "hash-texture-recovery",
          assetCount: 1,
          candidatesScanned: 1,
          assets: [
            {
              assetId: "asset-derived",
              role: "model",
              fileName: "plc_cached_texture.glb",
              objectKey: derivedKey,
              extension: "glb",
              sizeBytes: derivedBytes.length,
              contentType: "model/gltf-binary"
            }
          ]
        },
        renderPackage: {
          status: "ready",
          diagnostics: [],
          assetRefs: {
            derivedModelAssetIds: ["asset-derived"]
          },
          glbUrl: `/api/v1/catalog/placeables/cache/${"f".repeat(64)}/assets/asset-derived.glb`
        } satisfies PlaceableRenderPackage,
        classification: {
          source: "template",
          normalizedSubtype: "generic",
          mismatchWithTemplate: false
        },
        processedAt: "2026-05-24T10:09:00.000Z"
      } as unknown as ReturnType<typeof buildTemplate> & { placeableSubtype: "generic" }
    });
    placeableCache.set.mockImplementation(async (key, value) => ({
      key,
      value,
      storedAt: "2026-05-24T10:11:00.000Z",
      hits: 0
    }));

    const serviceWithBlob = new CatalogApplicationService(
      repository,
      placeableCache,
      undefined,
      runtimeSettingsRepository,
      moduleBlobStorage
    );

    const result = await serviceWithBlob.getProcessedPlaceable("f".repeat(64));

    const textureAsset = result.placeable.assetManifest.assets.find(
      (asset) => asset.fileName === "tx_recovered.dds"
    );
    expect(placeableCache.set).toHaveBeenCalledTimes(1);
    expect(result.placeable.renderPackage?.textureUrls).toEqual([
      `/api/v1/catalog/placeables/cache/${"f".repeat(64)}/assets/${textureAsset!.assetId}.dds`
    ]);
    expect(textureAsset).toMatchObject({
      role: "texture",
      fileName: "tx_recovered.dds",
      objectKey: textureKey
    });
  });

  it("uses a lightweight module hash probe when validating cached placeable manifests", async () => {
    const runtimeSettingsRepository: jest.Mocked<RuntimeSettingsRepositoryPort> = {
      get: jest.fn().mockResolvedValue(buildRuntimeSettingsRecord()),
      save: jest.fn()
    };
    const moduleBlobStorage: jest.Mocked<ModuleBlobStoragePort> = {
      replaceModuleSnapshot: jest.fn(),
      listModuleSnapshot: jest.fn().mockResolvedValue({
        bucket: "aurora-module-assets",
        prefix: "modules/current",
        moduleHash: undefined,
        totalFiles: 1,
        totalBytes: 1,
        objects: [{ key: "modules/current/models/plc_city_gate.mdl", size: 1 }],
        truncated: false
      }),
      getModuleObject: jest.fn()
    };
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
          ...buildEmptyManifest(),
          assetCount: 1,
          candidatesScanned: 1,
          assets: [
            {
              assetId: "asset001",
              role: "model",
              fileName: "plc_city_gate.mdl",
              objectKey: "modules/current/models/plc_city_gate.mdl",
              extension: "mdl",
              sizeBytes: 1,
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

    expect(moduleBlobStorage.listModuleSnapshot).toHaveBeenCalledTimes(1);
    expect(moduleBlobStorage.listModuleSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        bucket: "aurora-module-assets",
        modulePrefix: "modules/current"
      }),
      { limit: 1 }
    );
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
    fakeNow = 301_000;
    const secondIndex = await (
      serviceWithBlob as unknown as { getModuleSnapshotIndex: () => Promise<object> }
    ).getModuleSnapshotIndex();
    dateNowSpy.mockRestore();

    expect(moduleBlobStorage.listModuleSnapshot).toHaveBeenCalledTimes(2);
    expect(secondIndex).toBe(firstIndex);
  });
});

function buildGlbWithTextureReferences(textureReferences: string[]): Buffer {
  return buildGlbFromJson({
      asset: { version: "2.0", generator: "catalog-test" },
      extras: {
        aurora: {
          textureReferences
        }
      }
    });
}

function buildGlbFromJson(value: unknown): Buffer {
  const json = Buffer.from(JSON.stringify(value), "utf-8");
  const jsonPadding = (4 - (json.length % 4)) % 4;
  const paddedJson = Buffer.concat([json, Buffer.alloc(jsonPadding, 0x20)]);
  const bytes = Buffer.alloc(20 + paddedJson.length);
  bytes.writeUInt32LE(0x46546c67, 0);
  bytes.writeUInt32LE(2, 4);
  bytes.writeUInt32LE(bytes.length, 8);
  bytes.writeUInt32LE(paddedJson.length, 12);
  bytes.writeUInt32LE(0x4e4f534a, 16);
  paddedJson.copy(bytes, 20);
  return bytes;
}

function buildHakV10File(
  entries: Array<{ resref: string; restype: number; bytes: Buffer }>
): Buffer {
  const header = Buffer.alloc(160);
  const keyListOffset = 160;
  const keyEntrySize = 24;
  const resourceListOffset = keyListOffset + entries.length * keyEntrySize;
  const resourceListEntrySize = 8;
  const resourceDataOffsetStart =
    resourceListOffset + entries.length * resourceListEntrySize;

  header.write("HAK ", 0, 4, "ascii");
  header.write("V1.0", 4, 4, "ascii");
  header.writeUInt32LE(0, 8);
  header.writeUInt32LE(0, 12);
  header.writeUInt32LE(entries.length, 16);
  header.writeUInt32LE(0, 20);
  header.writeUInt32LE(keyListOffset, 24);
  header.writeUInt32LE(resourceListOffset, 28);

  const keyTable = Buffer.alloc(entries.length * keyEntrySize);
  const resourceTable = Buffer.alloc(entries.length * resourceListEntrySize);
  const payloadBuffers: Buffer[] = [];
  let currentOffset = resourceDataOffsetStart;

  entries.forEach((entry, index) => {
    const keyOffset = index * keyEntrySize;
    const resrefBytes = Buffer.from(entry.resref.toLowerCase(), "ascii");
    resrefBytes.copy(keyTable, keyOffset, 0, Math.min(resrefBytes.length, 16));
    keyTable.writeUInt32LE(index, keyOffset + 16);
    keyTable.writeUInt16LE(entry.restype, keyOffset + 20);
    keyTable.writeUInt16LE(0, keyOffset + 22);

    const resourceOffset = index * resourceListEntrySize;
    resourceTable.writeUInt32LE(currentOffset, resourceOffset);
    resourceTable.writeUInt32LE(entry.bytes.length, resourceOffset + 4);
    payloadBuffers.push(entry.bytes);
    currentOffset += entry.bytes.length;
  });

  return Buffer.concat([header, keyTable, resourceTable, ...payloadBuffers]);
}

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

function buildRuntimeSettingsRecord(): RuntimeSettingsRecord {
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
      },
      vfx: {
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

function buildEmitterOnlyBinaryMdl(
  textureName: string,
  options: {
    emitterType?: string;
    renderMode?: string;
    blendMode?: string;
    xGridRaw?: number;
    yGridRaw?: number;
    fps?: number;
    frameStart?: number;
    frameEnd?: number;
    spawnType?: number;
    twoSidedTexture?: boolean;
    loop?: boolean;
    renderOrder?: number;
    random?: boolean;
    isTinted?: boolean;
    splat?: boolean;
    chunkName?: string;
    controllerRows?: number;
    simulation?: {
      xSize?: number;
      ySize?: number;
      birthrate?: number;
      birthrateKeyframes?: Array<[number, number]>;
      lifeExp?: number;
      mass?: number;
      velocity?: number;
      randvel?: number;
      spread?: number;
      particleRot?: number;
      bounce?: boolean;
      bounceCoefficient?: number;
      blurLength?: number;
      deadspace?: number;
      p2p?: boolean;
      p2pBezier?: boolean;
      p2pBezier2?: number;
      p2pBezier3?: number;
      combineTime?: number;
      grav?: number;
      drag?: number;
      threshold?: number;
      inherit?: boolean;
      inheritVel?: boolean;
      inheritLocal?: boolean;
      inheritPart?: boolean;
      affectedByWind?: boolean;
      sizeStart?: number;
      sizeStartKeyframes?: Array<[number, number]>;
      sizeMid?: number;
      sizeEnd?: number;
      sizeStartY?: number;
      sizeMidY?: number;
      sizeEndY?: number;
      alphaStart?: number;
      alphaStartKeyframes?: Array<[number, number]>;
      alphaMid?: number;
      alphaEnd?: number;
      colorStart?: [number, number, number];
      colorStartKeyframes?: Array<[number, number, number, number]>;
      colorMid?: [number, number, number];
      colorMidKeyframes?: Array<[number, number, number, number]>;
      colorEnd?: [number, number, number];
      colorEndKeyframes?: Array<[number, number, number, number]>;
      percentStart?: number;
      percentStartKeyframes?: Array<[number, number]>;
      percentMid?: number;
      percentMidKeyframes?: Array<[number, number]>;
      percentEnd?: number;
      percentEndKeyframes?: Array<[number, number]>;
    };
    transform?: {
      position?: [number, number, number];
      orientationQuaternion?: [number, number, number, number];
    };
    animations?: Array<{
      name: string;
      lengthSeconds?: number;
      transitionSeconds?: number;
      birthrateValues?: number[];
      alphaEndValues?: number[];
    }>;
  } = {}
): Buffer {
  const modelDataSize = options.animations && options.animations.length > 0 ? 7200 : 1800;
  const bytes = Buffer.alloc(12 + modelDataSize);
  const rootNodeOffset = 232;
  const rootAbsOffset = 12 + rootNodeOffset;

  bytes.writeUInt32LE(0, 0);
  bytes.writeUInt32LE(modelDataSize, 4);
  bytes.writeUInt32LE(0, 8);
  writeCString(bytes, 20, 64, "vfx_source_model");
  bytes.writeUInt32LE(rootNodeOffset, 84);

  writeCString(bytes, rootAbsOffset + 32, 32, "emit_smoke");
  bytes.writeUInt32LE(0x0004, rootAbsOffset + 108);
  if (typeof options.xGridRaw === "number") {
    bytes.writeUInt32LE(options.xGridRaw, rootAbsOffset + 0x7c);
  }
  if (typeof options.yGridRaw === "number") {
    bytes.writeUInt32LE(options.yGridRaw, rootAbsOffset + 0x80);
  }
  if (typeof options.spawnType === "number") {
    bytes.writeUInt32LE(options.spawnType, rootAbsOffset + 0x84);
  }
  if (options.emitterType) {
    writeCString(bytes, rootAbsOffset + 0x88, 64, options.emitterType);
  }
  if (options.renderMode) {
    writeCString(bytes, rootAbsOffset + 0xa8, 64, options.renderMode);
  }
  if (options.blendMode) {
    writeCString(bytes, rootAbsOffset + 0xc8, 64, options.blendMode);
  }
  if (options.chunkName) {
    writeCString(bytes, rootAbsOffset + 0x128, 0x10, options.chunkName);
  }
  if (typeof options.simulation?.deadspace === "number") {
    bytes.writeFloatLE(options.simulation.deadspace, rootAbsOffset + 0x70);
  }
  let emitterFlags = options.random ? 0x20 : 0;
  if (options.simulation?.p2p) {
    emitterFlags |= 0x1;
  }
  if (options.simulation?.p2pBezier) {
    emitterFlags |= 0x2;
  }
  if (options.simulation?.affectedByWind) {
    emitterFlags |= 0x4;
  }
  if (options.isTinted) {
    emitterFlags |= 0x8;
  }
  if (options.simulation?.bounce) {
    emitterFlags |= 0x10;
  }
  if (options.simulation?.inherit) {
    emitterFlags |= 0x40;
  }
  if (options.simulation?.inheritVel) {
    emitterFlags |= 0x80;
  }
  if (options.simulation?.inheritLocal) {
    emitterFlags |= 0x100;
  }
  if (options.splat) {
    emitterFlags |= 0x200;
  }
  if (options.simulation?.inheritPart) {
    emitterFlags |= 0x400;
  }
  if (emitterFlags !== 0) {
    bytes.writeUInt32LE(emitterFlags, rootAbsOffset + 0x144);
  }
  if (typeof options.twoSidedTexture === "boolean") {
    bytes.writeUInt32LE(options.twoSidedTexture ? 1 : 0, rootAbsOffset + 0x138);
  }
  if (typeof options.loop === "boolean") {
    bytes.writeUInt32LE(options.loop ? 1 : 0, rootAbsOffset + 0x13c);
  }
  if (typeof options.renderOrder === "number") {
    bytes.writeInt16LE(options.renderOrder, rootAbsOffset + 0x140);
  }
  writeCString(bytes, rootAbsOffset + 232, 64, textureName);

  const controllerKeysOffset = 620;
  const controllerDataOffset = 1120;
  let controllerCount = 0;
  let dataCount = 0;
  const controllerRows = Math.max(1, Math.trunc(options.controllerRows ?? 1));
  const writeControllerRows = (type: number, rows: number[][]): void => {
    const columns = rows[0]?.length ?? 0;
    if (rows.length === 0 || columns === 0 || rows.some((row) => row.length !== columns)) {
      return;
    }
    const keyAbsOffset = 12 + controllerKeysOffset + controllerCount * 12;
    bytes.writeUInt32LE(type, keyAbsOffset);
    bytes.writeUInt16LE(rows.length, keyAbsOffset + 4);
    bytes.writeUInt16LE(dataCount, keyAbsOffset + 8);
    bytes.writeUInt8(columns, keyAbsOffset + 10);
    rows.forEach((rowValues, row) => {
      rowValues.forEach((value, index) => {
        bytes.writeFloatLE(
          value,
          12 + controllerDataOffset + (dataCount + row * columns + index) * 4
        );
      });
    });
    controllerCount += 1;
    dataCount += columns * rows.length;
  };
  const writeController = (type: number, values: number[]): void => {
    if (values.length === 0) {
      return;
    }
    writeControllerRows(
      type,
      Array.from({ length: controllerRows }, () => [...values])
    );
  };
  const writeNumberController = (type: number, value: number | undefined): void => {
    if (typeof value === "number") {
      writeController(type, [value]);
    }
  };
  const simulation = options.simulation;
  writeNumberController(128, options.fps);
  writeNumberController(136, options.frameStart);
  writeNumberController(132, options.frameEnd);
  if (simulation?.colorStartKeyframes) {
    writeControllerRows(108, simulation.colorStartKeyframes);
  } else if (simulation?.colorStart) {
    writeController(108, simulation.colorStart);
  }
  if (simulation?.colorMidKeyframes) {
    writeControllerRows(472, simulation.colorMidKeyframes);
  } else if (simulation?.colorMid) {
    writeController(472, simulation.colorMid);
  }
  if (simulation?.colorEndKeyframes) {
    writeControllerRows(96, simulation.colorEndKeyframes);
  } else if (simulation?.colorEnd) {
    writeController(96, simulation.colorEnd);
  }
  if (simulation?.alphaStartKeyframes) {
    writeControllerRows(84, simulation.alphaStartKeyframes);
  } else {
    writeNumberController(84, simulation?.alphaStart);
  }
  writeNumberController(468, simulation?.alphaMid);
  writeNumberController(80, simulation?.alphaEnd);
  writeNumberController(196, simulation?.xSize);
  writeNumberController(200, simulation?.ySize);
  if (simulation?.birthrateKeyframes) {
    writeControllerRows(88, simulation.birthrateKeyframes);
  } else {
    writeNumberController(88, simulation?.birthrate);
  }
  writeNumberController(144, simulation?.lifeExp);
  writeNumberController(148, simulation?.mass);
  writeNumberController(192, simulation?.velocity);
  writeNumberController(164, simulation?.randvel);
  writeNumberController(184, simulation?.spread);
  writeNumberController(160, simulation?.particleRot);
  writeNumberController(92, simulation?.bounceCoefficient);
  writeNumberController(204, simulation?.blurLength);
  writeNumberController(152, simulation?.p2pBezier2);
  writeNumberController(156, simulation?.p2pBezier3);
  writeNumberController(120, simulation?.combineTime);
  writeNumberController(140, simulation?.grav);
  writeNumberController(124, simulation?.drag);
  writeNumberController(188, simulation?.threshold);
  if (simulation?.sizeStartKeyframes) {
    writeControllerRows(168, simulation.sizeStartKeyframes);
  } else {
    writeNumberController(168, simulation?.sizeStart);
  }
  if (simulation?.percentStartKeyframes) {
    writeControllerRows(484, simulation.percentStartKeyframes);
  } else {
    writeNumberController(484, simulation?.percentStart);
  }
  if (simulation?.percentMidKeyframes) {
    writeControllerRows(485, simulation.percentMidKeyframes);
  } else {
    writeNumberController(485, simulation?.percentMid);
  }
  if (simulation?.percentEndKeyframes) {
    writeControllerRows(486, simulation.percentEndKeyframes);
  } else {
    writeNumberController(486, simulation?.percentEnd);
  }
  writeNumberController(488, simulation?.sizeMid);
  writeNumberController(172, simulation?.sizeEnd);
  writeNumberController(176, simulation?.sizeStartY);
  writeNumberController(492, simulation?.sizeMidY);
  writeNumberController(180, simulation?.sizeEndY);
  if (options.transform?.position) {
    writeController(8, options.transform.position);
  }
  if (options.transform?.orientationQuaternion) {
    writeController(20, options.transform.orientationQuaternion);
  }

  if (controllerCount > 0 && dataCount > 0) {
    bytes.writeUInt32LE(controllerKeysOffset, rootAbsOffset + 84);
    bytes.writeUInt32LE(controllerCount, rootAbsOffset + 88);
    bytes.writeUInt32LE(controllerDataOffset, rootAbsOffset + 96);
    bytes.writeUInt32LE(dataCount, rootAbsOffset + 100);
  }

  if (options.animations && options.animations.length > 0) {
    const animationArrayOffset = 1800;
    const animationBlockStartOffset = 1840;
    const animationBlockSize = 900;
    bytes.writeUInt32LE(animationArrayOffset, 12 + 120);
    bytes.writeUInt32LE(options.animations.length, 12 + 124);

    options.animations.forEach((animation, index) => {
      const animationOffset = animationBlockStartOffset + index * animationBlockSize;
      const animationAbsOffset = 12 + animationOffset;
      const animationNodeOffset = animationOffset + 160;
      const animationNodeAbsOffset = 12 + animationNodeOffset;
      const animationControllerKeysOffset = animationNodeOffset + 360;
      const animationControllerDataOffset = animationControllerKeysOffset + 160;
      let animationControllerCount = 0;
      let animationDataCount = 0;

      bytes.writeUInt32LE(animationOffset, 12 + animationArrayOffset + index * 4);
      bytes.writeFloatLE(animation.lengthSeconds ?? 2, animationAbsOffset);
      bytes.writeFloatLE(animation.transitionSeconds ?? 0, animationAbsOffset + 4);
      writeCString(bytes, animationAbsOffset + 8, 64, animation.name);
      bytes.writeUInt32LE(animationNodeOffset, animationAbsOffset + 72);
      bytes.writeUInt32LE(11, animationAbsOffset + 76);

      writeCString(bytes, animationNodeAbsOffset + 32, 32, "emit_smoke");
      bytes.writeUInt32LE(0x0004, animationNodeAbsOffset + 108);

      const writeAnimationControllerRows = (type: number, rows: number[][]): void => {
        const columns = rows[0]?.length ?? 0;
        if (rows.length === 0 || columns === 0 || rows.some((row) => row.length !== columns)) {
          return;
        }
        const keyAbsOffset =
          12 + animationControllerKeysOffset + animationControllerCount * 12;
        bytes.writeUInt32LE(type, keyAbsOffset);
        bytes.writeUInt16LE(rows.length, keyAbsOffset + 4);
        bytes.writeUInt16LE(animationDataCount, keyAbsOffset + 8);
        bytes.writeUInt8(columns, keyAbsOffset + 10);
        rows.forEach((rowValues, row) => {
          rowValues.forEach((value, valueIndex) => {
            bytes.writeFloatLE(
              value,
              12 +
                animationControllerDataOffset +
                (animationDataCount + row * columns + valueIndex) * 4
            );
          });
        });
        animationControllerCount += 1;
        animationDataCount += columns * rows.length;
      };
      const writeAnimationScalarController = (type: number, values?: number[]): void => {
        if (!values || values.length === 0) {
          return;
        }
        writeAnimationControllerRows(
          type,
          values.map((value) => [value])
        );
      };

      writeAnimationScalarController(88, animation.birthrateValues);
      writeAnimationScalarController(80, animation.alphaEndValues);

      if (animationControllerCount > 0 && animationDataCount > 0) {
        bytes.writeUInt32LE(animationControllerKeysOffset, animationNodeAbsOffset + 84);
        bytes.writeUInt32LE(animationControllerCount, animationNodeAbsOffset + 88);
        bytes.writeUInt32LE(animationControllerDataOffset, animationNodeAbsOffset + 96);
        bytes.writeUInt32LE(animationDataCount, animationNodeAbsOffset + 100);
      }
    });
  }

  return bytes;
}

function writeCString(buffer: Buffer, offset: number, length: number, value: string): void {
  buffer.write(value, offset, Math.max(0, Math.min(length - 1, Buffer.byteLength(value))), "ascii");
}
