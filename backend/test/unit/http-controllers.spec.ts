import type { FastifyReply } from "fastify";
import { AppConfigService } from "../../src/common/config/app-config.service";
import { HealthController } from "../../src/health/health.controller";
import { AreasController } from "../../src/modules/areas/adapters/inbound/http/areas.controller";
import { AreasApplicationService } from "../../src/modules/areas/application/areas.application.service";
import { AuthController } from "../../src/modules/auth/adapters/inbound/http/auth.controller";
import { AuthApplicationService } from "../../src/modules/auth/application/auth.application.service";
import { CreaturesController } from "../../src/modules/catalog/adapters/inbound/http/creatures.controller";
import { EncountersController } from "../../src/modules/catalog/adapters/inbound/http/encounters.controller";
import { ItemsController } from "../../src/modules/catalog/adapters/inbound/http/items.controller";
import { PlaceablesController } from "../../src/modules/catalog/adapters/inbound/http/placeables.controller";
import { WaypointsController } from "../../src/modules/catalog/adapters/inbound/http/waypoints.controller";
import { CatalogApplicationService } from "../../src/modules/catalog/application/catalog.application.service";
import { RuntimeSettingsController } from "../../src/modules/runtime-settings/adapters/inbound/http/runtime-settings.controller";
import { RuntimeSettingsApplicationService } from "../../src/modules/runtime-settings/application/runtime-settings.application.service";
import { RuntimeCacheRebuildApplicationService } from "../../src/modules/runtime-settings/application/runtime-cache-rebuild.application.service";
import { RuntimePathBrowserApplicationService } from "../../src/modules/runtime-settings/application/runtime-path-browser.application.service";
import { buildDefaultRuntimeSettings } from "../../src/modules/runtime-settings/domain/runtime-settings.defaults";
import { SoundsController } from "../../src/modules/sounds/adapters/inbound/http/sounds.controller";
import { SoundsApplicationService } from "../../src/modules/sounds/application/sounds.application.service";
import { TilesController } from "../../src/modules/tiles/adapters/inbound/http/tiles.controller";
import { TilesApplicationService } from "../../src/modules/tiles/application/tiles.application.service";

describe("HTTP controllers", () => {
  const config = { contractVersion: "1.0.0" } as AppConfigService;

  it("returns health payload", () => {
    const controller = new HealthController({
      contractVersion: "1.0.0",
      runtimeBuildCommit: "backend-commit-sha",
      runtimeBuildImageDigest: "sha256:backend-image",
      runtimeBuildBuiltAt: "2026-07-19T10:00:00.000Z"
    } as AppConfigService);
    expect(controller.getHealth()).toEqual(
      expect.objectContaining({
      status: "ok",
        service: "aurora-backend",
        runtimeStartedAt: expect.any(String),
        processId: process.pid,
        vfxRuntimeRevision:
          "vfx-placeable-canonical-host-light-source-v2-emitter-shell-filter",
        runtimeBuild: {
          commit: "backend-commit-sha",
          imageDigest: "sha256:backend-image",
          builtAt: "2026-07-19T10:00:00.000Z",
          processStartedAt: expect.any(String),
          contractVersion: "1.0.0",
          vfxRuntimeRevision:
            "vfx-placeable-canonical-host-light-source-v2-emitter-shell-filter"
        }
      })
    );
  });

  it("delegates area controller calls", async () => {
    const service = {
      getAreaCapabilities: jest.fn().mockReturnValue({
        schemaVersion: "area-capabilities.v1",
        catalogRevision: "2026-08-20.1",
        items: [],
        summary: {
          total: 0,
          implementation: { implemented: 0, partial: 0, preserve_only: 0, not_started: 0 },
          release: { available: 0, blocked: 0, hidden: 0 }
        }
      }),
      listAreas: jest.fn().mockResolvedValue({ items: [], total: 0 }),
      getAreaLightingEvidence: jest.fn().mockResolvedValue({
        summary: {
          areasScanned: 0,
          tileLightTiles: 0,
          tileLightReferences: 0,
          tileLightAreas: 0,
          areaGlobalLightingAreas: 0,
          areaGlobalLightingFields: 0,
          areaShadowOpacityAreas: 0,
          placeableNameCandidates: 0,
          placeableNameCandidateAreas: 0,
          catalogLightSourceTemplates: 0,
          catalogLightColorTemplates: 0,
          catalogLightStateTemplates: 0,
          processedMdlLightTemplatesScanned: 0,
          processedMdlLightSourceTemplates: 0,
          processedMdlLightNodes: 0,
          processedMdlLightScanLimit: 0,
          auroraActiveLightSlotCap: 128,
          rendererCandidateLights: 0,
          rendererAcceptedLights: 0,
          rendererDroppedLights: 0,
          shadowDiagnosticEntries: 0,
          shadowMdlLightNodes: 0,
          shadowCatalogShadowSizeTemplates: 0,
          auditCoverageEntries: 0,
          auditCoverageSourceBacked: 0,
          auditCoveragePreviewOnly: 0,
          auditCoverageBlocked: 0,
          auditCoverageNotObserved: 0,
          auditGaps: 0
        },
        tileLights: [],
        areaGlobalLighting: [],
        placeableNameCandidates: [],
        catalogLightSources: [],
        processedMdlLightSources: [],
        rendererLightBudget: {
          activeLightSlotCap: 128,
          candidateLights: 0,
          acceptedLights: 0,
          droppedLights: 0,
          sampledCandidateLights: 0,
          omittedCandidateLights: 0,
          priorityStrategy:
            "source-backed-mdl-lightmanager-score-then-diagnostic-lane-fallback",
          priorityStrategyProofStatus:
            "source-backed-mdl-lightmanager-score-diagnostic-cross-lane-fallback",
          retailMdlLightScoreSource:
            "C:/Projects/New Folder/export/decompiled_all.c:865838-865911 FUN_00a41850 writes per-light score at +0x84 from distance/radius/multiplier/priority fields",
          retailMdlLightSortSource:
            "C:/Projects/New Folder/export/decompiled_all.c:865710-865782 FUN_00a4165c/FUN_00a417bc sort active/shadow light lists with FUN_00a41694 comparator on +0x84",
          retailActiveLightSortScoreSource:
            "C:/Projects/New Folder/export/decompiled_all.c:865731-865735 FUN_00a41694 compares active-light score field +0x84 with '<'",
          retailActiveLightSortScoreFormula:
            "ascending +0x84 score; invalid radius/multiplier/extent -> 100000",
          retailActiveLightSortDirection: "ascending-score-field-0x84",
          retailActiveLightSortScoreProofStatus:
            "source-backed-retail-active-light-score-sort-known-cross-lane-insertion-blocked",
          retailActiveLightUploadSource:
            "C:/Projects/New Folder/export/decompiled_all.c:866101-866201 FUN_00a41e50 applies min(configured,0x80)",
          retailOrderingStatus: "blocked-no-recovered-retail-cross-lane-active-light-ordering",
          candidates: []
        },
        shadowDiagnostic: {
          entries: [],
          shadowRelevantEntries: 0,
          sampledEntries: 0,
          omittedEntries: 0,
          globalShadowFields: 0,
          areaShadowOpacityFields: 0,
          areaSunShadowFields: 0,
          areaMoonShadowFields: 0,
          mdlShadowLightNodes: 0,
          mdlExplicitNonShadowLightNodes: 0,
          catalogShadowSizeTemplates: 0
        },
        auditCoverage: [],
        auditGaps: []
      }),
      getArea: jest.fn().mockResolvedValue({ areaId: "area-1" }),
      getAreaPreview: jest.fn().mockResolvedValue({ areaId: "area-1" }),
      getAreaThumbnail: jest.fn().mockResolvedValue({
        contentType: "image/svg+xml; charset=utf-8",
        size: 12,
        etag: 'W/"area-thumb"',
        fileName: "area-1.svg",
        bytes: Buffer.from("<svg></svg>")
      }),
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
    const thumbnailResponse = createReply();

    await expect(controller.capabilities(request)).resolves.toMatchObject({
      contractVersion: "1.0.0",
      data: { schemaVersion: "area-capabilities.v1" }
    });
    await expect(controller.list(request, {})).resolves.toMatchObject({
      contractVersion: "1.0.0"
    });
    await controller.lightingEvidence(request);
    await controller.getById(request, "area-1");
    await controller.preview(request, "area-1");
    await controller.process(request, "area-1", { bypassCache: true });
    await controller.getCached(request, "a".repeat(16));
    await controller.thumbnail("area-1", thumbnailResponse as unknown as FastifyReply);
    await controller.getCachedTextureContract(request, "a".repeat(16), { mode: "direct" });
    await controller.getCachedTexture("a".repeat(16), response as unknown as FastifyReply);

    expect(service.listAreas).toHaveBeenCalledWith({
      limit: 20,
      offset: 0
    });
    expect(service.getAreaCapabilities).toHaveBeenCalledTimes(1);
    expect(service.getAreaLightingEvidence).toHaveBeenCalled();
    expect(service.getArea).toHaveBeenCalledWith("area-1");
    expect(service.getAreaPreview).toHaveBeenCalledWith("area-1");
    expect(service.getAreaThumbnail).toHaveBeenCalledWith("area-1");
    expect(service.processArea).toHaveBeenCalledWith({
      areaId: "area-1",
      bypassCache: true
    });
    expect(service.getProcessedArea).toHaveBeenCalledWith("a".repeat(16));
    expect(service.getProcessedAreaTextureDelivery).toHaveBeenCalledWith("a".repeat(16), "direct");
    expect(service.getProcessedAreaTexture).toHaveBeenCalledWith("a".repeat(16));
    expect(thumbnailResponse.header).toHaveBeenCalledWith(
      "Content-Type",
      "image/svg+xml; charset=utf-8"
    );
    expect(thumbnailResponse.header).toHaveBeenCalledWith(
      "Content-Disposition",
      "inline; filename=\"area-1.svg\""
    );
    expect(thumbnailResponse.send).toHaveBeenCalledWith(Buffer.from("<svg></svg>"));
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
      syncVanillaTilesetSetSources: jest.fn().mockResolvedValue({
        mode: "vanilla-tileset-set-source-sync",
        enabled: true,
        uploadedFiles: 1,
        uploadedBytes: 42,
        files: [
          {
            fileName: "__aurora/sources/vanilla/tilesets/tcn01.set",
            objectKey: "modules/current/__aurora/sources/vanilla/tilesets/tcn01.set",
            size: 42,
            resourceType: 2013
          }
        ]
      }),
      syncVanillaTileModelSources: jest.fn().mockResolvedValue({
        mode: "vanilla-tile-model-source-sync",
        enabled: true,
        requestedModelResRefs: ["tcn01_c01_01"],
        missingModelResRefs: [],
        uploadedFiles: 2,
        uploadedBytes: 16,
        files: [
          {
            fileName: "__aurora/sources/vanilla/models/tcn01_c01_01.mdl",
            objectKey: "modules/current/__aurora/sources/vanilla/models/tcn01_c01_01.mdl",
            size: 8,
            resourceType: 2002
          },
          {
            fileName: "__aurora/sources/vanilla/walkmeshes/tcn01_c01_01.wok",
            objectKey:
              "modules/current/__aurora/sources/vanilla/walkmeshes/tcn01_c01_01.wok",
            size: 8,
            resourceType: 2016
          }
        ]
      }),
    } as unknown as jest.Mocked<RuntimeSettingsApplicationService>;
    const cacheRebuildService = {
      startCurrent: jest.fn().mockResolvedValue({
        outcome: "NO_CHANGES",
        operationId: "operation-legacy",
        fingerprint: "fingerprint-legacy",
        integrity: { valid: true, reason: "ok" }
      }),
      startForRuntimeSettings: jest.fn().mockResolvedValue({
        outcome: "NO_CHANGES",
        operationId: "operation-1",
        fingerprint: "fingerprint-1",
        integrity: { valid: true, reason: "ok" }
      })
    } as unknown as jest.Mocked<RuntimeCacheRebuildApplicationService>;
    const controller = new RuntimeSettingsController(
      service,
      cacheRebuildService,
      {} as jest.Mocked<RuntimePathBrowserApplicationService>,
      config
    );
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
      controller.rebuildModuleCache(
        request,
        { forceFull: "true" },
        { confirmGlobalLogout: true },
        "idempotency-legacy",
        createReply() as unknown as FastifyReply
      )
    ).resolves.toMatchObject({
      data: {
        outcome: "NO_CHANGES",
        operationId: "operation-legacy"
      }
    });
    await expect(controller.syncVanillaTilesetSetSources(request)).resolves.toMatchObject({
      data: {
        mode: "vanilla-tileset-set-source-sync",
        uploadedFiles: 1,
        files: [
          expect.objectContaining({
            objectKey: "modules/current/__aurora/sources/vanilla/tilesets/tcn01.set"
          })
        ]
      }
    });
    await expect(
      controller.syncVanillaTileModelSources(request, {
        modelResRefs: ["TCN01_C01_01", "tcn01_c01_01"]
      })
    ).resolves.toMatchObject({
      data: {
        mode: "vanilla-tile-model-source-sync",
        uploadedFiles: 2,
        files: [
          expect.objectContaining({
            objectKey: "modules/current/__aurora/sources/vanilla/models/tcn01_c01_01.mdl"
          }),
          expect.objectContaining({
            objectKey:
              "modules/current/__aurora/sources/vanilla/walkmeshes/tcn01_c01_01.wok"
          })
        ]
      }
    });
    await controller.replaceRuntimeSettings(
      request,
      { ...payload, confirmGlobalLogout: true },
      "idempotency-1",
      createReply() as unknown as FastifyReply
    );

    expect(service.getRuntimeSettings).toHaveBeenCalledTimes(1);
    expect(service.getResolvedHakSettings).toHaveBeenCalledTimes(1);
    expect(service.getModuleBlobCacheSummary).toHaveBeenCalledWith(200);
    expect(service.getTextureIndexMetadataSummary).toHaveBeenCalledTimes(1);
    expect(service.queryTextureIndex).toHaveBeenCalledWith({
      resref: "M_MODULE",
      limit: 10,
      offset: 2
    });
    expect(cacheRebuildService.startCurrent).toHaveBeenCalledWith(
      "admin.user",
      "idempotency-legacy"
    );
    expect(service.syncVanillaTilesetSetSources).toHaveBeenCalledWith("admin.user");
    expect(service.syncVanillaTileModelSources).toHaveBeenCalledWith("admin.user", [
      "tcn01_c01_01"
    ]);
    expect(cacheRebuildService.startForRuntimeSettings).toHaveBeenCalledWith(
      payload,
      "admin.user",
      "idempotency-1"
    );
  });

  it("validates runtime texture index query params", async () => {
    const service = {
      queryTextureIndex: jest.fn()
    } as unknown as jest.Mocked<RuntimeSettingsApplicationService>;
    const controller = createRuntimeSettingsController(service);
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
    const controller = createRuntimeSettingsController(service);
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
    const controller = createRuntimeSettingsController(service);
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
      listWaypoints: jest.fn().mockResolvedValue({ items: [], total: 0 }),
      getWaypointPreview: jest.fn().mockResolvedValue({ templateId: "waypoint-id" }),
      listWaypointAppearanceRows: jest.fn().mockResolvedValue({
        resourceName: "waypoint.2da",
        sha256: "f".repeat(64),
        rowCount: 5,
        items: [{ rowIndex: 1, displayName: "Blue marker", displaySource: "strref" }],
        total: 1,
        limit: 100,
        offset: 0
      }),
      listPlaceableAppearanceRows: jest.fn().mockResolvedValue({
        resourceName: "placeables.2da",
        sha256: "a".repeat(64),
        rowCount: 1,
        items: [{ rowIndex: 0, displayName: "Row 0", displaySource: "row_index" }],
        total: 1,
        limit: 100,
        offset: 0
      }),
      listCreatureAppearanceRows: jest.fn().mockResolvedValue({
        resourceName: "appearance.2da",
        sha256: "b".repeat(64),
        rowCount: 1,
        items: [{ rowIndex: 0, displayName: "Dwarf, Male", displaySource: "strref" }],
        total: 1,
        limit: 100,
        offset: 0
      }),
      listCreatureGenderRows: jest.fn().mockResolvedValue({
        resourceName: "gender.2da",
        sha256: "c".repeat(64),
        rowCount: 5,
        items: [{
          rowIndex: 3,
          displayName: "Other",
          displaySource: "strref",
          nameStrRef: 201,
          genderToken: "O",
        }],
        total: 1,
        limit: 1,
        offset: 0
      }),
      listCreatureAppendageRows: jest.fn().mockResolvedValue({
        resourceName: "wingmodel.2da",
        sha256: "9".repeat(64),
        rowCount: 8,
        items: [{ rowIndex: 3, displayName: "Angel" }],
        total: 1,
        limit: 1,
        offset: 0,
      }),
      listCreaturePerceptionRangeRows: jest.fn().mockResolvedValue({
        resourceName: "ranges.2da",
        sha256: "e".repeat(64),
        rowCount: 12,
        items: [{
          rowIndex: 11,
          displayName: "Default",
          displaySource: "strref",
          nameStrRef: 6671,
        }],
        total: 1,
        limit: 1,
        offset: 0
      }),
      listCreatureWalkRateRows: jest.fn().mockResolvedValue({
        resourceName: "creaturespeed.2da",
        sha256: "d".repeat(64),
        rowCount: 9,
        items: [{
          rowIndex: 4,
          displayName: "Normal",
          displaySource: "strref",
          nameStrRef: 1004,
          twoDaName: "NORM",
        }],
        total: 1,
        limit: 1,
        offset: 0
      }),
      listCreatureSoundSetRows: jest.fn().mockResolvedValue({
        resourceName: "soundset.2da",
        sha256: "a".repeat(64),
        rowCount: 5_100,
        items: [{
          rowIndex: 0,
          displayName: "Aasimar",
          displaySource: "strref",
          nameStrRef: 8291,
          resRef: "c_aasimar",
        }],
        total: 1,
        limit: 1,
        offset: 0
      }),
      listCreatureStartingPackageRows: jest.fn().mockResolvedValue({
        resourceName: "packages.2da",
        sha256: "b".repeat(64),
        rowCount: 132,
        classIds: [4],
        items: [{
          rowIndex: 0,
          classId: 4,
          displayName: "Fighter",
          displaySource: "strref",
          nameStrRef: 6894,
        }],
        total: 1,
        limit: 1,
        offset: 0
      }),
      listCreatureSpecialAbilityRows: jest.fn().mockResolvedValue({
        resourceName: "spells.2da",
        sha256: "f".repeat(64),
        rowCount: 5,
        items: [{
          rowIndex: 2,
          displayName: "Aura of Cold",
          nameStrRef: 102,
          userType: 2,
        }],
        total: 1,
        limit: 1,
        offset: 0,
      }),
      getPlaceablePreview: jest.fn().mockResolvedValue({ templateId: "id" }),
      getPlaceableThumbnail: jest.fn().mockResolvedValue({
        contentType: "image/svg+xml; charset=utf-8",
        size: 12,
        etag: 'W/"plc-thumb"',
        fileName: "plc_market_stall_001.svg",
        bytes: Buffer.from("<svg></svg>")
      }),
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
    const encountersController = new EncountersController(service, config);
    const itemsController = new ItemsController(service, config);
    const placeablesController = new PlaceablesController(service, config);
    const waypointsController = new WaypointsController(service, config);
    const response = createReply();
    const placeableThumbnailResponse = createReply();

    await creaturesController.list(request, {});
    await creaturesController.listAppearanceRows(request, {
      tableSha256: "b".repeat(64),
      rowIndex: "249"
    });
    await creaturesController.listGenderRows(request, {
      tableSha256: "c".repeat(64),
      rowIndex: "3",
      limit: "1"
    });
    await creaturesController.listAppendageRows(request, {
      kind: "wings",
      tableSha256: "9".repeat(64),
      rowIndex: "3",
      limit: "1",
    });
    await creaturesController.listPerceptionRangeRows(request, {
      tableSha256: "e".repeat(64),
      rowIndex: "11",
      limit: "1"
    });
    await creaturesController.listWalkRateRows(request, {
      tableSha256: "d".repeat(64),
      rowIndex: "4",
      limit: "1"
    });
    await creaturesController.listSoundSetRows(request, {
      tableSha256: "a".repeat(64),
      rowIndex: "0",
      limit: "1"
    });
    await creaturesController.listStartingPackageRows(request, {
      tableSha256: "b".repeat(64),
      classIds: "4",
      rowIndex: "0",
      limit: "1"
    });
    await creaturesController.listSpecialAbilityRows(request, {
      tableSha256: "f".repeat(64),
      rowIndex: "2",
      limit: "1",
    });
    await creaturesController.preview(request, "template-1");
    await creaturesController.process(request, { resref: "cre_guard_human" });
    await creaturesController.getCached(request, "d".repeat(16));

    await encountersController.list(request, {});
    await encountersController.preview(request, "template-enc");
    await encountersController.process(request, { templateId: "enc_forest_ambush" });
    await encountersController.getCached(request, "d".repeat(16));

    await waypointsController.list(request, {});
    await waypointsController.listAppearanceRows(request, {
      tableSha256: "f".repeat(64)
    });
    await waypointsController.preview(request, "template-wpt");

    await itemsController.list(request, {});
    await itemsController.preview(request, "template-2");
    await itemsController.process(request, { templateId: "itm_health_potion_001" });
    await itemsController.getCached(request, "d".repeat(16));

    await placeablesController.list(request, {});
    await placeablesController.listAppearanceRows(request, {
      tableSha256: "a".repeat(64)
    });
    await placeablesController.preview(request, "plc_market_stall_001");
    await placeablesController.thumbnail(
      "plc_market_stall_001",
      placeableThumbnailResponse as unknown as FastifyReply
    );
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
      `${"e".repeat(8)}.glb`,
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
    expect(service.listCreatureAppearanceRows).toHaveBeenCalledWith({
      tableSha256: "b".repeat(64),
      rowIndex: 249,
      limit: 100,
      offset: 0
    });
    expect(service.listCreatureGenderRows).toHaveBeenCalledWith({
      tableSha256: "c".repeat(64),
      rowIndex: 3,
      limit: 1,
      offset: 0
    });
    expect(service.listCreatureAppendageRows).toHaveBeenCalledWith({
      kind: "wings",
      tableSha256: "9".repeat(64),
      rowIndex: 3,
      limit: 1,
      offset: 0,
    });
    expect(service.listCreaturePerceptionRangeRows).toHaveBeenCalledWith({
      tableSha256: "e".repeat(64),
      rowIndex: 11,
      limit: 1,
      offset: 0
    });
    expect(service.listCreatureWalkRateRows).toHaveBeenCalledWith({
      tableSha256: "d".repeat(64),
      rowIndex: 4,
      limit: 1,
      offset: 0
    });
    expect(service.listCreatureSoundSetRows).toHaveBeenCalledWith({
      tableSha256: "a".repeat(64),
      rowIndex: 0,
      limit: 1,
      offset: 0
    });
    expect(service.listCreatureStartingPackageRows).toHaveBeenCalledWith({
      tableSha256: "b".repeat(64),
      classIds: [4],
      rowIndex: 0,
      limit: 1,
      offset: 0
    });
    expect(service.listCreatureSpecialAbilityRows).toHaveBeenCalledWith({
      tableSha256: "f".repeat(64),
      rowIndex: 2,
      limit: 1,
      offset: 0,
    });
    expect(service.listTemplateKind).toHaveBeenCalledWith(
      "encounter",
      expect.objectContaining({ limit: 20, offset: 0 })
    );
    expect(service.listWaypoints).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 20, offset: 0 })
    );
    expect(service.listWaypointAppearanceRows).toHaveBeenCalledWith({
      tableSha256: "f".repeat(64),
      limit: 100,
      offset: 0
    });
    expect(service.getWaypointPreview).toHaveBeenCalledWith("template-wpt");
    expect(service.processTemplateKind).toHaveBeenCalledTimes(3);
    expect(service.listPlaceables).toHaveBeenCalledTimes(1);
    expect(service.listPlaceableAppearanceRows).toHaveBeenCalledWith({
      tableSha256: "a".repeat(64),
      limit: 100,
      offset: 0
    });
    expect(service.getPlaceableThumbnail).toHaveBeenCalledWith("plc_market_stall_001");
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
    expect(placeableThumbnailResponse.header).toHaveBeenCalledWith(
      "Content-Type",
      "image/svg+xml; charset=utf-8"
    );
    expect(placeableThumbnailResponse.header).toHaveBeenCalledWith(
      "Content-Disposition",
      "inline; filename=\"plc_market_stall_001.svg\""
    );
    expect(placeableThumbnailResponse.send).toHaveBeenCalledWith(Buffer.from("<svg></svg>"));
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

  it("validates the digest-bound Appearance row query before calling service", async () => {
    const service = {
      listPlaceableAppearanceRows: jest.fn()
    } as unknown as jest.Mocked<CatalogApplicationService>;
    const request = appRequest();
    const placeablesController = new PlaceablesController(service, config);

    await expect(placeablesController.listAppearanceRows(request, {
      tableSha256: "A".repeat(64),
      extra: "rejected"
    })).rejects.toMatchObject({
      code: "VALIDATION_FAILED",
      message: "Placeable Appearance row query validation failed."
    });
    expect(service.listPlaceableAppearanceRows).not.toHaveBeenCalled();
  });

  it("validates the digest-bound Waypoint Appearance row query before calling service", async () => {
    const service = {
      listWaypointAppearanceRows: jest.fn(),
    } as unknown as jest.Mocked<CatalogApplicationService>;
    const request = appRequest();
    const waypointsController = new WaypointsController(service, config);

    await expect(waypointsController.listAppearanceRows(request, {
      tableSha256: "F".repeat(64),
      extra: "rejected",
    })).rejects.toMatchObject({
      code: "VALIDATION_FAILED",
      message: "Waypoint Appearance row query validation failed.",
    });
    expect(service.listWaypointAppearanceRows).not.toHaveBeenCalled();
  });

  it("validates the digest-bound Creature Appearance row query before calling service", async () => {
    const service = {
      listCreatureAppearanceRows: jest.fn()
    } as unknown as jest.Mocked<CatalogApplicationService>;
    const request = appRequest();
    const creaturesController = new CreaturesController(service, config);

    await expect(creaturesController.listAppearanceRows(request, {
      tableSha256: "B".repeat(64),
      extra: "rejected"
    })).rejects.toMatchObject({
      code: "VALIDATION_FAILED",
      message: "Creature Appearance row query validation failed."
    });
    expect(service.listCreatureAppearanceRows).not.toHaveBeenCalled();
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

function createRuntimeSettingsController(
  service: jest.Mocked<RuntimeSettingsApplicationService>
) {
  return new RuntimeSettingsController(
    service,
    {} as jest.Mocked<RuntimeCacheRebuildApplicationService>,
    {} as jest.Mocked<RuntimePathBrowserApplicationService>,
    { contractVersion: "1.0.0" } as AppConfigService
  );
}

function createReply() {
  const reply = {
    header: jest.fn(),
    code: jest.fn(),
    status: jest.fn(),
    send: jest.fn()
  };
  reply.header.mockReturnValue(reply);
  reply.code.mockReturnValue(reply);
  reply.status.mockReturnValue(reply);
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

