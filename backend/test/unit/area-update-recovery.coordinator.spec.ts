import { AreaUpdateRecoveryCoordinator } from "../../src/modules/areas/application/area-update-recovery.coordinator";
import type { AreaUpdateRecoveryDependencies } from "../../src/modules/areas/application/area-update-recovery.coordinator";
import type {
  AreaUpdatePersistedJournalRecord,
  AreaUpdateReceipt,
} from "../../src/modules/areas/domain/area-update-transaction.types";
import { areaTileProductionAdmissionFixture } from "./helpers/area-tile-production-admission-fixture";

describe("Area Update recovery coordinator", () => {
  it("finalizes a retained verified receipt only after fresh snapshot readback", async () => {
    const harness = createHarness(journal("readback_verified", receipt()));

    const results = await harness.coordinator.recover(10);

    expect(results).toEqual([{ transactionId: "update-1", outcome: "completed", diagnostics: [] }]);
    expect(harness.dependencies.storage.verifyRecordedReadback).toHaveBeenCalledTimes(1);
    expect(harness.dependencies.journal.finalize).toHaveBeenCalledWith(
      "update-1",
      expect.any(Object),
      expect.objectContaining({
        moduleId: "module:a",
        key: "update-key-1",
        commandHash: "7".repeat(64),
        result: receipt(),
      }),
    );
  });

  it.each(["prepared", "staged", "resources_committed", "ifo_committed"] as const)(
    "compensates an interrupted %s transaction and marks it terminal",
    async (state) => {
      const harness = createHarness(journal(state));

      const results = await harness.coordinator.recover(10);

      expect(results).toEqual([{
        transactionId: "update-1",
        outcome: "compensated",
        diagnostics: [],
      }]);
      expect(harness.dependencies.journal.transition).toHaveBeenNthCalledWith(
        1,
        "update-1",
        "compensation_pending",
        expect.any(Object),
      );
      expect(harness.dependencies.journal.transition).toHaveBeenNthCalledWith(
        2,
        "update-1",
        "compensated",
        expect.any(Object),
      );
    },
  );

  it("quarantines when published-state restoration cannot be proved", async () => {
    const harness = createHarness(journal("ifo_committed"));
    (harness.dependencies.storage.compensate as jest.Mock).mockResolvedValue({
      restored: false,
      diagnostics: ["BASELINE_UNPROVEN"],
    });

    const results = await harness.coordinator.recover(10);

    expect(results).toEqual([{
      transactionId: "update-1",
      outcome: "quarantined",
      diagnostics: ["BASELINE_UNPROVEN"],
    }]);
    expect(harness.dependencies.storage.quarantine).toHaveBeenCalledTimes(1);
    expect(harness.dependencies.journal.transition).toHaveBeenLastCalledWith(
      "update-1",
      "quarantine_required",
      expect.any(Object),
    );
  });

  it("reports lease contention without reading or mutating the journal", async () => {
    const harness = createHarness(journal("staged"));
    (harness.dependencies.lock.acquire as jest.Mock).mockResolvedValue(null);

    await expect(harness.coordinator.recover(10)).resolves.toEqual([{
      transactionId: "update-1",
      outcome: "lease_unavailable",
      diagnostics: [],
    }]);
    expect(harness.dependencies.journal.readJournal).not.toHaveBeenCalled();
    expect(harness.dependencies.storage.compensate).not.toHaveBeenCalled();
  });

  it("reports a journal that disappears after exact recovery lease acquisition", async () => {
    const harness = createHarness(journal("staged"));
    (harness.dependencies.journal.readJournal as jest.Mock).mockResolvedValue(null);

    await expect(harness.coordinator.recover(10)).resolves.toEqual([{
      transactionId: "update-1",
      outcome: "quarantined",
      diagnostics: ["recovery journal disappeared after lease acquisition"],
    }]);
    expect(harness.dependencies.storage.compensate).not.toHaveBeenCalled();
    expect(harness.dependencies.lock.release).toHaveBeenCalledTimes(1);
  });

  it("compensates when fresh readback does not verify and retains diagnostics", async () => {
    const harness = createHarness(journal("readback_verified", receipt()));
    (harness.dependencies.storage.verifyRecordedReadback as jest.Mock).mockResolvedValue({
      verified: false,
      diagnostics: ["ARE_HASH_MISMATCH"],
    });

    await expect(harness.coordinator.recover(10)).resolves.toEqual([{
      transactionId: "update-1",
      outcome: "compensated",
      diagnostics: ["ARE_HASH_MISMATCH"],
    }]);
    expect(harness.dependencies.journal.finalize).not.toHaveBeenCalled();
    expect(harness.dependencies.storage.compensate).toHaveBeenCalledTimes(1);
  });

  it("retains readback exceptions and missing-receipt diagnostics through compensation", async () => {
    const thrown = createHarness(journal("readback_verified", receipt()));
    (thrown.dependencies.storage.verifyRecordedReadback as jest.Mock).mockRejectedValue("offline");
    await expect(thrown.coordinator.recover(10)).resolves.toEqual([{
      transactionId: "update-1",
      outcome: "compensated",
      diagnostics: ["recovery readback: offline"],
    }]);

    const missing = createHarness(journal("readback_verified"));
    await expect(missing.coordinator.recover(10)).resolves.toEqual([{
      transactionId: "update-1",
      outcome: "compensated",
      diagnostics: ["recovery readback receipt is missing"],
    }]);
    expect(missing.dependencies.storage.verifyRecordedReadback).not.toHaveBeenCalled();
  });

  it("does not repeat compensation_pending and adds a default diagnostic for unproved restoration", async () => {
    const harness = createHarness(journal("compensation_pending"));
    (harness.dependencies.storage.compensate as jest.Mock).mockResolvedValue({
      restored: false,
      diagnostics: [],
    });

    await expect(harness.coordinator.recover(10)).resolves.toEqual([{
      transactionId: "update-1",
      outcome: "quarantined",
      diagnostics: ["recovery could not prove baseline restoration"],
    }]);
    expect(harness.dependencies.journal.transition).toHaveBeenCalledTimes(1);
    expect(harness.dependencies.journal.transition).toHaveBeenCalledWith(
      "update-1",
      "quarantine_required",
      expect.any(Object),
    );
  });

  it("bounds failures from compensation, quarantine, and terminal journal recording", async () => {
    const harness = createHarness(journal("staged"));
    (harness.dependencies.storage.compensate as jest.Mock).mockRejectedValue(
      new Error("restore offline"),
    );
    (harness.dependencies.storage.quarantine as jest.Mock).mockRejectedValue("quarantine offline");
    (harness.dependencies.journal.transition as jest.Mock)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("journal offline"));

    await expect(harness.coordinator.recover(10)).resolves.toEqual([{
      transactionId: "update-1",
      outcome: "quarantined",
      diagnostics: [
        "recovery compensation: restore offline",
        "recovery quarantine: quarantine offline",
        "recovery journal quarantine: journal offline",
      ],
    }]);
    expect(harness.dependencies.lock.release).toHaveBeenCalledTimes(1);
  });
});

function createHarness(retained: AreaUpdatePersistedJournalRecord) {
  const dependencies: AreaUpdateRecoveryDependencies = {
    lock: {
      acquire: jest.fn(async () => ({
        moduleId: "module:a",
        leaseId: "recovery-lease-1",
        ownerTransactionId: "update-1",
        fencingToken: 4,
        expiresAt: "2026-08-12T12:01:00.000Z",
      })),
      release: jest.fn(async () => true),
    },
    journal: {
      begin: jest.fn(),
      transition: jest.fn(async () => undefined),
      recordReadback: jest.fn(),
      finalize: jest.fn(async () => undefined),
      readJournal: jest.fn(async () => retained),
      listRecoverable: jest.fn(async () => [retained]),
    },
    storage: {
      verifyRecordedReadback: jest.fn(async () => ({ verified: true, diagnostics: [] })),
      compensate: jest.fn(async () => ({ restored: true, diagnostics: [] })),
      quarantine: jest.fn(async () => undefined),
    },
    ids: { nextRecoveryId: () => "recovery-1" },
  };
  return {
    dependencies,
    coordinator: new AreaUpdateRecoveryCoordinator(dependencies),
  };
}

function journal(
  state: AreaUpdatePersistedJournalRecord["state"],
  retainedReceipt?: AreaUpdateReceipt,
): AreaUpdatePersistedJournalRecord {
  return {
    transactionId: "update-1",
    moduleId: "module:a",
    areaResRef: "crypt01",
    actorId: "actor-1",
    idempotencyKey: "update-key-1",
    commandHash: "7".repeat(64),
    expectedModuleRevision: "1".repeat(64),
    sourceAreaSha256: "a".repeat(64),
    candidateAreaSha256: "b".repeat(64),
    setFingerprintSha256: "e".repeat(64),
    draftRevision: 3,
    draftNormalizedSha256: "d".repeat(64),
    leaseId: "old-lease",
    fencingToken: 3,
    state,
    candidateManifest: {
      areaId: "crypt01",
      tileProductionAdmission: areaTileProductionAdmissionFixture("tin01"),
      resources: [],
      moduleIfo: {
        key: "module.ifo",
        fileName: "module.ifo",
        resourceType: 2014,
        baselineSize: 3,
        baselineSha256: "9".repeat(64),
        candidateSize: 3,
        candidateSha256: "9".repeat(64),
      },
    },
    ...(retainedReceipt ? { receipt: retainedReceipt } : {}),
    diagnostics: [],
    createdAt: "2026-08-12T12:00:00.000Z",
    updatedAt: "2026-08-12T12:00:00.000Z",
  };
}

function receipt(): AreaUpdateReceipt {
  return {
    schemaVersion: "area-update-receipt.v1",
    transactionId: "update-1",
    areaResRef: "crypt01",
    moduleId: "module:a",
    previousModuleRevision: "1".repeat(64),
    newModuleRevision: "2".repeat(64),
    sourceAreaSha256: "a".repeat(64),
    candidateAreaSha256: "b".repeat(64),
    draft: { id: "draft-1", revision: 3, normalizedSha256: "d".repeat(64) },
    setFingerprintSha256: "e".repeat(64),
    tileProductionAdmission: areaTileProductionAdmissionFixture("tin01"),
    commandHash: "7".repeat(64),
    validatorVersion: "validator-v1",
    resources: [],
    moduleIfo: { key: "module.ifo", size: 3, sha256: "9".repeat(64) },
    unchangedCompanions: {
      gitSha256: "c".repeat(64),
      gicSha256: "f".repeat(64),
      moduleIfoSha256: "9".repeat(64),
    },
    readbackStatus: "verified",
    warnings: [],
    updatedAt: "2026-08-12T12:00:00.000Z",
  };
}
