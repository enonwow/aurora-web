import { AreaDeleteTransactionCoordinator } from "../../src/modules/areas/application/area-delete-transaction.coordinator";
import { AreaDeleteCompilerFailure } from "../../src/modules/areas/application/area-delete-candidate.compiler";
import type { AreaDeleteTransactionDependencies } from "../../src/modules/areas/application/ports/area-delete-transaction.port";
import { createAreaCreateIdempotencyEntry } from "../../src/modules/areas/domain/area-create-idempotency";
import { validateAndNormalizeAreaDeleteCommand } from "../../src/modules/areas/domain/area-delete-command.validation";
import {
  AREA_TRANSACTION_POST_BEGIN_FAULT_POINTS,
  injectAreaTransactionBeginFault,
  injectAreaTransactionPostBeginFault,
} from "./helpers/area-transaction-fault-matrix";

describe("Area Delete transaction coordinator", () => {
  it("publishes in journal order and finalizes only after exact readback", async () => {
    const harness = createHarness();
    const result = await execute(harness);

    expect(result).toEqual({ idempotency: "created", receipt: expect.objectContaining({
      schemaVersion: "area-delete-receipt.v1",
      transactionId: "delete-tx-01",
      areaResRef: "crypt01",
      previousModuleRevision: REVISION_1,
      newModuleRevision: REVISION_2,
      previewSha256: "6".repeat(64),
      survivorCount: 4,
      blockerCount: 0,
      readbackStatus: "verified",
    }) });
    expect(harness.events).toEqual([
      "idempotency.read", "authorize", "lock.acquire", "idempotency.read",
      "storage.read-state", "compiler.compile", "journal.begin", "storage.stage",
      "journal.staged", "storage.commit-resources", "journal.resources_committed",
      "storage.commit-ifo", "journal.ifo_committed", "storage.readback",
      "journal.record-readback", "journal.finalize", "lock.release",
    ]);
  });

  it("replays before authorization and rejects stale revision before compilation", async () => {
    const replay = createHarness();
    (replay.dependencies.idempotency.read as jest.Mock).mockResolvedValue(
      createAreaCreateIdempotencyEntry({
        moduleId: MODULE_ID, key: "delete-01", commandHash: replay.validation.commandHash,
        createdAt: NOW, result: replay.receipt,
      }),
    );
    await expect(execute(replay)).resolves.toEqual({
      idempotency: "replayed", receipt: replay.receipt,
    });
    expect(replay.dependencies.authorization.authorize).not.toHaveBeenCalled();

    const stale = createHarness();
    (stale.dependencies.storage.readModuleState as jest.Mock).mockResolvedValue({
      moduleId: MODULE_ID, revision: REVISION_2, quarantined: false,
    });
    await expect(execute(stale)).rejects.toMatchObject({
      code: "AREA_DELETE_MODULE_REVISION_CONFLICT", status: 412, mutationStarted: false,
    });
    expect(stale.dependencies.compiler.compile).not.toHaveBeenCalled();
  });

  it("preserves typed preview/compiler failures before mutation", async () => {
    const harness = createHarness();
    (harness.dependencies.compiler.compile as jest.Mock).mockRejectedValue(
      new AreaDeleteCompilerFailure(
        "AREA_DELETE_REFERENCES_BLOCKED", 409, "references block deletion", ["other.git"],
      ),
    );
    await expect(execute(harness)).rejects.toMatchObject({
      code: "AREA_DELETE_REFERENCES_BLOCKED", status: 409,
      mutationStarted: false, details: ["other.git"],
    });
    expect(harness.dependencies.storage.compensate).not.toHaveBeenCalled();
  });

  it("compensates failed readback and quarantines when restoration is unproven", async () => {
    const restored = createHarness();
    (restored.dependencies.storage.readBack as jest.Mock).mockImplementation(async () => {
      restored.events.push("storage.readback");
      return {
        verified: false, newModuleRevision: REVISION_2, removedResources: [],
        moduleIfo: { key: "module.ifo", size: 0, sha256: "0".repeat(64) },
        survivorCount: 4, diagnostics: ["MEMBERSHIP_RETAINED"],
      };
    });
    await expect(execute(restored)).rejects.toMatchObject({
      code: "AREA_DELETE_READBACK_FAILED", mutationStarted: true,
      details: expect.arrayContaining(["MEMBERSHIP_RETAINED"]),
    });
    expect(restored.dependencies.storage.compensate).toHaveBeenCalledTimes(1);

    const unproven = createHarness();
    (unproven.dependencies.storage.commitModuleIfo as jest.Mock).mockRejectedValue(
      new Error("CAS unavailable"),
    );
    (unproven.dependencies.storage.compensate as jest.Mock).mockResolvedValue({
      restored: false, diagnostics: ["BASELINE_UNPROVEN"],
    });
    await expect(execute(unproven)).rejects.toMatchObject({
      code: "AREA_DELETE_ROLLBACK_FAILED", mutationStarted: true,
      details: expect.arrayContaining(["BASELINE_UNPROVEN"]),
    });
    expect(unproven.dependencies.storage.quarantine).toHaveBeenCalledTimes(1);
  });

  it.each([["", 401], ["actor-01", 403]] as const)(
    "denies unauthorized actor %p before acquiring the lock",
    async (actorId, status) => {
      const harness = createHarness();
      (harness.dependencies.authorization.authorize as jest.Mock).mockResolvedValue(false);
      await expect(execute(harness, { actorId })).rejects.toMatchObject({
        code: "AREA_DELETE_PERMISSION_DENIED", status, mutationStarted: false,
      });
      expect(harness.dependencies.lock.acquire).not.toHaveBeenCalled();
    },
  );

  it("rejects malformed idempotency, forged hashes, and absent strong If-Match", async () => {
    for (const overrides of [
      { idempotencyKey: "bad key" },
      { commandHash: "0".repeat(64) },
      { ifMatchHeader: undefined },
    ]) {
      const harness = createHarness();
      await expect(execute(harness, overrides)).rejects.toMatchObject({
        code: "AREA_DELETE_INVALID", status: 422, mutationStarted: false,
      });
    }
  });

  it("rejects retained idempotency conflicts and corrupted repository scope", async () => {
    const conflict = createHarness();
    (conflict.dependencies.idempotency.read as jest.Mock).mockResolvedValue({
      moduleId: MODULE_ID, key: "delete-01", commandHash: "0".repeat(64),
      createdAt: NOW, result: conflict.receipt,
    });
    await expect(execute(conflict)).rejects.toMatchObject({
      code: "AREA_DELETE_IDEMPOTENCY_CONFLICT", status: 409,
      details: [
        `existing=${"0".repeat(64)}`,
        `attempted=${conflict.validation.commandHash}`,
      ],
    });

    const corrupt = createHarness();
    (corrupt.dependencies.idempotency.read as jest.Mock).mockResolvedValue({
      moduleId: "workspace:other", key: "delete-01",
      commandHash: corrupt.validation.commandHash, createdAt: NOW, result: corrupt.receipt,
    });
    await expect(execute(corrupt)).rejects.toMatchObject({
      code: "AREA_DELETE_TRANSACTION_FAILED", status: 500, mutationStarted: false,
    });
  });

  it("rechecks idempotency inside the lock and releases without reading storage", async () => {
    const harness = createHarness();
    const retained = createAreaCreateIdempotencyEntry({
      moduleId: MODULE_ID, key: "delete-01", commandHash: harness.validation.commandHash,
      createdAt: NOW, result: harness.receipt,
    });
    (harness.dependencies.idempotency.read as jest.Mock)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(retained);
    await expect(execute(harness)).resolves.toEqual({
      idempotency: "replayed", receipt: harness.receipt,
    });
    expect(harness.dependencies.storage.readModuleState).not.toHaveBeenCalled();
    expect(harness.dependencies.compiler.compile).not.toHaveBeenCalled();
    expect(harness.dependencies.lock.release).toHaveBeenCalledTimes(1);
  });

  it("fails closed for lock contention, quarantine, and cross-module storage state", async () => {
    const locked = createHarness();
    (locked.dependencies.lock.acquire as jest.Mock).mockResolvedValue(null);
    await expect(execute(locked)).rejects.toMatchObject({
      code: "AREA_DELETE_STORAGE_UNAVAILABLE", status: 503, mutationStarted: false,
    });

    for (const [state, expected] of [
      [{ moduleId: MODULE_ID, revision: REVISION_1, quarantined: true }, "AREA_DELETE_STORAGE_UNAVAILABLE"],
      [{ moduleId: "workspace:other", revision: REVISION_1, quarantined: false }, "AREA_DELETE_TRANSACTION_FAILED"],
    ] as const) {
      const harness = createHarness();
      (harness.dependencies.storage.readModuleState as jest.Mock).mockResolvedValue(state);
      await expect(execute(harness)).rejects.toMatchObject({ code: expected });
      expect(harness.dependencies.compiler.compile).not.toHaveBeenCalled();
      expect(harness.dependencies.lock.release).toHaveBeenCalledTimes(1);
    }
  });

  it.each(["not-an-etag", `"${"2".repeat(64)}"`, `W/"${"1".repeat(64)}"`])(
    "rejects invalid or stale strong revision precondition %p",
    async (ifMatchHeader) => {
      const harness = createHarness();
      await expect(execute(harness, { ifMatchHeader })).rejects.toMatchObject({
        code: "AREA_DELETE_INVALID",
        status: 422,
        mutationStarted: false,
      });
      expect(harness.dependencies.compiler.compile).not.toHaveBeenCalled();
    },
  );

  it("does not compensate when durable journal creation fails before staging", async () => {
    const harness = createHarness();
    (harness.dependencies.journal.begin as jest.Mock).mockRejectedValue(
      new Error("journal unavailable"),
    );
    await expect(execute(harness)).rejects.toMatchObject({
      code: "AREA_DELETE_TRANSACTION_FAILED", status: 500,
      message: "journal unavailable", mutationStarted: false,
      details: ["journal unavailable"],
    });
    expect(harness.dependencies.storage.stage).not.toHaveBeenCalled();
    expect(harness.dependencies.storage.compensate).not.toHaveBeenCalled();
  });

  it("compensates typed and untyped stage failures while preserving mutationStarted", async () => {
    const typed = createHarness();
    (typed.dependencies.storage.stage as jest.Mock).mockRejectedValue(
      new AreaDeleteCompilerFailure("AREA_DELETE_STORAGE_UNAVAILABLE", 503, "stage failed"),
    );
    await expect(execute(typed)).rejects.toMatchObject({
      code: "AREA_DELETE_STORAGE_UNAVAILABLE", status: 503, mutationStarted: true,
    });
    expect(typed.dependencies.journal.transition).toHaveBeenCalledWith(
      "delete-tx-01", "compensated", expect.any(Object),
    );

    const untyped = createHarness();
    (untyped.dependencies.storage.stage as jest.Mock).mockRejectedValue("disk offline");
    await expect(execute(untyped)).rejects.toMatchObject({
      code: "AREA_DELETE_TRANSACTION_FAILED", status: 500,
      message: "Area Delete failed and the baseline was independently restored.",
      mutationStarted: true, details: ["disk offline"],
    });
  });

  it("retains terminal-journal diagnostics when compensated recording fails", async () => {
    const harness = createHarness();
    (harness.dependencies.storage.stage as jest.Mock).mockRejectedValue("disk offline");
    (harness.dependencies.journal.transition as jest.Mock).mockImplementation(
      async (_transactionId: string, state: string) => {
        if (state === "compensated") throw new Error("terminal journal unavailable");
      },
    );
    await expect(execute(harness)).rejects.toMatchObject({
      code: "AREA_DELETE_TRANSACTION_FAILED", mutationStarted: true,
      details: ["disk offline", "journal compensated: terminal journal unavailable"],
    });
  });

  it("surfaces all diagnostics when compensation and quarantine bookkeeping fail", async () => {
    const harness = createHarness();
    (harness.dependencies.storage.commitModuleIfo as jest.Mock).mockRejectedValue("publish failed");
    (harness.dependencies.journal.transition as jest.Mock).mockImplementation(
      async (_transactionId: string, state: string) => {
        if (state === "compensation_pending") throw new Error("pending unavailable");
        if (state === "quarantine_required") throw new Error("terminal unavailable");
      },
    );
    (harness.dependencies.storage.compensate as jest.Mock).mockRejectedValue(
      new Error("restore unavailable"),
    );
    (harness.dependencies.storage.quarantine as jest.Mock).mockRejectedValue(
      new Error("quarantine unavailable"),
    );
    await expect(execute(harness)).rejects.toMatchObject({
      code: "AREA_DELETE_ROLLBACK_FAILED", mutationStarted: true,
      details: [
        "journal compensation_pending: pending unavailable",
        "compensation: restore unavailable",
        "quarantine: quarantine unavailable",
        "journal quarantine_required: terminal unavailable",
      ],
    });
    expect(harness.dependencies.lock.release).toHaveBeenCalledTimes(1);
  });

  it("does not compensate when durable journal creation fails before mutation", async () => {
    const harness = createHarness();
    const error = injectAreaTransactionBeginFault(harness.dependencies);

    await expect(execute(harness)).rejects.toMatchObject({
      code: "AREA_DELETE_TRANSACTION_FAILED",
      mutationStarted: false,
      details: [error.message],
    });
    expect(harness.dependencies.storage.stage).not.toHaveBeenCalled();
    expect(harness.dependencies.storage.compensate).not.toHaveBeenCalled();
    expect(harness.dependencies.lock.release).toHaveBeenCalledTimes(1);
  });

  it.each(AREA_TRANSACTION_POST_BEGIN_FAULT_POINTS)(
    "compensates the complete post-begin fault boundary %s",
    async (point) => {
      const harness = createHarness();
      const error = injectAreaTransactionPostBeginFault(harness.dependencies, point);

      await expect(execute(harness)).rejects.toMatchObject({
        code: "AREA_DELETE_TRANSACTION_FAILED",
        mutationStarted: true,
        details: expect.arrayContaining([error.message]),
      });
      expect(harness.dependencies.storage.compensate).toHaveBeenCalledTimes(1);
      expect(harness.dependencies.storage.quarantine).not.toHaveBeenCalled();
      expect(harness.dependencies.lock.release).toHaveBeenCalledTimes(1);
    },
  );
});

const MODULE_ID = "workspace:module-01";
const REVISION_1 = "1".repeat(64);
const REVISION_2 = "2".repeat(64);
const NOW = "2026-08-12T22:00:00.000Z";

function createHarness() {
  const events: string[] = [];
  const validation = validateAndNormalizeAreaDeleteCommand({
    schemaVersion: "area-delete-command.v1", moduleId: MODULE_ID,
    areaResRef: "crypt01", expectedModuleRevision: REVISION_1,
    preview: { sha256: "6".repeat(64) },
    confirmation: { areaResRef: "crypt01", policy: "block_on_references" },
    clientCommandId: "delete-command-01",
  });
  if (!validation.valid) throw new Error("Delete fixture must be valid.");
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
      warningCount: 0, previewSha256: "6".repeat(64), expiresAt: "2026-08-12T22:05:00.000Z",
    },
    removedResources: [],
    moduleIfo: {
      key: "module.ifo", fileName: "module.ifo", resourceType: 2014,
      baselineBytes: Buffer.from("before"), baselineSha256: "9".repeat(64),
      candidateBytes: Buffer.from("after"), candidateSha256: "8".repeat(64),
    },
    survivorCount: 4,
  };
  const receipt = {
    schemaVersion: "area-delete-receipt.v1" as const,
    transactionId: "delete-tx-01", areaResRef: "crypt01", moduleId: MODULE_ID,
    previousModuleRevision: REVISION_1, newModuleRevision: REVISION_2,
    commandHash: validation.commandHash, previewSha256: "6".repeat(64),
    scanVersion: "area-delete-impact-scan.v1", removedResources: [],
    moduleIfo: {
      key: "module.ifo", baselineSha256: "9".repeat(64),
      candidateSha256: "8".repeat(64), size: 5,
    },
    survivorCount: 4, blockerCount: 0 as const, readbackStatus: "verified" as const,
    warnings: [] as const, deletedAt: NOW,
  };
  const dependencies: AreaDeleteTransactionDependencies = {
    authorization: { authorize: jest.fn(async () => { events.push("authorize"); return true; }) },
    lock: {
      acquire: jest.fn(async () => {
        events.push("lock.acquire");
        return {
          moduleId: MODULE_ID, leaseId: "lease-01", ownerTransactionId: "delete-tx-01",
          fencingToken: 1, expiresAt: "2026-08-12T22:00:30.000Z",
        };
      }),
      release: jest.fn(async () => { events.push("lock.release"); return true; }),
    },
    idempotency: { read: jest.fn(async () => { events.push("idempotency.read"); return null; }) },
    storage: {
      readModuleState: jest.fn(async () => {
        events.push("storage.read-state");
        return { moduleId: MODULE_ID, revision: REVISION_1, quarantined: false };
      }),
      stage: jest.fn(async () => { events.push("storage.stage"); }),
      commitResources: jest.fn(async () => { events.push("storage.commit-resources"); }),
      commitModuleIfo: jest.fn(async () => { events.push("storage.commit-ifo"); }),
      readBack: jest.fn(async () => {
        events.push("storage.readback");
        return {
          verified: true, newModuleRevision: REVISION_2, removedResources: [],
          moduleIfo: { key: "module.ifo", size: 5, sha256: "8".repeat(64) },
          survivorCount: 4, diagnostics: [],
        };
      }),
      compensate: jest.fn(async () => { events.push("storage.compensate"); return { restored: true, diagnostics: [] }; }),
      quarantine: jest.fn(async () => { events.push("storage.quarantine"); }),
    },
    compiler: { compile: jest.fn(async () => { events.push("compiler.compile"); return candidate; }) },
    journal: {
      begin: jest.fn(async () => { events.push("journal.begin"); }),
      transition: jest.fn(async (_id, state) => { events.push(`journal.${state}`); }),
      recordReadback: jest.fn(async () => { events.push("journal.record-readback"); }),
      finalize: jest.fn(async () => { events.push("journal.finalize"); }),
      readJournal: jest.fn(async () => null), listRecoverable: jest.fn(async () => []),
    },
    ids: { nextTransactionId: () => "delete-tx-01" },
    clock: { nowIso: () => NOW },
  };
  return {
    events, validation, candidate, receipt, dependencies,
    coordinator: new AreaDeleteTransactionCoordinator(dependencies),
  };
}

function execute(
  harness: ReturnType<typeof createHarness>,
  overrides: Partial<{
    actorId: string; idempotencyKey: string; ifMatchHeader: string | undefined;
    commandHash: string;
  }> = {},
) {
  return harness.coordinator.execute({
    actorId: overrides.actorId ?? "actor-01",
    idempotencyKey: overrides.idempotencyKey ?? "delete-01",
    ifMatchHeader: Object.prototype.hasOwnProperty.call(overrides, "ifMatchHeader")
      ? overrides.ifMatchHeader
      : `"${REVISION_1}"`,
    command: harness.validation.value,
    commandHash: overrides.commandHash ?? harness.validation.commandHash,
  });
}
