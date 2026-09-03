import { AppException } from "../../src/common/http/app-exception";
import { AreaDeleteApplicationService } from "../../src/modules/areas/application/area-delete.application.service";
import type { AreaDeleteApplicationDependencies } from "../../src/modules/areas/application/area-delete.application.service";

describe("AreaDeleteApplicationService", () => {
  it("bootstraps, executes the destructive transaction, and invalidates all snapshot readers", async () => {
    const harness = createHarness();
    const result = await harness.service.delete(commandInput());

    expect(result.idempotency).toBe("created");
    expect(harness.dependencies.authorization.authorize).toHaveBeenCalledWith({
      actorId: "admin-01", moduleId: MODULE_ID, permission: "area.materialize.delete",
    });
    expect(harness.dependencies.compiler.compile).toHaveBeenCalledWith(
      expect.objectContaining({ areaResRef: "crypt01" }),
      expect.objectContaining({ revision: REVISION_1 }),
      "admin-01",
      "delete-tx-01",
    );
    expect(harness.dependencies.caches.invalidateAreas).toHaveBeenCalledTimes(1);
    expect(harness.dependencies.caches.invalidateEditing).toHaveBeenCalledTimes(1);
    expect(harness.dependencies.caches.invalidateCatalog).toHaveBeenCalledTimes(1);
  });

  it("rejects strict body/path drift before bootstrap or authorization", async () => {
    for (const input of [
      { ...commandInput(), moduleId: "workspace:other" },
      { ...commandInput(), areaResRef: "other" },
      { ...commandInput(), body: { ...command(), extra: true } },
    ]) {
      const harness = createHarness();
      await expect(harness.service.delete(input)).rejects.toMatchObject({
        status: 422, code: "AREA_DELETE_INVALID",
      });
      expect(harness.dependencies.bootstrap.ensureCurrentWorkspaceBootstrapped)
        .not.toHaveBeenCalled();
      expect(harness.dependencies.authorization.authorize).not.toHaveBeenCalled();
    }
  });

  it("maps transaction failures to bounded AppException and preserves caches", async () => {
    const harness = createHarness();
    (harness.dependencies.authorization.authorize as jest.Mock).mockResolvedValue(false);
    let caught: unknown;
    try {
      await harness.service.delete({ ...commandInput(), actorId: "builder-01" });
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(AppException);
    expect(caught).toMatchObject({ status: 403, code: "AREA_DELETE_PERMISSION_DENIED" });
    expect(harness.dependencies.caches.invalidateAreas).not.toHaveBeenCalled();
  });
});

const MODULE_ID = "workspace:module-01";
const REVISION_1 = "1".repeat(64);
const REVISION_2 = "2".repeat(64);

function createHarness() {
  const candidate = {
    areaId: "crypt01",
    preview: {
      schemaVersion: "area-delete-preview.v1" as const,
      scanVersion: "area-delete-impact-scan.v1" as const,
      moduleId: MODULE_ID, areaResRef: "crypt01", moduleRevision: REVISION_1,
      targetResources: [], moduleIfo: {
        logicalKey: "module.ifo", resourceType: 2014, size: 10, sha256: "9".repeat(64),
      },
      membershipCount: 1, entryAreaResRef: "keep", findings: [], blockerCount: 0,
      warningCount: 0, previewSha256: "6".repeat(64), expiresAt: "2026-08-12T23:05:00.000Z",
    },
    removedResources: [],
    moduleIfo: {
      key: "module.ifo", fileName: "module.ifo", resourceType: 2014,
      baselineBytes: Buffer.from("before"), baselineSha256: "9".repeat(64),
      candidateBytes: Buffer.from("after"), candidateSha256: "8".repeat(64),
    },
    survivorCount: 4,
  };
  const dependencies: AreaDeleteApplicationDependencies = {
    bootstrap: { ensureCurrentWorkspaceBootstrapped: jest.fn(async () => ({
      head: { moduleId: MODULE_ID, revision: REVISION_1 },
    } as never)) },
    authorization: { authorize: jest.fn(async () => true) },
    lock: {
      acquire: jest.fn(async () => ({
        moduleId: MODULE_ID, leaseId: "lease-01", ownerTransactionId: "delete-tx-01",
        fencingToken: 1, expiresAt: "2026-08-12T23:00:30.000Z",
      })),
      release: jest.fn(async () => true),
    },
    idempotency: { read: jest.fn(async () => null) },
    storage: {
      readModuleState: jest.fn(async () => ({
        moduleId: MODULE_ID, revision: REVISION_1, quarantined: false,
      })),
      stage: jest.fn(async () => undefined),
      commitResources: jest.fn(async () => undefined),
      commitModuleIfo: jest.fn(async () => undefined),
      readBack: jest.fn(async () => ({
        verified: true, newModuleRevision: REVISION_2, removedResources: [],
        moduleIfo: { key: "module.ifo", size: 5, sha256: "8".repeat(64) },
        survivorCount: 4, diagnostics: [],
      })),
      compensate: jest.fn(async () => ({ restored: true, diagnostics: [] })),
      quarantine: jest.fn(async () => undefined),
    },
    compiler: { compile: jest.fn(async () => candidate) },
    journal: {
      begin: jest.fn(async () => undefined), transition: jest.fn(async () => undefined),
      recordReadback: jest.fn(async () => undefined), finalize: jest.fn(async () => undefined),
      readJournal: jest.fn(async () => null), listRecoverable: jest.fn(async () => []),
    },
    ids: { nextTransactionId: () => "delete-tx-01" },
    clock: { nowIso: () => "2026-08-12T23:00:00.000Z" },
    caches: {
      invalidateAreas: jest.fn(), invalidateEditing: jest.fn(), invalidateCatalog: jest.fn(),
    },
  };
  return { dependencies, service: new AreaDeleteApplicationService(dependencies) };
}

function commandInput() {
  return {
    moduleId: MODULE_ID, areaResRef: "CRYPT01", actorId: "admin-01",
    idempotencyKey: "delete-key-01", ifMatchHeader: `"${REVISION_1}"`, body: command(),
  };
}

function command() {
  return {
    schemaVersion: "area-delete-command.v1", moduleId: MODULE_ID,
    areaResRef: "CRYPT01", expectedModuleRevision: REVISION_1,
    preview: { sha256: "6".repeat(64) },
    confirmation: { areaResRef: "CRYPT01", policy: "block_on_references" },
    clientCommandId: "delete-command-01",
  };
}
