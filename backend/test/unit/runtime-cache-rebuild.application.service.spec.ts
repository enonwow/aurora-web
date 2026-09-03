import { buildDefaultRuntimeSettings } from "../../src/modules/runtime-settings/domain/runtime-settings.defaults";
import type { RuntimeSettingsRecord } from "../../src/modules/runtime-settings/domain/runtime-settings.types";
import type { RuntimeSettingsRepositoryPort } from "../../src/modules/runtime-settings/application/ports/runtime-settings-repository.port";
import { RuntimeSettingsApplicationService } from "../../src/modules/runtime-settings/application/runtime-settings.application.service";
import { RuntimeCacheRebuildApplicationService } from "../../src/modules/runtime-settings/application/runtime-cache-rebuild.application.service";
import type { AuthApplicationService } from "../../src/modules/auth/application/auth.application.service";
import { MemorySystemMaintenanceRepository } from "../../src/modules/system-maintenance/adapters/outbound/memory/memory-system-maintenance.repository";
import { SystemMaintenanceApplicationService } from "../../src/modules/system-maintenance/application/system-maintenance.application.service";

describe("RuntimeCacheRebuildApplicationService", () => {
  it("returns NO_CHANGES without revoking sessions or writing a staging generation", async () => {
    const current = withGeneration(buildDefaultRuntimeSettings(), "g-active");
    const repository = buildRepository(current);
    const maintenance = await buildMaintenanceWithActiveGeneration(
      "same-fingerprint",
      "g-active"
    );
    const runtimeSettings = buildRuntimeSettingsMock();
    runtimeSettings.buildRuntimeInputFingerprint.mockResolvedValue({
      fingerprint: "same-fingerprint",
      sourceFiles: 12,
      sourceBytes: 2048,
      sourceType: "decompiled",
      sourcePath: "module"
    });
    runtimeSettings.validateRuntimeCacheIntegrity.mockResolvedValue({
      valid: true,
      reason: "ok",
      totalFiles: 12,
      moduleHash: "module-hash"
    });
    const auth = buildAuthMock();
    const service = new RuntimeCacheRebuildApplicationService(
      runtimeSettings,
      maintenance,
      auth,
      repository
    );

    const result = await service.startCurrent("admin.user", "no-change");

    expect(result).toMatchObject({
      outcome: "NO_CHANGES",
      fingerprint: "same-fingerprint",
      generation: "g-active"
    });
    expect(auth.revokeAllSessions).not.toHaveBeenCalled();
    expect(runtimeSettings.syncModuleBlobCacheForSettings).not.toHaveBeenCalled();
    expect(runtimeSettings.persistRuntimeSettingsRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        blobStorage: expect.objectContaining({
          modulePrefix: current.blobStorage.modulePrefix
        })
      })
    );
  });

  it("revokes all sessions, builds staging, validates it, and publishes one generation", async () => {
    const current = buildDefaultRuntimeSettings();
    const repository = buildRepository(current);
    const maintenance = new SystemMaintenanceApplicationService(
      new MemorySystemMaintenanceRepository()
    );
    await maintenance.onModuleInit();
    const runtimeSettings = buildRuntimeSettingsMock();
    runtimeSettings.buildRuntimeInputFingerprint.mockResolvedValue({
      fingerprint: "changed-fingerprint",
      sourceFiles: 2,
      sourceBytes: 64,
      sourceType: "decompiled",
      sourcePath: "module"
    });
    runtimeSettings.validateRuntimeCacheIntegrity
      .mockResolvedValueOnce({
        valid: false,
        reason: "missing_generation",
        totalFiles: 0
      })
      .mockResolvedValueOnce({
        valid: true,
        reason: "ok",
        totalFiles: 2,
        moduleHash: "module-hash"
      });
    runtimeSettings.buildGenerationSettings.mockImplementation(
      (settings, generation) => withGeneration(settings, generation)
    );
    runtimeSettings.syncModuleBlobCacheForSettings.mockResolvedValue({
      mode: "full",
      source: { type: "decompiled", path: "module" },
      sync: {
        bucket: current.blobStorage.bucket,
        prefix: "modules/current/__generations/g-next/",
        moduleHash: "module-hash",
        status: "updated",
        uploadedFiles: 2,
        uploadedBytes: 64,
        deletedFiles: 0,
        deletedBytes: 0,
        unchangedFiles: 0,
        totalFiles: 2
      },
      settingsRevision: current.revision,
      triggeredBy: "admin.user",
      triggeredAt: new Date().toISOString(),
      derivedAssets: {
        generator: "test",
        generatedFiles: 0,
        generatedBytes: 0
      },
      textures: {
        uploadedTextureFiles: 0,
        uploadedTextureBytes: 0,
        moduleTextures: 0,
        hakTextures: 0,
        vanillaTextures: 0,
        textureIndexObjectKey: "texture-index.v1.json"
      }
    } as never);
    const auth = buildAuthMock();
    const service = new RuntimeCacheRebuildApplicationService(
      runtimeSettings,
      maintenance,
      auth,
      repository
    );

    const result = await service.startCurrent("admin.user", "changed");
    expect(result.outcome).toBe("ACCEPTED");
    expect(auth.revokeAllSessions).toHaveBeenCalledTimes(1);

    const completed = await waitForState(maintenance, "idle");
    expect(completed).toMatchObject({
      phase: "completed",
      activeRuntimeFingerprint: "changed-fingerprint",
      activeGeneration: result.generation
    });
    expect(runtimeSettings.persistRuntimeSettingsRecord).toHaveBeenCalledTimes(1);
    expect(runtimeSettings.persistRuntimeSettingsRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        blobStorage: expect.objectContaining({
          modulePrefix: expect.stringContaining(
            `/__generations/${result.generation}`
          )
        })
      })
    );
  });
});

function buildRepository(
  current: RuntimeSettingsRecord
): jest.Mocked<RuntimeSettingsRepositoryPort> {
  return {
    get: jest.fn().mockResolvedValue(structuredClone(current)),
    save: jest.fn()
  };
}

function buildRuntimeSettingsMock(): jest.Mocked<RuntimeSettingsApplicationService> {
  return {
    buildRuntimeInputFingerprint: jest.fn(),
    validateRuntimeCacheIntegrity: jest.fn(),
    persistRuntimeSettingsRecord: jest.fn(),
    buildGenerationSettings: jest.fn(),
    syncModuleBlobCacheForSettings: jest.fn()
  } as unknown as jest.Mocked<RuntimeSettingsApplicationService>;
}

function buildAuthMock(): jest.Mocked<AuthApplicationService> {
  return {
    revokeAllSessions: jest.fn().mockResolvedValue(1)
  } as unknown as jest.Mocked<AuthApplicationService>;
}

async function buildMaintenanceWithActiveGeneration(
  fingerprint: string,
  generation: string
): Promise<SystemMaintenanceApplicationService> {
  const maintenance = new SystemMaintenanceApplicationService(
    new MemorySystemMaintenanceRepository()
  );
  await maintenance.onModuleInit();
  const lease = await maintenance.beginPreflight("admin.user", "seed");
  await maintenance.enterRebuilding({
    operationId: lease.record.operationId!,
    candidateRuntimeFingerprint: fingerprint,
    stagingGeneration: generation,
    candidateSettings: { revision: 1 },
    previousSettings: { revision: 1 },
    participants: []
  });
  await maintenance.completePublished(
    lease.record.operationId!,
    fingerprint,
    generation,
    []
  );
  return maintenance;
}

function withGeneration(
  settings: RuntimeSettingsRecord,
  generation: string
): RuntimeSettingsRecord {
  return {
    ...structuredClone(settings),
    blobStorage: {
      ...settings.blobStorage,
      modulePrefix: `modules/current/__generations/${generation}`
    }
  };
}

async function waitForState(
  maintenance: SystemMaintenanceApplicationService,
  state: "idle" | "failed"
) {
  const deadline = Date.now() + 2_000;
  while (Date.now() < deadline) {
    const record = await maintenance.getState();
    if (record.state === state && record.phase !== "idle") {
      return record;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(`Timed out waiting for maintenance state ${state}.`);
}
