import { AreaDeleteRecoveryCoordinator } from "../../src/modules/areas/application/area-delete-recovery.coordinator";
import type { AreaDeletePersistedJournalRecord } from "../../src/modules/areas/domain/area-delete-transaction.types";
import type {
  AreaDeleteModuleLockPort,
  AreaDeleteRecoveryStoragePort,
  AreaDeleteTransactionJournalPort,
} from "../../src/modules/areas/application/ports/area-delete-transaction.port";
import type { AreaCreateModuleLease } from "../../src/modules/areas/application/ports/area-create-transaction.port";

describe("Area Delete recovery coordinator", () => {
  it("finalizes a verified retained receipt after independent successor verification", async () => {
    const harness = createHarness({ state: "readback_verified", receipt: receipt() });
    await expect(harness.coordinator.recover(10)).resolves.toEqual([{
      transactionId: "delete-1", outcome: "completed", diagnostics: [],
    }]);
    expect(harness.journal.finalize).toHaveBeenCalledWith(
      "delete-1", expect.any(Object), expect.objectContaining({ result: receipt() }),
    );
    expect(harness.storage.compensate).not.toHaveBeenCalled();
  });

  it.each(["prepared", "staged", "resources_committed", "ifo_committed"] as const)(
    "compensates an interrupted %s journal and releases the recovery lease",
    async (state) => {
      const harness = createHarness({ state });
      await expect(harness.coordinator.recover(10)).resolves.toEqual([{
        transactionId: "delete-1", outcome: "compensated", diagnostics: [],
      }]);
      expect(harness.journal.transition).toHaveBeenCalledWith(
        "delete-1", "compensation_pending", expect.any(Object),
      );
      expect(harness.journal.transition).toHaveBeenCalledWith(
        "delete-1", "compensated", expect.any(Object),
      );
      expect(harness.lock.release).toHaveBeenCalledTimes(1);
    },
  );

  it("quarantines when successor verification and baseline restoration both fail", async () => {
    const harness = createHarness({ state: "readback_verified", receipt: receipt() });
    harness.storage.verifyRecordedReadback.mockResolvedValue({
      verified: false, diagnostics: ["SUCCESSOR_INVALID"],
    });
    harness.storage.compensate.mockResolvedValue({
      restored: false, diagnostics: ["BASELINE_UNPROVEN"],
    });
    await expect(harness.coordinator.recover(10)).resolves.toEqual([{
      transactionId: "delete-1", outcome: "quarantined",
      diagnostics: ["SUCCESSOR_INVALID", "BASELINE_UNPROVEN"],
    }]);
    expect(harness.storage.quarantine).toHaveBeenCalledTimes(1);
    expect(harness.journal.transition).toHaveBeenCalledWith(
      "delete-1", "quarantine_required", expect.any(Object),
    );
  });

  it("reports unavailable recovery lease without touching retained state", async () => {
    const harness = createHarness({ state: "prepared" });
    harness.lock.acquire.mockResolvedValue(null);
    await expect(harness.coordinator.recover(10)).resolves.toEqual([{
      transactionId: "delete-1", outcome: "lease_unavailable", diagnostics: [],
    }]);
    expect(harness.journal.readJournal).not.toHaveBeenCalled();
  });

  it("compensates a readback_verified journal whose durable receipt disappeared", async () => {
    const harness = createHarness({ state: "readback_verified", receipt: undefined });
    await expect(harness.coordinator.recover(10)).resolves.toEqual([{
      transactionId: "delete-1", outcome: "compensated",
      diagnostics: ["recovery readback receipt is missing"],
    }]);
    expect(harness.storage.verifyRecordedReadback).not.toHaveBeenCalled();
  });

  it("records readback exceptions and then compensates", async () => {
    const harness = createHarness({ state: "readback_verified", receipt: receipt() });
    harness.storage.verifyRecordedReadback.mockRejectedValue(new Error("CAS read failed"));
    await expect(harness.coordinator.recover(10)).resolves.toEqual([{
      transactionId: "delete-1", outcome: "compensated",
      diagnostics: ["recovery readback: CAS read failed"],
    }]);
  });

  it("does not repeat compensation_pending and quarantines on thrown compensation", async () => {
    const harness = createHarness({ state: "compensation_pending" });
    harness.storage.compensate.mockRejectedValue(new Error("restore failed"));
    await expect(harness.coordinator.recover(10)).resolves.toEqual([{
      transactionId: "delete-1", outcome: "quarantined",
      diagnostics: ["recovery compensation: restore failed"],
    }]);
    expect(harness.journal.transition).not.toHaveBeenCalledWith(
      "delete-1", "compensation_pending", expect.any(Object),
    );
  });

  it("preserves quarantine and journal failures as diagnostics", async () => {
    const harness = createHarness({ state: "staged" });
    harness.storage.compensate.mockResolvedValue({ restored: false, diagnostics: [] });
    harness.storage.quarantine.mockRejectedValue(new Error("quarantine failed"));
    harness.journal.transition.mockImplementation(async (_id: string, state: string) => {
      if (state === "quarantine_required") throw new Error("journal failed");
    });
    await expect(harness.coordinator.recover(10)).resolves.toEqual([{
      transactionId: "delete-1", outcome: "quarantined",
      diagnostics: [
        "recovery could not prove baseline restoration",
        "recovery quarantine: quarantine failed",
        "recovery journal quarantine: journal failed",
      ],
    }]);
  });

  it("reports a disappeared journal and still releases the recovery lease", async () => {
    const harness = createHarness({ state: "staged" });
    harness.journal.readJournal.mockResolvedValue(null);
    await expect(harness.coordinator.recover(10)).resolves.toEqual([{
      transactionId: "delete-1", outcome: "quarantined",
      diagnostics: ["recovery journal disappeared after lease acquisition"],
    }]);
    expect(harness.lock.release).toHaveBeenCalledTimes(1);
    expect(harness.storage.compensate).not.toHaveBeenCalled();
  });
});

function createHarness(
  overrides: Partial<AreaDeletePersistedJournalRecord>,
) {
  const retained = journal(overrides);
  const lease = {
    moduleId: "module:a", leaseId: "recovery-lease", ownerTransactionId: "delete-1",
    fencingToken: 4, expiresAt: "2026-08-12T22:30:30.000Z",
  };
  const lock: jest.Mocked<AreaDeleteModuleLockPort> = {
    acquire: jest.fn(async (
      _moduleId: string,
      _transactionId: string,
      _options?: Readonly<{ recoveryOfTransactionId?: string }>,
    ): Promise<AreaCreateModuleLease | null> => lease),
    release: jest.fn(async (_lease: AreaCreateModuleLease) => true),
  };
  const journalPort: jest.Mocked<AreaDeleteTransactionJournalPort> = {
    begin: jest.fn(async (_record) => undefined),
    transition: jest.fn(async (_id, _state, _lease) => undefined),
    recordReadback: jest.fn(async (_id, _lease, _receipt) => undefined),
    finalize: jest.fn(async (_id, _lease, _entry) => undefined),
    readJournal: jest.fn(async (_id) => retained),
    listRecoverable: jest.fn(async (_limit) => [retained]),
  };
  const storage: jest.Mocked<AreaDeleteRecoveryStoragePort> = {
    verifyRecordedReadback: jest.fn(async (
      _journal: AreaDeletePersistedJournalRecord,
      _lease: AreaCreateModuleLease,
    ) => ({
      verified: true, diagnostics: [] as readonly string[],
    })),
    compensate: jest.fn(async (
      _journal: AreaDeletePersistedJournalRecord,
      _lease: AreaCreateModuleLease,
    ) => ({
      restored: true, diagnostics: [] as readonly string[],
    })),
    quarantine: jest.fn(async (
      _journal: AreaDeletePersistedJournalRecord,
      _lease: AreaCreateModuleLease,
      _diagnostics: readonly string[],
    ) => undefined),
  };
  return {
    lock, journal: journalPort, storage,
    coordinator: new AreaDeleteRecoveryCoordinator({
      lock, journal: journalPort, storage,
      ids: { nextRecoveryId: () => "recovery-delete-1" },
    }),
  };
}

function journal(
  overrides: Partial<AreaDeletePersistedJournalRecord>,
): AreaDeletePersistedJournalRecord {
  return {
    transactionId: "delete-1", moduleId: "module:a", areaResRef: "crypt01",
    actorId: "actor-1", idempotencyKey: "delete-key", commandHash: "7".repeat(64),
    expectedModuleRevision: "1".repeat(64), previewSha256: "6".repeat(64),
    leaseId: "old-lease", fencingToken: 3, state: "prepared",
    candidateManifest: {
      areaId: "crypt01", previewSha256: "6".repeat(64), removedResources: [],
      moduleIfo: {
        key: "module.ifo", fileName: "module.ifo", resourceType: 2014,
        baselineSize: 10, baselineSha256: "9".repeat(64),
        candidateSize: 9, candidateSha256: "8".repeat(64),
      }, survivorCount: 4,
    },
    diagnostics: [], createdAt: "2026-08-12T22:30:00.000Z",
    updatedAt: "2026-08-12T22:30:00.000Z",
    ...overrides,
  };
}

function receipt() {
  return {
    schemaVersion: "area-delete-receipt.v1" as const,
    transactionId: "delete-1", areaResRef: "crypt01", moduleId: "module:a",
    previousModuleRevision: "1".repeat(64), newModuleRevision: "2".repeat(64),
    commandHash: "7".repeat(64), previewSha256: "6".repeat(64),
    scanVersion: "area-delete-impact-scan.v1", removedResources: [],
    moduleIfo: {
      key: "module.ifo", baselineSha256: "9".repeat(64),
      candidateSha256: "8".repeat(64), size: 9,
    },
    survivorCount: 4, blockerCount: 0 as const, readbackStatus: "verified" as const,
    warnings: [], deletedAt: "2026-08-12T22:30:00.000Z",
  };
}
