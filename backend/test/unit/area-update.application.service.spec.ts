import { AppException } from "../../src/common/http/app-exception";
import { AreaUpdateApplicationService } from "../../src/modules/areas/application/area-update.application.service";
import type { AreaUpdateApplicationDependencies } from "../../src/modules/areas/application/area-update.application.service";

const REVISION = "1".repeat(64);

describe("AreaUpdateApplicationService", () => {
  it("bootstraps the exact workspace, executes one transaction, and invalidates read caches", async () => {
    const harness = createHarness();

    const result = await harness.service.update({
      moduleId: "workspace:module-01",
      areaResRef: "CRYPT01",
      actorId: "admin-01",
      idempotencyKey: "update-key-01",
      ifMatchHeader: `"${REVISION}"`,
      body: command(),
    });

    expect(harness.dependencies.bootstrap.ensureCurrentWorkspaceBootstrapped).toHaveBeenCalledTimes(1);
    expect(harness.dependencies.authorization.authorize).toHaveBeenCalledWith({
      actorId: "admin-01",
      moduleId: "workspace:module-01",
      permission: "area.materialize.update",
    });
    expect(harness.dependencies.compiler.compile).toHaveBeenCalledWith(
      expect.objectContaining({ areaResRef: "crypt01" }),
      expect.objectContaining({ revision: REVISION }),
      "admin-01",
      "update-tx-01",
    );
    expect(harness.dependencies.tileAdmission.evaluateProductionAdmission).toHaveBeenCalledWith({
      tilesetResRef: "tin01",
      candidateTileIds: [],
    });
    expect(result.idempotency).toBe("created");
    expect(harness.dependencies.caches.invalidateAreas).toHaveBeenCalledTimes(1);
    expect(harness.dependencies.caches.invalidateEditing).toHaveBeenCalledTimes(1);
    expect(harness.dependencies.caches.invalidateCatalog).toHaveBeenCalledTimes(1);
  });

  it("rejects path/body identity drift before authorization or storage mutation", async () => {
    const harness = createHarness();

    await expect(harness.service.update({
      moduleId: "workspace:other",
      areaResRef: "crypt01",
      actorId: "admin-01",
      idempotencyKey: "update-key-01",
      ifMatchHeader: `"${REVISION}"`,
      body: command(),
    })).rejects.toMatchObject({ status: 422, code: "AREA_UPDATE_INVALID" });
    expect(harness.dependencies.bootstrap.ensureCurrentWorkspaceBootstrapped).not.toHaveBeenCalled();
    expect(harness.dependencies.authorization.authorize).not.toHaveBeenCalled();
    expect(harness.dependencies.storage.stage).not.toHaveBeenCalled();
  });

  it("rejects a path module outside the current workspace before acquiring the lock", async () => {
    const harness = createHarness();
    (harness.dependencies.bootstrap.ensureCurrentWorkspaceBootstrapped as jest.Mock).mockResolvedValue({
      head: { moduleId: "workspace:other", revision: REVISION },
    });

    await expect(harness.service.update({
      moduleId: "workspace:module-01",
      areaResRef: "crypt01",
      actorId: "admin-01",
      idempotencyKey: "update-key-01",
      ifMatchHeader: `"${REVISION}"`,
      body: command(),
    })).rejects.toMatchObject({ status: 404, code: "AREA_UPDATE_STORAGE_UNAVAILABLE" });
    expect(harness.dependencies.lock.acquire).not.toHaveBeenCalled();
  });

  it("maps transaction failures into bounded common HTTP errors without invalidating caches", async () => {
    const harness = createHarness();
    (harness.dependencies.authorization.authorize as jest.Mock).mockResolvedValue(false);

    let caught: unknown;
    try {
      await harness.service.update({
        moduleId: "workspace:module-01",
        areaResRef: "crypt01",
        actorId: "builder-01",
        idempotencyKey: "update-key-01",
        ifMatchHeader: `"${REVISION}"`,
        body: command(),
      });
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(AppException);
    expect(caught).toMatchObject({ status: 403, code: "AREA_UPDATE_PERMISSION_DENIED" });
    expect(harness.dependencies.caches.invalidateAreas).not.toHaveBeenCalled();
  });
});

function createHarness() {
  const candidate = {
    areaId: "crypt01",
    sourceAreaSha256: "a".repeat(64),
    candidateAreaSha256: "b".repeat(64),
    setFingerprintSha256: "e".repeat(64),
    projectedDraft: {
      areaResRef: "crypt01",
      name: "Crypt",
      width: 2,
      height: 2,
      tilesetResRef: "tin01",
      tilesetFingerprint: "e".repeat(64),
      areaFingerprint: "a".repeat(64),
      tiles: [],
    },
    unchangedCompanions: {
      gitSha256: "c".repeat(64),
      gicSha256: "f".repeat(64),
      moduleIfoSha256: "9".repeat(64),
    },
    resources: [{
      extension: "are" as const,
      key: "crypt01.are",
      fileName: "crypt01.are",
      resourceType: 2012,
      bytes: Buffer.from("are"),
      size: 3,
      sha256: "b".repeat(64),
    }],
    moduleIfo: {
      key: "module.ifo",
      fileName: "module.ifo",
      resourceType: 2014,
      baselineBytes: Buffer.from("ifo"),
      baselineSha256: "9".repeat(64),
      candidateBytes: Buffer.from("ifo"),
      candidateSha256: "9".repeat(64),
    },
  };
  const dependencies: AreaUpdateApplicationDependencies = {
    bootstrap: {
      ensureCurrentWorkspaceBootstrapped: jest.fn(async () => ({
        head: { moduleId: "workspace:module-01", revision: REVISION },
      } as never)),
    },
    authorization: { authorize: jest.fn(async () => true) },
    lock: {
      acquire: jest.fn(async () => ({
        moduleId: "workspace:module-01",
        leaseId: "lease-01",
        ownerTransactionId: "update-tx-01",
        fencingToken: 1,
        expiresAt: "2026-08-12T12:00:30.000Z",
      })),
      release: jest.fn(async () => true),
    },
    idempotency: { read: jest.fn(async () => null) },
    storage: {
      readModuleState: jest.fn(async () => ({
        moduleId: "workspace:module-01",
        revision: REVISION,
        quarantined: false,
      })),
      stage: jest.fn(async () => undefined),
      commitResources: jest.fn(async () => undefined),
      commitModuleIfo: jest.fn(async () => undefined),
      readBack: jest.fn(async () => ({
        verified: true,
        newModuleRevision: "2".repeat(64),
        resources: candidate.resources.map(({ bytes: _bytes, ...entry }) => entry),
        moduleIfo: { key: "module.ifo", size: 3, sha256: "9".repeat(64) },
        diagnostics: [],
      })),
      compensate: jest.fn(async () => ({ restored: true, diagnostics: [] })),
      quarantine: jest.fn(async () => undefined),
    },
    compiler: { compile: jest.fn(async () => candidate) },
    tileAdmission: {
      evaluateProductionAdmission: jest.fn(async () => ({
        allowed: true as const,
        code: "AREA_TILE_PRODUCTION_ADMITTED" as const,
        tilesetResRef: "tin01",
        tileIds: Object.freeze([]) as readonly number[],
        diagnostics: Object.freeze([]) as readonly [],
        admission: Object.freeze({
          schemaVersion: "area-tile-production-admission.v1" as const,
          policyVersion: "area-tile-production-admission-policy.v1" as const,
          reportGeneratedAtIso: "2026-08-21T18:00:00.000Z",
          planId: "plan-01",
          corpusHash: "c".repeat(64),
          profileId: "source-bound-v7",
          ledgerSha256: "3".repeat(64),
          reportSha256: "4".repeat(64),
          tilesetResRef: "tin01",
          uniqueTileIdCount: 0,
          tileIdSetSha256: "5".repeat(64),
        }),
      })),
    },
    journal: {
      begin: jest.fn(async () => undefined),
      transition: jest.fn(async () => undefined),
      recordReadback: jest.fn(async () => undefined),
      finalize: jest.fn(async () => undefined),
      readJournal: jest.fn(async () => null),
      listRecoverable: jest.fn(async () => []),
    },
    ids: { nextTransactionId: () => "update-tx-01" },
    clock: { nowIso: () => "2026-08-12T12:00:00.000Z" },
    caches: {
      invalidateAreas: jest.fn(),
      invalidateEditing: jest.fn(),
      invalidateCatalog: jest.fn(),
    },
  };
  return { dependencies, service: new AreaUpdateApplicationService(dependencies) };
}

function command() {
  return {
    schemaVersion: "area-update-command.v1",
    moduleId: "workspace:module-01",
    areaResRef: "CRYPT01",
    expectedModuleRevision: REVISION,
    draft: { id: "draft-01", revision: 3, normalizedSha256: "d".repeat(64) },
    clientCommandId: "client-command-01",
  };
}
