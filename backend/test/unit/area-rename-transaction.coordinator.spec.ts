import { createHash } from "node:crypto";
import {
  AreaRenameTransactionCoordinator,
} from "../../src/modules/areas/application/area-rename-transaction.coordinator";
import { canonicalizeAreaRenameCommand } from "../../src/modules/areas/domain/area-rename-command.validation";
import type { AreaRenameTransactionDependencies } from "../../src/modules/areas/application/ports/area-rename-transaction.port";

const MODULE_ID = "module:rename-coordinator";
const REVISION = "a".repeat(64);
const NEW_REVISION = "b".repeat(64);
const PREVIEW = "c".repeat(64);

describe("AreaRenameTransactionCoordinator", () => {
  it("journals, publishes, independently reads back, and finalizes one rename", async () => {
    const harness = createHarness();

    const result = await harness.coordinator.execute(harness.input);

    expect(result).toMatchObject({
      idempotency: "created",
      receipt: {
        schemaVersion: "area-rename-receipt.v1",
        transactionId: "rename-tx-01",
        areaResRef: "old_area",
        targetAreaResRef: "new_area",
        previousModuleRevision: REVISION,
        newModuleRevision: NEW_REVISION,
        previewSha256: PREVIEW,
        readbackStatus: "verified",
      },
    });
    expect(harness.dependencies.journal.transition).toHaveBeenCalledWith(
      "rename-tx-01", "ifo_committed", harness.lease,
    );
    expect(harness.dependencies.journal.finalize).toHaveBeenCalledTimes(1);
    expect(harness.dependencies.lock.release).toHaveBeenCalledWith(harness.lease);
  });

  it("returns a retained idempotent replay before authorization and lock acquisition", async () => {
    const harness = createHarness();
    const created = await harness.coordinator.execute(harness.input);
    (harness.dependencies.idempotency.read as jest.Mock).mockResolvedValue({
      moduleId: MODULE_ID,
      key: "rename-key",
      commandHash: harness.input.commandHash,
      createdAt: "2026-08-24T15:00:00.000Z",
      result: created.receipt,
    });

    const replay = await harness.coordinator.execute(harness.input);

    expect(replay).toEqual({ idempotency: "replayed", receipt: created.receipt });
    expect(harness.dependencies.authorization.authorize).toHaveBeenCalledTimes(1);
    expect(harness.dependencies.lock.acquire).toHaveBeenCalledTimes(1);
  });

  it("rejects stale strong revision before compilation", async () => {
    const harness = createHarness();
    (harness.dependencies.storage.readModuleState as jest.Mock).mockResolvedValue({
      moduleId: MODULE_ID,
      revision: "d".repeat(64),
      quarantined: false,
    });

    await expect(harness.coordinator.execute(harness.input)).rejects.toMatchObject({
      code: "AREA_RENAME_MODULE_REVISION_CONFLICT",
      status: 412,
      mutationStarted: false,
    });
    expect(harness.dependencies.compiler.compile).not.toHaveBeenCalled();
  });

  it("compensates after publication failure and reports verified rollback", async () => {
    const harness = createHarness();
    (harness.dependencies.storage.readBack as jest.Mock).mockRejectedValue(new Error("readback failed"));

    await expect(harness.coordinator.execute(harness.input)).rejects.toMatchObject({
      code: "AREA_RENAME_TRANSACTION_FAILED",
      status: 500,
      mutationStarted: true,
    });
    expect(harness.dependencies.storage.compensate).toHaveBeenCalledTimes(1);
    expect(harness.dependencies.journal.transition).toHaveBeenCalledWith(
      "rename-tx-01", "compensated", harness.lease,
    );
  });
});

function createHarness(): {
  dependencies: any;
  lease: any;
  input: any;
  coordinator: AreaRenameTransactionCoordinator;
} {
  const command = {
    schemaVersion: "area-rename-command.v1" as const,
    moduleId: MODULE_ID,
    areaResRef: "old_area",
    targetAreaResRef: "new_area",
    expectedModuleRevision: REVISION,
    preview: { sha256: PREVIEW },
    confirmation: {
      sourceAreaResRef: "old_area",
      targetAreaResRef: "new_area",
      policy: "block_on_references" as const,
    },
    clientCommandId: "client-01",
  };
  const commandHash = createHash("sha256")
    .update(canonicalizeAreaRenameCommand(command), "utf8")
    .digest("hex");
  const lease = {
    moduleId: MODULE_ID,
    leaseId: "lease-01",
    ownerTransactionId: "rename-tx-01",
    fencingToken: 31,
    expiresAt: "2026-08-24T15:00:30.000Z",
  };
  const candidate = {
    areaId: "old_area",
    targetAreaId: "new_area",
    preview: { previewSha256: PREVIEW, scanVersion: "area-rename-impact-scan.v1", warningCount: 0 },
    resources: [],
    moduleIfo: {},
    entryAreaUpdated: true,
    survivorCount: 4,
    baselineManifest: {},
    successorManifest: {},
  } as never;
  const readback = {
    verified: true,
    newModuleRevision: NEW_REVISION,
    resources: [],
    moduleIfo: {
      key: "module.ifo" as const,
      baselineSize: 10,
      baselineSha256: "1".repeat(64),
      candidateSize: 11,
      candidateSha256: "2".repeat(64),
    },
    survivorCount: 4,
    entryAreaUpdated: true,
    diagnostics: [],
  };
  const dependencies = {
    authorization: { authorize: jest.fn(async () => true) },
    lock: {
      acquire: jest.fn(async () => lease),
      release: jest.fn(async () => undefined),
      acquireForRecovery: jest.fn(),
    },
    idempotency: { read: jest.fn(async () => null) },
    storage: {
      readModuleState: jest.fn(async () => ({ moduleId: MODULE_ID, revision: REVISION, quarantined: false })),
      stage: jest.fn(async () => undefined),
      commitResources: jest.fn(async () => undefined),
      commitModuleIfo: jest.fn(async () => undefined),
      readBack: jest.fn(async () => readback),
      compensate: jest.fn(async () => ({ restored: true, diagnostics: [] })),
      quarantine: jest.fn(async () => undefined),
    },
    compiler: { compile: jest.fn(async () => candidate) },
    journal: {
      begin: jest.fn(async () => undefined),
      transition: jest.fn(async () => undefined),
      recordReadback: jest.fn(async () => undefined),
      finalize: jest.fn(async () => undefined),
      readJournal: jest.fn(async () => null),
      listRecoverable: jest.fn(async () => []),
    },
    ids: { nextTransactionId: () => "rename-tx-01" },
    clock: { nowIso: () => "2026-08-24T15:00:00.000Z" },
  };
  const input = {
    actorId: "admin-01",
    idempotencyKey: "rename-key",
    ifMatchHeader: `"${REVISION}"`,
    command,
    commandHash,
  };
  return {
    dependencies,
    lease,
    input,
    coordinator: new AreaRenameTransactionCoordinator(
      dependencies as unknown as AreaRenameTransactionDependencies,
    ),
  };
}
