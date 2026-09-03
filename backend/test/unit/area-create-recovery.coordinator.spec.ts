import {
  AreaCreateRecoveryCoordinator,
} from "../../src/modules/areas/application/area-create-recovery.coordinator";
import {
  MemoryAreaCreateControlStore,
} from "../../src/modules/areas/adapters/outbound/memory/memory-area-create-control-store";
import type {
  AreaCreatePersistedJournalRecord,
  AreaCreateJournalRecord,
  AreaCreateReceipt,
} from "../../src/modules/areas/domain/area-create-transaction.types";
import type {
  AreaCreateModuleLease,
  AreaCreateModuleLockPort,
  AreaCreateRecoveryStoragePort,
  AreaCreateTransactionJournalPort,
} from "../../src/modules/areas/application/ports/area-create-transaction.port";
import { areaTileProductionAdmissionFixture } from "./helpers/area-tile-production-admission-fixture";

function createHarness() {
  let nowMs = Date.parse("2026-08-07T12:00:00.000Z");
  let leaseId = 0;
  const control = new MemoryAreaCreateControlStore({
    now: () => new Date(nowMs),
    nextLeaseId: () => `lease-${++leaseId}`,
    leaseDurationMs: 30_000,
  });
  const storage: jest.Mocked<AreaCreateRecoveryStoragePort> = {
    verifyRecordedReadback: jest.fn(async (_journal: any, _lease: any) => ({
      verified: true,
      diagnostics: [] as string[],
    })),
    compensate: jest.fn(async (_journal: any, _lease: any) => ({
      restored: true,
      diagnostics: [] as string[],
    })),
    quarantine: jest.fn(async (_journal: any, _lease: any, _diagnostics: any) => undefined),
  };
  const coordinator = new AreaCreateRecoveryCoordinator({
    lock: control,
    journal: control,
    storage,
    ids: { nextRecoveryId: (transactionId: string) => `recovery:${transactionId}` },
  });
  return {
    control,
    storage,
    coordinator,
    advance(ms: number) {
      nowMs += ms;
    },
  };
}

describe("Area Create recovery coordinator", () => {
  it("reverifies and atomically finalizes a durable readback receipt after lease expiry", async () => {
    const harness = createHarness();
    const lease = await prepareJournal(harness.control, "transaction-1", "module:a");
    await advanceToIfoCommitted(harness.control, "transaction-1", lease!);
    const durableReceipt = receipt("transaction-1", "module:a");
    await harness.control.recordReadback("transaction-1", lease!, durableReceipt);
    harness.advance(30_001);

    const result = await harness.coordinator.recover(10);

    expect(result).toEqual([
      { transactionId: "transaction-1", outcome: "completed", diagnostics: [] },
    ]);
    expect(harness.storage.verifyRecordedReadback).toHaveBeenCalledTimes(1);
    expect(harness.storage.compensate).not.toHaveBeenCalled();
    expect((await harness.control.readJournal("transaction-1"))?.state).toBe("complete");
    expect(await harness.control.read("module:a", "key-1")).toEqual(
      expect.objectContaining({ result: durableReceipt }),
    );
  });

  it.each(["prepared", "staged", "resources_committed", "ifo_committed"] as const)(
    "compensates an interrupted %s transaction to a verified baseline",
    async (targetState) => {
      const harness = createHarness();
      const lease = await prepareJournal(harness.control, "transaction-1", "module:a");
      for (const state of ["staged", "resources_committed", "ifo_committed"] as const) {
        if (targetState === "prepared") break;
        await harness.control.transition("transaction-1", state, lease!);
        if (state === targetState) break;
      }
      harness.advance(30_001);

      const result = await harness.coordinator.recover(10);

      expect(result).toEqual([
        { transactionId: "transaction-1", outcome: "compensated", diagnostics: [] },
      ]);
      expect(harness.storage.compensate).toHaveBeenCalledTimes(1);
      expect((await harness.control.readJournal("transaction-1"))?.state).toBe(
        "compensated",
      );
    },
  );

  it("compensates instead of finalizing when recorded readback cannot be reverified", async () => {
    const harness = createHarness();
    const lease = await prepareJournal(harness.control, "transaction-1", "module:a");
    await advanceToIfoCommitted(harness.control, "transaction-1", lease!);
    await harness.control.recordReadback(
      "transaction-1",
      lease!,
      receipt("transaction-1", "module:a"),
    );
    harness.storage.verifyRecordedReadback.mockResolvedValue({
      verified: false,
      diagnostics: ["ARE hash changed"],
    });
    harness.advance(30_001);

    const result = await harness.coordinator.recover(10);

    expect(result).toEqual([
      {
        transactionId: "transaction-1",
        outcome: "compensated",
        diagnostics: ["ARE hash changed"],
      },
    ]);
    expect(harness.storage.compensate).toHaveBeenCalledTimes(1);
    expect(await harness.control.read("module:a", "key-1")).toBeNull();
  });

  it("quarantines when recovery cannot prove baseline restoration", async () => {
    const harness = createHarness();
    await prepareJournal(harness.control, "transaction-1", "module:a");
    harness.storage.compensate.mockResolvedValue({
      restored: false,
      diagnostics: ["IFO baseline mismatch"],
    });
    harness.advance(30_001);

    const result = await harness.coordinator.recover(10);

    expect(result).toEqual([
      {
        transactionId: "transaction-1",
        outcome: "quarantined",
        diagnostics: ["IFO baseline mismatch"],
      },
    ]);
    expect(harness.storage.quarantine).toHaveBeenCalledTimes(1);
    expect((await harness.control.readJournal("transaction-1"))?.state).toBe(
      "quarantine_required",
    );
    expect(await harness.control.acquire("module:a", "new-write")).toBeNull();
  });

  it("isolates per-transaction recovery failures and continues with other modules", async () => {
    const harness = createHarness();
    await prepareJournal(harness.control, "transaction-1", "module:a");
    await prepareJournal(harness.control, "transaction-2", "module:b");
    harness.storage.compensate
      .mockRejectedValueOnce(new Error("storage unavailable"))
      .mockResolvedValueOnce({ restored: true, diagnostics: [] });
    harness.advance(30_001);

    const result = await harness.coordinator.recover(10);

    expect(result).toEqual([
      {
        transactionId: "transaction-1",
        outcome: "quarantined",
        diagnostics: ["recovery compensation: storage unavailable"],
      },
      { transactionId: "transaction-2", outcome: "compensated", diagnostics: [] },
    ]);
    expect(harness.storage.compensate).toHaveBeenCalledTimes(2);
  });

  it("does not touch an unexpired active transaction", async () => {
    const harness = createHarness();
    await prepareJournal(harness.control, "transaction-1", "module:a");

    await expect(harness.coordinator.recover(10)).resolves.toEqual([]);
    expect(harness.storage.compensate).not.toHaveBeenCalled();
    expect(harness.storage.verifyRecordedReadback).not.toHaveBeenCalled();
  });

  it("reports an unavailable exact recovery lease without reading or mutating storage", async () => {
    const harness = createPortHarness(persistedJournal("prepared"), {
      acquire: null,
    });

    await expect(harness.coordinator.recover(10)).resolves.toEqual([
      { transactionId: "transaction-1", outcome: "lease_unavailable", diagnostics: [] },
    ]);
    expect(harness.journal.readJournal).not.toHaveBeenCalled();
    expect(harness.storage.compensate).not.toHaveBeenCalled();
    expect(harness.lock.release).not.toHaveBeenCalled();
  });

  it("classifies a journal that disappears after takeover and still releases the exact lease", async () => {
    const harness = createPortHarness(persistedJournal("prepared"), {
      readJournal: null,
    });

    await expect(harness.coordinator.recover(10)).resolves.toEqual([
      {
        transactionId: "transaction-1",
        outcome: "quarantined",
        diagnostics: ["recovery journal disappeared after lease acquisition"],
      },
    ]);
    expect(harness.lock.release).toHaveBeenCalledWith(harness.lease);
  });

  it("retains a thrown readback diagnostic before compensating", async () => {
    const harness = createPortHarness(persistedJournal("readback_verified", true));
    harness.storage.verifyRecordedReadback.mockRejectedValue(
      new Error("verifier unavailable"),
    );

    await expect(harness.coordinator.recover(10)).resolves.toEqual([
      {
        transactionId: "transaction-1",
        outcome: "compensated",
        diagnostics: ["recovery readback: verifier unavailable"],
      },
    ]);
  });

  it("fails closed for a receipt retained outside readback_verified", async () => {
    const harness = createPortHarness(persistedJournal("prepared", true));

    await expect(harness.coordinator.recover(10)).resolves.toEqual([
      { transactionId: "transaction-1", outcome: "compensated", diagnostics: [] },
    ]);
    expect(harness.storage.verifyRecordedReadback).not.toHaveBeenCalled();
    expect(harness.storage.compensate).toHaveBeenCalledTimes(1);
  });

  it("diagnoses a readback_verified journal whose durable receipt is missing", async () => {
    const harness = createPortHarness(persistedJournal("readback_verified"));

    await expect(harness.coordinator.recover(10)).resolves.toEqual([
      {
        transactionId: "transaction-1",
        outcome: "compensated",
        diagnostics: ["recovery readback receipt is missing"],
      },
    ]);
  });

  it("does not repeat the compensation_pending transition during resumed recovery", async () => {
    const harness = createPortHarness(persistedJournal("compensation_pending"));

    await expect(harness.coordinator.recover(10)).resolves.toEqual([
      { transactionId: "transaction-1", outcome: "compensated", diagnostics: [] },
    ]);
    expect(harness.journal.transition).toHaveBeenCalledTimes(1);
    expect(harness.journal.transition).toHaveBeenCalledWith(
      "transaction-1",
      "compensated",
      harness.lease,
    );
  });

  it("adds a deterministic diagnostic when restoration is unproven without details", async () => {
    const harness = createPortHarness(persistedJournal("prepared"));
    harness.storage.compensate.mockResolvedValue({ restored: false, diagnostics: [] });

    await expect(harness.coordinator.recover(10)).resolves.toEqual([
      {
        transactionId: "transaction-1",
        outcome: "quarantined",
        diagnostics: ["recovery could not prove baseline restoration"],
      },
    ]);
  });

  it("retains both storage and journal quarantine failures in bounded recovery diagnostics", async () => {
    const harness = createPortHarness(persistedJournal("prepared"));
    harness.storage.compensate.mockRejectedValue(new Error("restore failed"));
    harness.storage.quarantine.mockRejectedValue(new Error("quarantine write failed"));
    harness.journal.transition.mockImplementation(async (_id, state) => {
      if (state === "quarantine_required") {
        throw new Error("journal quarantine failed");
      }
    });

    await expect(harness.coordinator.recover(10)).resolves.toEqual([
      {
        transactionId: "transaction-1",
        outcome: "quarantined",
        diagnostics: [
          "recovery compensation: restore failed",
          "recovery quarantine: quarantine write failed",
          "recovery journal quarantine: journal quarantine failed",
        ],
      },
    ]);
    expect(harness.lock.release).toHaveBeenCalledWith(harness.lease);
  });
});

function createPortHarness(
  listed: AreaCreatePersistedJournalRecord,
  options: Readonly<{
    acquire?: AreaCreateModuleLease | null;
    readJournal?: AreaCreatePersistedJournalRecord | null;
  }> = {},
) {
  const lease: AreaCreateModuleLease = {
    moduleId: listed.moduleId,
    leaseId: "recovery-lease-1",
    ownerTransactionId: listed.transactionId,
    fencingToken: listed.fencingToken + 1,
    expiresAt: "2026-08-07T12:01:00.000Z",
  };
  const lock: jest.Mocked<AreaCreateModuleLockPort> = {
    acquire: jest.fn(async (..._args: Parameters<AreaCreateModuleLockPort["acquire"]>) =>
      Object.prototype.hasOwnProperty.call(options, "acquire")
        ? options.acquire ?? null
        : lease,
    ),
    release: jest.fn(async (..._args: Parameters<AreaCreateModuleLockPort["release"]>) => true),
  };
  const journal: jest.Mocked<AreaCreateTransactionJournalPort> = {
    begin: jest.fn(async (..._args: Parameters<AreaCreateTransactionJournalPort["begin"]>) => undefined),
    transition: jest.fn(async (..._args: Parameters<AreaCreateTransactionJournalPort["transition"]>) => undefined),
    recordReadback: jest.fn(async (..._args: Parameters<AreaCreateTransactionJournalPort["recordReadback"]>) => undefined),
    finalize: jest.fn(async (..._args: Parameters<AreaCreateTransactionJournalPort["finalize"]>) => undefined),
    readJournal: jest.fn(async (..._args: Parameters<AreaCreateTransactionJournalPort["readJournal"]>) =>
      Object.prototype.hasOwnProperty.call(options, "readJournal")
        ? options.readJournal ?? null
        : listed,
    ),
    listRecoverable: jest.fn(async (..._args: Parameters<AreaCreateTransactionJournalPort["listRecoverable"]>) => [listed]),
  };
  const storage: jest.Mocked<AreaCreateRecoveryStoragePort> = {
    verifyRecordedReadback: jest.fn(async (..._args: Parameters<AreaCreateRecoveryStoragePort["verifyRecordedReadback"]>) => ({ verified: true, diagnostics: [] })),
    compensate: jest.fn(async (..._args: Parameters<AreaCreateRecoveryStoragePort["compensate"]>) => ({ restored: true, diagnostics: [] })),
    quarantine: jest.fn(async (..._args: Parameters<AreaCreateRecoveryStoragePort["quarantine"]>) => undefined),
  };
  return {
    lease,
    lock,
    journal,
    storage,
    coordinator: new AreaCreateRecoveryCoordinator({
      lock,
      journal,
      storage,
      ids: { nextRecoveryId: (transactionId) => `recovery:${transactionId}` },
    }),
  };
}

function persistedJournal(
  state: AreaCreatePersistedJournalRecord["state"],
  withReceipt = false,
): AreaCreatePersistedJournalRecord {
  return {
    transactionId: "transaction-1",
    moduleId: "module:a",
    actorId: "actor-1",
    idempotencyKey: "key-1",
    commandHash: "a".repeat(64),
    expectedModuleRevision: "revision-7",
    profileId: "profile-v1",
    profileFingerprintSha256: "d".repeat(64),
    setFingerprintSha256: "e".repeat(64),
    draftRevision: 1,
    draftNormalizedSha256: "f".repeat(64),
    leaseId: "expired-lease-1",
    fencingToken: 1,
    state,
    candidateManifest: {
      areaId: "area_new",
      tileProductionAdmission: areaTileProductionAdmissionFixture(),
      resources: [],
      moduleIfo: {
        key: "module:a/module.ifo",
        fileName: "module.ifo",
        resourceType: 2014,
        baselineSize: 6,
        baselineSha256: "2".repeat(64),
        candidateSize: 5,
        candidateSha256: "3".repeat(64),
      },
    },
    ...(withReceipt ? { receipt: receipt("transaction-1", "module:a") } : {}),
    diagnostics: [],
    createdAt: "2026-08-07T12:00:00.000Z",
    updatedAt: "2026-08-07T12:00:30.001Z",
  };
}

async function prepareJournal(
  control: MemoryAreaCreateControlStore,
  transactionId: string,
  moduleId: string,
) {
  const lease = await control.acquire(moduleId, transactionId);
  await control.begin(journalRecord(transactionId, moduleId, lease!));
  return lease;
}

async function advanceToIfoCommitted(
  control: MemoryAreaCreateControlStore,
  transactionId: string,
  lease: NonNullable<Awaited<ReturnType<MemoryAreaCreateControlStore["acquire"]>>>,
) {
  for (const state of ["staged", "resources_committed", "ifo_committed"] as const) {
    await control.transition(transactionId, state, lease);
  }
}

function journalRecord(
  transactionId: string,
  moduleId: string,
  lease: { leaseId: string; fencingToken: number },
): AreaCreateJournalRecord {
  return {
    transactionId,
    moduleId,
    actorId: "actor-1",
    idempotencyKey: "key-1",
    commandHash: "a".repeat(64),
    expectedModuleRevision: "revision-7",
    profileId: "profile-v1",
    profileFingerprintSha256: "d".repeat(64),
    setFingerprintSha256: "e".repeat(64),
    tileProductionAdmission: areaTileProductionAdmissionFixture(),
    draftRevision: 1,
    draftNormalizedSha256: "f".repeat(64),
    leaseId: lease.leaseId,
    fencingToken: lease.fencingToken,
    candidate: {
      areaId: "area_new",
      resources: [
        {
          extension: "are",
          key: `${moduleId}/area_new.are`,
          fileName: "area_new.are",
          resourceType: 2012,
          bytes: Buffer.from("are"),
          size: 3,
          sha256: "1".repeat(64),
        },
      ],
      moduleIfo: {
        key: `${moduleId}/module.ifo`,
        fileName: "module.ifo",
        resourceType: 2014,
        baselineBytes: Buffer.from("before"),
        baselineSha256: "2".repeat(64),
        candidateBytes: Buffer.from("after"),
        candidateSha256: "3".repeat(64),
      },
    },
    createdAt: "2026-08-07T12:00:00.000Z",
  };
}

function receipt(transactionId: string, moduleId: string): AreaCreateReceipt {
  return {
    schemaVersion: "area-create-receipt.v1",
    transactionId,
    areaId: "area_new",
    resRef: "area_new",
    name: "Area",
    tag: "Area_Tag",
    moduleId,
    previousModuleRevision: "revision-7",
    newModuleRevision: "revision-8",
    profileId: "profile-v1",
    profileFingerprintSha256: "d".repeat(64),
    setFingerprintSha256: "e".repeat(64),
    tileProductionAdmission: areaTileProductionAdmissionFixture(),
    draftNormalizedSha256: "f".repeat(64),
    commandHash: "a".repeat(64),
    validatorVersion: "validator-v1",
    resources: [],
    moduleIfo: { key: "module.ifo", size: 1, sha256: "4".repeat(64) },
    readbackStatus: "verified",
    warnings: [],
    createdAt: "2026-08-07T12:00:00.000Z",
  };
}
