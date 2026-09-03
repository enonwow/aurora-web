import { AreaEventScriptPublicationRecoveryCoordinator } from "../../src/modules/areas/application/area-event-script-publication-recovery.coordinator";
import type { AreaEventScriptPublicationRecoveryDependencies } from "../../src/modules/areas/application/area-event-script-publication-recovery.coordinator";
import type {
  AreaEventScriptPublicationPersistedJournalRecord,
  AreaEventScriptPublicationReceipt,
} from "../../src/modules/areas/domain/area-event-script-publication.types";

describe("Area event-script publication recovery coordinator", () => {
  it("finalizes a retained receipt only after fresh descriptor/content readback", async () => {
    const harness = createHarness(journal("readback_verified", receipt()));

    await expect(harness.coordinator.recover(10)).resolves.toEqual([{
      transactionId: "script-tx-1",
      outcome: "completed",
      diagnostics: [],
    }]);
    expect(harness.dependencies.storage.verifyRecordedReadback).toHaveBeenCalledTimes(1);
    expect(harness.dependencies.journal.finalize).toHaveBeenCalledWith(
      "script-tx-1",
      expect.any(Object),
      expect.objectContaining({
        moduleId: "module:test",
        key: "publish-1",
        commandHash: "a".repeat(64),
        createdAt: "2026-08-26T12:00:00.000Z",
        result: receipt(),
      }),
    );
  });

  it.each(["prepared", "staged", "resources_committed", "ifo_committed"] as const)(
    "restores the exact baseline for an interrupted %s publication",
    async (state) => {
      const harness = createHarness(journal(state));

      await expect(harness.coordinator.recover(10)).resolves.toEqual([{
        transactionId: "script-tx-1",
        outcome: "compensated",
        diagnostics: [],
      }]);
      expect(harness.dependencies.journal.transition).toHaveBeenNthCalledWith(
        1,
        "script-tx-1",
        "compensation_pending",
        expect.any(Object),
      );
      expect(harness.dependencies.journal.transition).toHaveBeenNthCalledWith(
        2,
        "script-tx-1",
        "compensated",
        expect.any(Object),
      );
    },
  );

  it("restores rather than finalizing when fresh readback contradicts the receipt", async () => {
    const harness = createHarness(journal("readback_verified", receipt()));
    (harness.dependencies.storage.verifyRecordedReadback as jest.Mock).mockResolvedValue({
      verified: false,
      diagnostics: ["AREA_EVENT_SCRIPT_RECOVERY_RESOURCE_MISMATCH"],
    });

    await expect(harness.coordinator.recover(10)).resolves.toEqual([{
      transactionId: "script-tx-1",
      outcome: "compensated",
      diagnostics: ["AREA_EVENT_SCRIPT_RECOVERY_RESOURCE_MISMATCH"],
    }]);
    expect(harness.dependencies.journal.finalize).not.toHaveBeenCalled();
    expect(harness.dependencies.storage.restoreRecordedBaseline).toHaveBeenCalledTimes(1);
  });

  it("quarantines when exact baseline restoration cannot be proved", async () => {
    const harness = createHarness(journal("ifo_committed"));
    (harness.dependencies.storage.restoreRecordedBaseline as jest.Mock).mockResolvedValue({
      restored: false,
      diagnostics: ["AREA_EVENT_SCRIPT_RECOVERY_BASELINE_UNPROVEN"],
    });

    await expect(harness.coordinator.recover(10)).resolves.toEqual([{
      transactionId: "script-tx-1",
      outcome: "quarantined",
      diagnostics: ["AREA_EVENT_SCRIPT_RECOVERY_BASELINE_UNPROVEN"],
    }]);
    expect(harness.dependencies.storage.quarantineRecordedPublication).toHaveBeenCalledTimes(1);
    expect(harness.dependencies.journal.transition).toHaveBeenLastCalledWith(
      "script-tx-1",
      "quarantine_required",
      expect.any(Object),
    );
  });

  it("does not inspect or mutate a journal when the exact recovery lease is unavailable", async () => {
    const harness = createHarness(journal("staged"));
    (harness.dependencies.lock.acquire as jest.Mock).mockResolvedValue(null);

    await expect(harness.coordinator.recover(10)).resolves.toEqual([{
      transactionId: "script-tx-1",
      outcome: "lease_unavailable",
      diagnostics: [],
    }]);
    expect(harness.dependencies.journal.readJournal).not.toHaveBeenCalled();
    expect(harness.dependencies.storage.restoreRecordedBaseline).not.toHaveBeenCalled();
  });

  it("bounds readback, restoration, quarantine, and journal errors without leaking inputs", async () => {
    const harness = createHarness(journal("readback_verified", receipt()));
    (harness.dependencies.storage.verifyRecordedReadback as jest.Mock).mockRejectedValue(
      new Error("readback unavailable"),
    );
    (harness.dependencies.storage.restoreRecordedBaseline as jest.Mock).mockRejectedValue(
      new Error("restore unavailable"),
    );
    (harness.dependencies.storage.quarantineRecordedPublication as jest.Mock).mockRejectedValue(
      new Error("quarantine unavailable"),
    );
    (harness.dependencies.journal.transition as jest.Mock)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("journal unavailable"));

    await expect(harness.coordinator.recover(10)).resolves.toEqual([{
      transactionId: "script-tx-1",
      outcome: "quarantined",
      diagnostics: [
        "recovery readback: readback unavailable",
        "recovery compensation: restore unavailable",
        "recovery quarantine: quarantine unavailable",
        "recovery journal quarantine: journal unavailable",
      ],
    }]);
    expect(harness.dependencies.lock.release).toHaveBeenCalledTimes(1);
  });
});

function createHarness(retained: AreaEventScriptPublicationPersistedJournalRecord) {
  const dependencies: AreaEventScriptPublicationRecoveryDependencies = {
    lock: {
      acquire: jest.fn(async () => ({
        moduleId: retained.moduleId,
        leaseId: "recovery-lease-1",
        ownerTransactionId: retained.transactionId,
        fencingToken: 4,
        expiresAt: "2026-08-26T12:01:00.000Z",
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
      restoreRecordedBaseline: jest.fn(async () => ({ restored: true, diagnostics: [] })),
      quarantineRecordedPublication: jest.fn(async () => undefined),
    },
    ids: { nextRecoveryId: () => "recovery-script-tx-1" },
  };
  return {
    dependencies,
    coordinator: new AreaEventScriptPublicationRecoveryCoordinator(dependencies),
  };
}

function journal(
  state: AreaEventScriptPublicationPersistedJournalRecord["state"],
  retainedReceipt?: AreaEventScriptPublicationReceipt,
): AreaEventScriptPublicationPersistedJournalRecord {
  return {
    transactionId: "script-tx-1",
    moduleId: "module:test",
    targetResRef: "area_enter",
    actorId: "admin-1",
    idempotencyKey: "publish-1",
    commandHash: "a".repeat(64),
    expectedModuleRevision: "b".repeat(64),
    leaseId: "old-lease",
    fencingToken: 3,
    state,
    candidateManifest: {
      targetResRef: "area_enter",
      sourceSha256: "c".repeat(64),
      includeSetSha256: "d".repeat(64),
      executionProfileSha256: "e".repeat(64),
      provider: provider(),
      compilerReceiptSha256: "6".repeat(64),
      resources: resources(),
    },
    ...(retainedReceipt ? { receipt: retainedReceipt } : {}),
    diagnostics: [],
    createdAt: "2026-08-26T11:59:59.000Z",
    updatedAt: "2026-08-26T12:00:00.000Z",
  };
}

function receipt(): AreaEventScriptPublicationReceipt {
  return {
    schemaVersion: "area-event-script-publication-receipt.v1",
    transactionId: "script-tx-1",
    moduleId: "module:test",
    targetResRef: "area_enter",
    previousModuleRevision: "b".repeat(64),
    newModuleRevision: "7".repeat(64),
    commandHash: "a".repeat(64),
    sourceSha256: "c".repeat(64),
    includeSetSha256: "d".repeat(64),
    executionProfileSha256: "e".repeat(64),
    provider: provider(),
    compilerReceiptSha256: "6".repeat(64),
    resources: resources(),
    readbackStatus: "verified",
    warnings: [],
    publishedAt: "2026-08-26T12:00:00.000Z",
  };
}

function provider() {
  return {
    providerId: "neverwinter-nim-official-script-compiler" as const,
    executableSha256: "1".repeat(64),
    versionMarker: "neverwinter 2.1.2",
    versionOutputSha256: "2".repeat(64),
    languageSpecSha256: "3".repeat(64),
    runtimeLibrarySetSha256: "4".repeat(64),
    launcherFileSetSha256: "5".repeat(64),
  };
}

function resources() {
  return [
    { extension: "ncs" as const, logicalKey: "area_enter.ncs", resourceType: 2010, size: 3, sha256: "8".repeat(64) },
    { extension: "ndb" as const, logicalKey: "area_enter.ndb", resourceType: 2064, size: 4, sha256: "9".repeat(64) },
    { extension: "nss" as const, logicalKey: "area_enter.nss", resourceType: 2009, size: 5, sha256: "c".repeat(64) },
  ];
}
