import { AreaRenameRecoveryCoordinator } from "../../src/modules/areas/application/area-rename-recovery.coordinator";
import type { AreaRenamePersistedJournalRecord } from "../../src/modules/areas/domain/area-rename-transaction.types";
import type {
  AreaRenameModuleLockPort,
  AreaRenameRecoveryStoragePort,
  AreaRenameTransactionJournalPort,
} from "../../src/modules/areas/application/ports/area-rename-transaction.port";
import type { AreaCreateModuleLease } from "../../src/modules/areas/application/ports/area-create-transaction.port";

describe("Area rename recovery coordinator", () => {
  it("finalizes an independently reverified retained receipt", async () => {
    const harness = createHarness({ state: "readback_verified", receipt: receipt() });
    await expect(harness.coordinator.recover(10)).resolves.toEqual([{
      transactionId: "rename-1", outcome: "completed", diagnostics: [],
    }]);
    expect(harness.journal.finalize).toHaveBeenCalledWith(
      "rename-1", expect.any(Object), expect.objectContaining({ result: receipt() }),
    );
    expect(harness.storage.compensate).not.toHaveBeenCalled();
  });

  it.each(["prepared", "staged", "resources_committed", "ifo_committed"] as const)(
    "compensates an interrupted %s journal under the transferred recovery lease",
    async (state) => {
      const harness = createHarness({ state });
      await expect(harness.coordinator.recover(10)).resolves.toEqual([{
        transactionId: "rename-1", outcome: "compensated", diagnostics: [],
      }]);
      expect(harness.lock.acquire).toHaveBeenCalledWith(
        "module:a", "recovery-rename-1", { recoveryOfTransactionId: "rename-1" },
      );
      expect(harness.journal.transition).toHaveBeenCalledWith(
        "rename-1", "compensation_pending", expect.any(Object),
      );
      expect(harness.journal.transition).toHaveBeenCalledWith(
        "rename-1", "compensated", expect.any(Object),
      );
      expect(harness.lock.release).toHaveBeenCalledTimes(1);
    },
  );

  it("quarantines when both successor verification and exact baseline restoration fail", async () => {
    const harness = createHarness({ state: "readback_verified", receipt: receipt() });
    harness.storage.verifyRecordedReadback.mockResolvedValue({
      verified: false, diagnostics: ["SUCCESSOR_INVALID"],
    });
    harness.storage.compensate.mockResolvedValue({
      restored: false, diagnostics: ["BASELINE_UNPROVEN"],
    });
    await expect(harness.coordinator.recover(10)).resolves.toEqual([{
      transactionId: "rename-1", outcome: "quarantined",
      diagnostics: ["SUCCESSOR_INVALID", "BASELINE_UNPROVEN"],
    }]);
    expect(harness.storage.quarantine).toHaveBeenCalledTimes(1);
    expect(harness.journal.transition).toHaveBeenCalledWith(
      "rename-1", "quarantine_required", expect.any(Object),
    );
  });

  it("fails closed when a readback_verified journal lost its receipt", async () => {
    const harness = createHarness({ state: "readback_verified", receipt: undefined });
    await expect(harness.coordinator.recover(10)).resolves.toEqual([{
      transactionId: "rename-1", outcome: "compensated",
      diagnostics: ["recovery readback receipt is missing"],
    }]);
    expect(harness.storage.verifyRecordedReadback).not.toHaveBeenCalled();
  });

  it("reports an unavailable recovery lease without touching journal or storage", async () => {
    const harness = createHarness({ state: "prepared" });
    harness.lock.acquire.mockResolvedValue(null);
    await expect(harness.coordinator.recover(10)).resolves.toEqual([{
      transactionId: "rename-1", outcome: "lease_unavailable", diagnostics: [],
    }]);
    expect(harness.journal.readJournal).not.toHaveBeenCalled();
    expect(harness.storage.compensate).not.toHaveBeenCalled();
  });
});

function createHarness(overrides: Partial<AreaRenamePersistedJournalRecord>) {
  const retained = journal(overrides);
  const lease: AreaCreateModuleLease = {
    moduleId: "module:a", leaseId: "recovery-lease", ownerTransactionId: "rename-1",
    fencingToken: 4, expiresAt: "2026-08-24T22:30:30.000Z",
  };
  const lock: jest.Mocked<AreaRenameModuleLockPort> = {
    acquire: jest.fn(async () => lease),
    release: jest.fn(async () => true),
  };
  const journalPort: jest.Mocked<AreaRenameTransactionJournalPort> = {
    begin: jest.fn(async () => undefined),
    transition: jest.fn(async () => undefined),
    recordReadback: jest.fn(async () => undefined),
    finalize: jest.fn(async () => undefined),
    readJournal: jest.fn(async () => retained),
    listRecoverable: jest.fn(async () => [retained]),
  };
  const storage: jest.Mocked<AreaRenameRecoveryStoragePort> = {
    verifyRecordedReadback: jest.fn(async () => ({ verified: true, diagnostics: [] })),
    compensate: jest.fn(async () => ({ restored: true, diagnostics: [] })),
    quarantine: jest.fn(async () => undefined),
  };
  return {
    lock,
    journal: journalPort,
    storage,
    coordinator: new AreaRenameRecoveryCoordinator({
      lock,
      journal: journalPort,
      storage,
      ids: { nextRecoveryId: () => "recovery-rename-1" },
    }),
  };
}

function journal(
  overrides: Partial<AreaRenamePersistedJournalRecord>,
): AreaRenamePersistedJournalRecord {
  return {
    transactionId: "rename-1",
    moduleId: "module:a",
    areaResRef: "crypt01",
    targetAreaResRef: "crypt02",
    actorId: "actor-1",
    idempotencyKey: "rename-key",
    commandHash: "7".repeat(64),
    expectedModuleRevision: "1".repeat(64),
    previewSha256: "6".repeat(64),
    leaseId: "old-lease",
    fencingToken: 3,
    state: "prepared",
    candidateManifest: {
      areaId: "crypt01",
      targetAreaId: "crypt02",
      previewSha256: "6".repeat(64),
      resources: [],
      moduleIfo: {
        key: "module.ifo",
        resourceType: 2014,
        baselineSize: 10,
        baselineSha256: "9".repeat(64),
        candidateSize: 11,
        candidateSha256: "8".repeat(64),
      },
      entryAreaUpdated: true,
      entryAreaResRef: "crypt01",
      survivorCount: 4,
      baselineRevision: "1".repeat(64),
      successorRevision: "2".repeat(64),
    },
    diagnostics: [],
    createdAt: "2026-08-24T22:30:00.000Z",
    updatedAt: "2026-08-24T22:30:00.000Z",
    ...overrides,
  };
}

function receipt() {
  return {
    schemaVersion: "area-rename-receipt.v1" as const,
    transactionId: "rename-1",
    moduleId: "module:a",
    areaResRef: "crypt01",
    targetAreaResRef: "crypt02",
    previousModuleRevision: "1".repeat(64),
    newModuleRevision: "2".repeat(64),
    commandHash: "7".repeat(64),
    previewSha256: "6".repeat(64),
    scanVersion: "area-rename-impact-scan.v1",
    resources: [],
    moduleIfo: {
      key: "module.ifo" as const,
      baselineSize: 10,
      baselineSha256: "9".repeat(64),
      candidateSize: 11,
      candidateSha256: "8".repeat(64),
    },
    entryAreaUpdated: true,
    blockerCount: 0 as const,
    warningCount: 0,
    readbackStatus: "verified" as const,
    warnings: [],
    renamedAt: "2026-08-24T22:30:00.000Z",
  };
}
