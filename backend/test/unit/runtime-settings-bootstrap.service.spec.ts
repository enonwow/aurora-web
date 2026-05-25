import { RuntimeSettingsBootstrapService } from "../../src/modules/runtime-settings/application/runtime-settings-bootstrap.service";
import type { RuntimeSettingsApplicationService } from "../../src/modules/runtime-settings/application/runtime-settings.application.service";

describe("RuntimeSettingsBootstrapService", () => {
  const previousNodeEnv = process.env.NODE_ENV;
  const previousBootstrapFlag = process.env.RUNTIME_SETTINGS_BOOTSTRAP_SYNC;
  let settingsService: jest.Mocked<RuntimeSettingsApplicationService>;
  let service: RuntimeSettingsBootstrapService;

  beforeAll(() => {
    process.env.NODE_ENV = "development";
    delete process.env.RUNTIME_SETTINGS_BOOTSTRAP_SYNC;
  });

  afterAll(() => {
    process.env.NODE_ENV = previousNodeEnv;
    if (previousBootstrapFlag === undefined) {
      delete process.env.RUNTIME_SETTINGS_BOOTSTRAP_SYNC;
    } else {
      process.env.RUNTIME_SETTINGS_BOOTSTRAP_SYNC = previousBootstrapFlag;
    }
  });

  beforeEach(() => {
    settingsService = {
      getRuntimeSettings: jest.fn(),
      getResolvedHakSettings: jest.fn(),
      replaceRuntimeSettings: jest.fn(),
      getModuleBlobCacheSummary: jest.fn(),
      syncModuleBlobCache: jest.fn(),
      rebuildModuleBlobCache: jest.fn()
    } as unknown as jest.Mocked<RuntimeSettingsApplicationService>;

    service = new RuntimeSettingsBootstrapService(settingsService);
  });

  it("runs incremental module cache sync on startup", async () => {
    settingsService.syncModuleBlobCache.mockResolvedValue({
      mode: "incremental",
      source: {
        type: "decompiled",
        path: "C:/module/temp0"
      },
      sync: {
        bucket: "aurora-module-assets",
        prefix: "modules/current/",
        moduleHash: "hash-v2",
        previousModuleHash: "hash-v1",
        status: "updated",
        uploadedFiles: 4,
        uploadedBytes: 4096,
        deletedFiles: 1,
        deletedBytes: 1024,
        unchangedFiles: 20,
        totalFiles: 24
      },
      settingsRevision: 7,
      triggeredBy: "system.bootstrap",
      triggeredAt: "2026-05-24T08:00:00.000Z",
      textures: {
        uploadedTextureFiles: 2,
        uploadedTextureBytes: 2048,
        moduleTextures: 1,
        hakTextures: 1,
        vanillaTextures: 0,
        textureIndexObjectKey: "modules/current/__aurora/meta/texture-index.v1.json"
      }
    });

    await expect(service.onApplicationBootstrap()).resolves.toBeUndefined();
    expect(settingsService.syncModuleBlobCache).toHaveBeenCalledWith(
      "system.bootstrap",
      { forceFull: false }
    );
  });

  it("also succeeds when nothing changed (noop hash)", async () => {
    settingsService.syncModuleBlobCache.mockResolvedValue({
      mode: "incremental",
      source: {
        type: "packed",
        path: "C:/modules/the_last_city.mod"
      },
      sync: {
        bucket: "aurora-module-assets",
        prefix: "modules/current/",
        moduleHash: "hash-v2",
        previousModuleHash: "hash-v2",
        status: "noop",
        uploadedFiles: 0,
        uploadedBytes: 0,
        deletedFiles: 0,
        deletedBytes: 0,
        unchangedFiles: 24,
        totalFiles: 24
      },
      settingsRevision: 8,
      triggeredBy: "system.bootstrap",
      triggeredAt: "2026-05-24T08:10:00.000Z",
      textures: {
        uploadedTextureFiles: 2,
        uploadedTextureBytes: 2048,
        moduleTextures: 1,
        hakTextures: 1,
        vanillaTextures: 0,
        textureIndexObjectKey: "modules/current/__aurora/meta/texture-index.v1.json"
      }
    });

    await expect(service.onApplicationBootstrap()).resolves.toBeUndefined();
    expect(settingsService.syncModuleBlobCache).toHaveBeenCalledWith(
      "system.bootstrap",
      { forceFull: false }
    );
  });

  it("fails startup when sync throws", async () => {
    settingsService.syncModuleBlobCache.mockRejectedValue(
      new Error("Runtime settings invalid")
    );

    await expect(service.onApplicationBootstrap()).rejects.toThrow(
      "Runtime settings invalid"
    );
  });

  it("skips bootstrap sync when disabled by flag", async () => {
    process.env.RUNTIME_SETTINGS_BOOTSTRAP_SYNC = "false";
    try {
      await expect(service.onApplicationBootstrap()).resolves.toBeUndefined();
      expect(settingsService.syncModuleBlobCache).not.toHaveBeenCalled();
    } finally {
      delete process.env.RUNTIME_SETTINGS_BOOTSTRAP_SYNC;
    }
  });
});
