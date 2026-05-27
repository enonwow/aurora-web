import type { FastifyReply } from "fastify";
import { AppConfigService } from "../../src/common/config/app-config.service";
import { HealthController } from "../../src/health/health.controller";
import { AreasController } from "../../src/modules/areas/adapters/inbound/http/areas.controller";
import { AreasApplicationService } from "../../src/modules/areas/application/areas.application.service";
import { AuthController } from "../../src/modules/auth/adapters/inbound/http/auth.controller";
import { AuthApplicationService } from "../../src/modules/auth/application/auth.application.service";
import { CreaturesController } from "../../src/modules/catalog/adapters/inbound/http/creatures.controller";
import { ItemsController } from "../../src/modules/catalog/adapters/inbound/http/items.controller";
import { PlaceablesController } from "../../src/modules/catalog/adapters/inbound/http/placeables.controller";
import { CatalogApplicationService } from "../../src/modules/catalog/application/catalog.application.service";
import { RuntimeSettingsController } from "../../src/modules/runtime-settings/adapters/inbound/http/runtime-settings.controller";
import { RuntimeSettingsApplicationService } from "../../src/modules/runtime-settings/application/runtime-settings.application.service";
import { buildDefaultRuntimeSettings } from "../../src/modules/runtime-settings/domain/runtime-settings.defaults";
import { SoundsController } from "../../src/modules/sounds/adapters/inbound/http/sounds.controller";
import { SoundsApplicationService } from "../../src/modules/sounds/application/sounds.application.service";
import { TilesController } from "../../src/modules/tiles/adapters/inbound/http/tiles.controller";
import { TilesApplicationService } from "../../src/modules/tiles/application/tiles.application.service";

describe("HTTP controllers", () => {
  const config = { contractVersion: "1.0.0" } as AppConfigService;

  it("returns health payload", () => {
    const controller = new HealthController();
    expect(controller.getHealth()).toEqual({
      status: "ok",
      service: "aurora-backend"
    });
  });

  it("delegates area controller calls", async () => {
    const service = {
      listAreas: jest.fn().mockResolvedValue({ items: [], total: 0 }),
      getArea: jest.fn().mockResolvedValue({ areaId: "area-1" }),
      getAreaPreview: jest.fn().mockResolvedValue({ areaId: "area-1" }),
      processArea: jest.fn().mockResolvedValue({ cacheKey: "a".repeat(64) }),
      getProcessedArea: jest.fn().mockResolvedValue({ cacheKey: "a".repeat(64) }),
      getProcessedAreaTextureDelivery: jest.fn().mockResolvedValue({
        cacheKey: "a".repeat(64),
        textureAtlas: {
          mode: "direct",
          atlasId: "atlas_urban_v1",
          objectKey: "modules/current/areas/atlases/atlas_urban_v1.webp",
          contentType: "image/webp",
          sizeBytes: 4,
          proxyPath: "/api/v1/areas/cache/a/textures",
          proxyUrl: "/api/v1/areas/cache/a/textures",
          directUrl: "http://seaweedfs:8333/aurora-module-assets/modules/current/areas/atlases/atlas_urban_v1.webp",
          s3Url: "s3://aurora-module-assets/modules/current/areas/atlases/atlas_urban_v1.webp"
        }
      }),
      getProcessedAreaTexture: jest.fn().mockResolvedValue({
        cacheKey: "a".repeat(64),
        textureAtlas: {
          atlasId: "atlas_urban_v1",
          objectKey: "modules/current/areas/atlases/atlas_urban_v1.webp"
        },
        payload: {
          contentType: "image/webp",
          size: 4,
          etag: "etag-1",
          bytes: Buffer.from([0x01, 0x02, 0x03, 0x04])
        }
      })
    } as unknown as jest.Mocked<AreasApplicationService>;
    const controller = new AreasController(service, config);
    const request = appRequest();
    const response = createReply();

    await expect(controller.list(request, {})).resolves.toMatchObject({
      contractVersion: "1.0.0"
    });
    await controller.getById(request, "area-1");
    await controller.preview(request, "area-1");
    await controller.process(request, "area-1", { bypassCache: true });
    await controller.getCached(request, "a".repeat(16));
    await controller.getCachedTextureContract(request, "a".repeat(16), { mode: "direct" });
    await controller.getCachedTexture("a".repeat(16), response as unknown as FastifyReply);

    expect(service.listAreas).toHaveBeenCalledWith({
      limit: 20,
      offset: 0
    });
    expect(service.getArea).toHaveBeenCalledWith("area-1");
    expect(service.getAreaPreview).toHaveBeenCalledWith("area-1");
    expect(service.processArea).toHaveBeenCalledWith({
      areaId: "area-1",
      bypassCache: true
    });
    expect(service.getProcessedArea).toHaveBeenCalledWith("a".repeat(16));
    expect(service.getProcessedAreaTextureDelivery).toHaveBeenCalledWith("a".repeat(16), "direct");
    expect(service.getProcessedAreaTexture).toHaveBeenCalledWith("a".repeat(16));
  });

  it("delegates tile controller calls", async () => {
    const service = {
      listTiles: jest.fn().mockResolvedValue({ items: [], total: 0 }),
      getTile: jest.fn().mockResolvedValue({ tileId: "tile-1" }),
      getTilePreview: jest.fn().mockResolvedValue({ tileId: "tile-1" }),
      processTile: jest.fn().mockResolvedValue({ cacheKey: "b".repeat(64) }),
      benchmarkTiles: jest.fn().mockResolvedValue({ stats: [] }),
      getProcessedTile: jest.fn().mockResolvedValue({ cacheKey: "b".repeat(64) }),
      getProcessedTileTextureDelivery: jest.fn().mockResolvedValue({
        cacheKey: "b".repeat(64),
        textureAtlas: {
          mode: "direct",
          atlasId: "atlas_tile_city_v1",
          objectKey: "modules/current/tiles/atlases/atlas_tile_city_v1.webp",
          contentType: "image/webp",
          sizeBytes: 4,
          proxyPath: "/api/v1/catalog/tiles/cache/b/textures",
          proxyUrl: "/api/v1/catalog/tiles/cache/b/textures",
          directUrl:
            "http://seaweedfs:8333/aurora-module-assets/modules/current/tiles/atlases/atlas_tile_city_v1.webp",
          s3Url: "s3://aurora-module-assets/modules/current/tiles/atlases/atlas_tile_city_v1.webp"
        }
      }),
      getProcessedTileTexture: jest.fn().mockResolvedValue({
        cacheKey: "b".repeat(64),
        textureAtlas: {
          atlasId: "atlas_tile_city_v1",
          objectKey: "modules/current/tiles/atlases/atlas_tile_city_v1.webp"
        },
        payload: {
          contentType: "image/webp",
          size: 4,
          etag: "etag-1",
          bytes: Buffer.from([0x01, 0x02, 0x03, 0x04])
        }
      })
    } as unknown as jest.Mocked<TilesApplicationService>;
    const controller = new TilesController(service, config);
    const request = appRequest();
    const response = createReply();

    await controller.list(request, {});
    await controller.getById(request, "tile-1");
    await controller.preview(request, "tile-1");
    await controller.process(request, "tile-1", { bypassCache: "true" });
    await controller.benchmark(request, {
      tileIds: ["tile-1"],
      iterations: 2,
      warmupIterations: 0
    });
    await controller.getCached(request, "b".repeat(16));
    await controller.getCachedTextureContract(request, "b".repeat(16), { mode: "direct" });
    await controller.getCachedTexture("b".repeat(16), response as unknown as FastifyReply);

    expect(service.listTiles).toHaveBeenCalledWith({
      limit: 20,
      offset: 0
    });
    expect(service.processTile).toHaveBeenCalledWith({
      tileId: "tile-1",
      bypassCache: true
    });
    expect(service.benchmarkTiles).toHaveBeenCalledWith({
      tileIds: ["tile-1"],
      iterations: 2,
      warmupIterations: 0,
      bypassCache: true
    });
    expect(service.getProcessedTileTextureDelivery).toHaveBeenCalledWith("b".repeat(16), "direct");
    expect(service.getProcessedTileTexture).toHaveBeenCalledWith("b".repeat(16));
  });

  it("delegates sound controller calls", async () => {
    const service = {
      listSounds: jest.fn().mockResolvedValue({ items: [], total: 0 }),
      getSound: jest.fn().mockResolvedValue({ soundId: "sound-1" }),
      getSoundPreview: jest.fn().mockResolvedValue({ soundId: "sound-1" }),
      processSound: jest.fn().mockResolvedValue({ cacheKey: "c".repeat(64) }),
      benchmarkSounds: jest.fn().mockResolvedValue({ stats: [] }),
      getProcessedSound: jest.fn().mockResolvedValue({ cacheKey: "c".repeat(64) }),
      getProcessedSoundAudioDelivery: jest.fn().mockResolvedValue({
        cacheKey: "c".repeat(64),
        audio: {
          mode: "direct",
          assetId: "asset-1",
          objectKey: "modules/current/audio/a.ogg",
          contentType: "audio/ogg",
          sizeBytes: 3,
          proxyPath: "/api/v1/catalog/sounds/cache/c/audio",
          proxyUrl: "/api/v1/catalog/sounds/cache/c/audio",
          directUrl: "http://seaweedfs:8333/aurora-module-assets/modules/current/audio/a.ogg",
          s3Url: "s3://aurora-module-assets/modules/current/audio/a.ogg"
        }
      }),
      getProcessedSoundAudio: jest.fn().mockResolvedValue({
        cacheKey: "c".repeat(64),
        audio: {
          assetId: "asset-1",
          objectKey: "modules/current/audio/a.ogg",
          contentType: "audio/ogg",
          sizeBytes: 4,
          format: "ogg"
        },
        payload: {
          contentType: "audio/ogg",
          size: 4,
          etag: "etag-1",
          bytes: Buffer.from([0x01, 0x02, 0x03, 0x04])
        }
      })
    } as unknown as jest.Mocked<SoundsApplicationService>;
    const controller = new SoundsController(service, config);
    const request = appRequest();
    const response = createReply();

    await controller.list(request, {});
    await controller.getById(request, "sound-1");
    await controller.preview(request, "sound-1");
    await controller.process(request, "sound-1", { bypassCache: 1 });
    await controller.benchmark(request, {
      soundIds: ["sound-1"],
      iterations: 2,
      warmupIterations: 1,
      bypassCache: false
    });
    await controller.getCached(request, "c".repeat(16));
    await controller.getCachedAudioContract(request, "c".repeat(16), { mode: "direct" });
    await controller.getCachedAudio("c".repeat(16), undefined, response as unknown as FastifyReply);
    await controller.getCachedAudio(
      "c".repeat(16),
      "bytes=1-2",
      response as unknown as FastifyReply
    );
    await controller.getCachedAudio(
      "c".repeat(16),
      "bytes=-2",
      response as unknown as FastifyReply
    );
    await controller.getCachedAudio(
      "c".repeat(16),
      "bytes=2-",
      response as unknown as FastifyReply
    );
    await controller.getCachedAudio(
      "c".repeat(16),
      "bytes=2-1",
      response as unknown as FastifyReply
    );
    await controller.getCachedAudio(
      "c".repeat(16),
      "items=1-2",
      response as unknown as FastifyReply
    );

    expect(service.listSounds).toHaveBeenCalledWith({
      limit: 20,
      offset: 0
    });
    expect(service.processSound).toHaveBeenCalledWith({
      soundId: "sound-1",
      bypassCache: true
    });
    expect(service.getProcessedSoundAudioDelivery).toHaveBeenCalledWith("c".repeat(16), "direct");
    expect(service.getProcessedSoundAudio).toHaveBeenCalledWith("c".repeat(16));
    expect(response.code).toHaveBeenCalledWith(206);
    expect(response.code).toHaveBeenCalledWith(416);
  });

  it("delegates auth controller calls", async () => {
    const service = {
      authenticate: jest.fn().mockResolvedValue({ accessToken: "token" }),
      createUser: jest.fn().mockResolvedValue({
        userId: "u_new_001",
        username: "qa.viewer",
        displayName: "QA Viewer",
        role: "viewer",
        createdAt: "2026-05-27T09:00:00.000Z",
        createdBy: "admin.user"
      }),
      logout: jest.fn().mockResolvedValue(undefined)
    } as unknown as jest.Mocked<AuthApplicationService>;
    const controller = new AuthController(service, config);
    const request = appRequest("admin.user");

    await expect(controller.login(request, { username: "a", password: "b" })).resolves.toMatchObject(
      {
        contractVersion: "1.0.0",
        data: { accessToken: "token" }
      }
    );
    await expect(
      controller.createUser(request, {
        username: "qa.viewer",
        password: "StrongPass123",
        displayName: "QA Viewer",
        role: "viewer"
      })
    ).resolves.toMatchObject({
      data: {
        userId: "u_new_001",
        username: "qa.viewer",
        displayName: "QA Viewer",
        role: "viewer"
      }
    });
    await expect(controller.logout(request)).resolves.toBeUndefined();
    await expect(controller.me(request)).resolves.toMatchObject({
      data: {
        userId: "user-1",
        roles: ["admin"],
        displayName: "Admin User"
      }
    });
    await expect(controller.adminPing(request)).resolves.toMatchObject({
      data: { status: "ok" }
    });
    await expect(controller.dmActionPing(request)).resolves.toMatchObject({
      data: { status: "ok" }
    });

    expect(service.authenticate).toHaveBeenCalledWith("a", "b");
    expect(service.createUser).toHaveBeenCalledWith(
      {
        username: "qa.viewer",
        password: "StrongPass123",
        displayName: "QA Viewer",
        role: "viewer"
      },
      "admin.user"
    );
    expect(service.logout).toHaveBeenCalledWith("token-1");
  });

  it("delegates runtime settings controller calls", async () => {
    const service = {
      getRuntimeSettings: jest.fn().mockResolvedValue({ revision: 1 }),
      getResolvedHakSettings: jest.fn().mockResolvedValue({}),
      getModuleBlobCacheSummary: jest.fn().mockResolvedValue({ totalFiles: 0 }),
      getTextureIndexMetadataSummary: jest.fn().mockResolvedValue({
        available: true,
        totalTextures: 3
      }),
      queryTextureIndex: jest.fn().mockResolvedValue({
        available: true,
        totalEntries: 1,
        entries: []
      }),
      rebuildModuleBlobCache: jest.fn().mockResolvedValue({
        status: "updated",
        sourceDelta: {
          module: { uploadedFiles: 2 },
          hak: { uploadedFiles: 1 },
          vanilla: { uploadedFiles: 0 },
          index: { uploadedFiles: 1 }
        }
      }),
      replaceRuntimeSettings: jest.fn().mockResolvedValue({ revision: 2 })
    } as unknown as jest.Mocked<RuntimeSettingsApplicationService>;
    const controller = new RuntimeSettingsController(service, config);
    const request = appRequest("admin.user");
    const payload = buildRuntimeSettingsPayload();

    await controller.getRuntimeSettings(request);
    await controller.getResolvedHakSettings(request);
    await controller.getModuleCacheSummary(request, {});
    await controller.getTextureIndexSummary(request);
    await controller.queryTextureIndex(request, {
      resref: "M_MODULE",
      limit: "10",
      offset: "2"
    });
    await expect(
      controller.rebuildModuleCache(request, { forceFull: "true" })
    ).resolves.toMatchObject({
      data: {
        status: "updated",
        sourceDelta: expect.objectContaining({
          module: expect.any(Object),
          hak: expect.any(Object),
          vanilla: expect.any(Object),
          index: expect.any(Object)
        })
      }
    });
    await controller.replaceRuntimeSettings(request, payload);

    expect(service.getRuntimeSettings).toHaveBeenCalledTimes(1);
    expect(service.getResolvedHakSettings).toHaveBeenCalledTimes(1);
    expect(service.getModuleBlobCacheSummary).toHaveBeenCalledWith(200);
    expect(service.getTextureIndexMetadataSummary).toHaveBeenCalledTimes(1);
    expect(service.queryTextureIndex).toHaveBeenCalledWith({
      resref: "M_MODULE",
      limit: 10,
      offset: 2
    });
    expect(service.rebuildModuleBlobCache).toHaveBeenCalledWith("admin.user", {
      forceFull: true
    });
    expect(service.replaceRuntimeSettings).toHaveBeenCalledWith(payload, "admin.user");
  });

  it("validates runtime texture index query params", async () => {
    const service = {
      queryTextureIndex: jest.fn()
    } as unknown as jest.Mocked<RuntimeSettingsApplicationService>;
    const controller = new RuntimeSettingsController(service, config);
    const request = appRequest("admin.user");

    await expect(
      controller.queryTextureIndex(request, {
        limit: "0"
      })
    ).rejects.toMatchObject({
      status: 422,
      code: "VALIDATION_FAILED"
    });
    await expect(
      controller.queryTextureIndex(request, {
        offset: "-1"
      })
    ).rejects.toMatchObject({
      status: 422,
      code: "VALIDATION_FAILED"
    });
    expect(service.queryTextureIndex).not.toHaveBeenCalled();
  });

  it("applies runtime texture index defaults and ignores empty resref", async () => {
    const service = {
      queryTextureIndex: jest.fn().mockResolvedValue({
        available: true,
        totalEntries: 0,
        entries: []
      })
    } as unknown as jest.Mocked<RuntimeSettingsApplicationService>;
    const controller = new RuntimeSettingsController(service, config);
    const request = appRequest("admin.user");

    await controller.queryTextureIndex(request, {});
    await controller.queryTextureIndex(request, {
      resref: "   "
    });

    expect(service.queryTextureIndex).toHaveBeenNthCalledWith(1, {
      limit: 100,
      offset: 0
    });
    expect(service.queryTextureIndex).toHaveBeenNthCalledWith(2, {
      resref: undefined,
      limit: 100,
      offset: 0
    });
  });

  it("streams runtime texture blob with sanitized filename headers", async () => {
    const service = {
      getTextureBlobById: jest.fn().mockResolvedValue({
        texture: {
          textureId: "abcdefabcdefabcdefabcdef",
          resref: "bad\"name\r\n",
          extension: "txi\\tga",
          objectKey: "modules/current/textures/bad.tga"
        },
        payload: {
          contentType: "image/x-tga",
          size: 3,
          etag: "etag-1",
          bytes: Buffer.from([1, 2, 3])
        }
      })
    } as unknown as jest.Mocked<RuntimeSettingsApplicationService>;
    const controller = new RuntimeSettingsController(service, config);
    const response = createReply();

    await controller.getTextureBlob(
      "abcdefabcdefabcdefabcdef",
      response as unknown as FastifyReply
    );

    expect(service.getTextureBlobById).toHaveBeenCalledWith("abcdefabcdefabcdefabcdef");
    expect(response.header).toHaveBeenCalledWith(
      "Content-Disposition",
      "inline; filename=\"bad_name__.txi_tga\""
    );
    expect(response.send).toHaveBeenCalledWith(Buffer.from([1, 2, 3]));
  });

  it("delegates base template catalog controllers", async () => {
    const service = {
      listTemplateKind: jest.fn().mockResolvedValue({ items: [], total: 0 }),
      getTemplateKindPreview: jest.fn().mockResolvedValue({ templateId: "id" }),
      processTemplateKind: jest.fn().mockResolvedValue({ cacheKey: "d".repeat(64) }),
      getProcessedTemplateKind: jest.fn().mockResolvedValue({ cacheKey: "d".repeat(64) }),
      listPlaceables: jest.fn().mockResolvedValue({ items: [], total: 0 }),
      getPlaceablePreview: jest.fn().mockResolvedValue({ templateId: "id" }),
      processPlaceable: jest.fn().mockResolvedValue({ cacheKey: "d".repeat(64) }),
      getProcessedPlaceable: jest.fn().mockResolvedValue({ cacheKey: "d".repeat(64) }),
      benchmarkPlaceables: jest.fn().mockResolvedValue({ stats: [] }),
      getProcessedPlaceableAssetDelivery: jest.fn().mockResolvedValue({
        cacheKey: "d".repeat(64),
        moduleHash: "hash-1",
        assets: [
          {
            assetId: "e".repeat(8),
            objectKey: "modules/current/models/model.mdl",
            contentType: "application/octet-stream",
            sizeBytes: 3,
            deliveryPath: "/api/v1/catalog/placeables/cache/d/assets/e",
            deliveryUrl: "/api/v1/catalog/placeables/cache/d/assets/e"
          }
        ]
      }),
      getProcessedPlaceableAsset: jest.fn().mockResolvedValue({
        cacheKey: "d".repeat(64),
        moduleHash: "hash-1",
        asset: {
          assetId: "e".repeat(8),
          fileName: "bad\"name\r\n.bin"
        },
        payload: {
          contentType: "application/octet-stream",
          size: 3,
          etag: "etag",
          bytes: Buffer.from([1, 2, 3])
        }
      })
    } as unknown as jest.Mocked<CatalogApplicationService>;
    const request = appRequest();
    const creaturesController = new CreaturesController(service, config);
    const itemsController = new ItemsController(service, config);
    const placeablesController = new PlaceablesController(service, config);
    const response = createReply();

    await creaturesController.list(request, {});
    await creaturesController.preview(request, "template-1");
    await creaturesController.process(request, { resref: "cre_guard_human" });
    await creaturesController.getCached(request, "d".repeat(16));

    await itemsController.list(request, {});
    await itemsController.preview(request, "template-2");
    await itemsController.process(request, { templateId: "itm_health_potion_001" });
    await itemsController.getCached(request, "d".repeat(16));

    await placeablesController.list(request, {});
    await placeablesController.preview(request, "plc_market_stall_001");
    await placeablesController.process(request, { templateId: "plc_market_stall_001" });
    await placeablesController.getCached(request, "d".repeat(16));
    await placeablesController.benchmark(request, {
      templateIds: ["plc_market_stall_001"],
      iterations: 1,
      warmupIterations: 0
    });
    await placeablesController.getCachedAssetContracts(request, "d".repeat(16), {
      assetIds: `${"e".repeat(8)},${"f".repeat(8)}`
    });
    await placeablesController.getCachedAsset(
      "d".repeat(16),
      "e".repeat(8),
      response as unknown as FastifyReply
    );

    expect(service.listTemplateKind).toHaveBeenCalledWith(
      "creature",
      expect.objectContaining({ limit: 20, offset: 0 })
    );
    expect(service.listTemplateKind).toHaveBeenCalledWith(
      "item",
      expect.objectContaining({ limit: 20, offset: 0 })
    );
    expect(service.processTemplateKind).toHaveBeenCalledTimes(2);
    expect(service.listPlaceables).toHaveBeenCalledTimes(1);
    expect(service.processPlaceable).toHaveBeenCalledWith({
      templateId: "plc_market_stall_001",
      bypassCache: false,
      includeBenchmarkMetadata: true
    });
    expect(service.getProcessedPlaceableAssetDelivery).toHaveBeenCalledWith("d".repeat(16), [
      "eeeeeeee",
      "ffffffff"
    ]);
    expect(service.getProcessedPlaceableAsset).toHaveBeenCalledWith("d".repeat(16), "e".repeat(8));
    expect(response.header).toHaveBeenCalledWith(
      "Content-Disposition",
      "inline; filename=\"bad_name__.bin\""
    );
    expect(response.send).toHaveBeenCalledWith(Buffer.from([1, 2, 3]));
  });

  it("validates placeable asset delivery query before calling service", async () => {
    const service = {
      getProcessedPlaceableAssetDelivery: jest.fn()
    } as unknown as jest.Mocked<CatalogApplicationService>;
    const request = appRequest();
    const placeablesController = new PlaceablesController(service, config);

    await expect(
      placeablesController.getCachedAssetContracts(request, "d".repeat(16), {
        assetIds: "not-hex-value"
      })
    ).rejects.toMatchObject({
      code: "VALIDATION_FAILED",
      message: "Placeable asset delivery query validation failed."
    });
    expect(service.getProcessedPlaceableAssetDelivery).not.toHaveBeenCalled();
  });

  it("normalizes repeated placeable assetIds query params and forwards them to service", async () => {
    const service = {
      getProcessedPlaceableAssetDelivery: jest.fn().mockResolvedValue({
        cacheKey: "d".repeat(64),
        moduleHash: "hash-1",
        assets: []
      })
    } as unknown as jest.Mocked<CatalogApplicationService>;
    const request = appRequest();
    const placeablesController = new PlaceablesController(service, config);

    await placeablesController.getCachedAssetContracts(request, "d".repeat(16), {
      assetIds: ["e".repeat(8), "f".repeat(8)]
    });

    expect(service.getProcessedPlaceableAssetDelivery).toHaveBeenCalledWith("d".repeat(16), [
      "eeeeeeee",
      "ffffffff"
    ]);
  });

  it("rejects mixed valid and invalid repeated assetIds query params", async () => {
    const service = {
      getProcessedPlaceableAssetDelivery: jest.fn()
    } as unknown as jest.Mocked<CatalogApplicationService>;
    const request = appRequest();
    const placeablesController = new PlaceablesController(service, config);

    await expect(
      placeablesController.getCachedAssetContracts(request, "d".repeat(16), {
        assetIds: ["e".repeat(8), "not-hex-value"]
      })
    ).rejects.toMatchObject({
      code: "VALIDATION_FAILED",
      message: "Placeable asset delivery query validation failed."
    });
    expect(service.getProcessedPlaceableAssetDelivery).not.toHaveBeenCalled();
  });

  it("treats empty assetIds query as no filter", async () => {
    const service = {
      getProcessedPlaceableAssetDelivery: jest.fn().mockResolvedValue({
        cacheKey: "d".repeat(64),
        moduleHash: "hash-1",
        assets: []
      })
    } as unknown as jest.Mocked<CatalogApplicationService>;
    const request = appRequest();
    const placeablesController = new PlaceablesController(service, config);

    await placeablesController.getCachedAssetContracts(request, "d".repeat(16), {
      assetIds: " , , "
    });

    expect(service.getProcessedPlaceableAssetDelivery).toHaveBeenCalledWith(
      "d".repeat(16),
      undefined
    );
  });
});

function appRequest(username = "builder.user") {
  return {
    requestId: "req-1",
    auth: {
      sessionToken: "token-1",
      issuedAt: "2026-05-25T12:00:00.000Z",
      expiresAt: "2026-05-25T13:00:00.000Z",
      user: {
        id: "user-1",
        username,
        displayName: "Admin User",
        role: "admin"
      },
      permissions: ["dm.spawn_creature", "admin.config.write"]
    }
  } as any;
}

function createReply() {
  const reply = {
    header: jest.fn(),
    code: jest.fn(),
    send: jest.fn()
  };
  reply.header.mockReturnValue(reply);
  reply.code.mockReturnValue(reply);
  return reply;
}

function buildRuntimeSettingsPayload() {
  const defaults = buildDefaultRuntimeSettings("2026-05-23T00:00:00.000Z");
  const {
    revision: _revision,
    updatedAt: _updatedAt,
    updatedBy: _updatedBy,
    ...payload
  } = defaults;

  return payload;
}

