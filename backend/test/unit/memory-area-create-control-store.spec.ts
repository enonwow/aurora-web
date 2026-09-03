import {
  MemoryAreaCreateControlStore,
} from "../../src/modules/areas/adapters/outbound/memory/memory-area-create-control-store";
import {
  createAreaCreateIdempotencyEntry,
} from "../../src/modules/areas/domain/area-create-idempotency";
import type {
  AreaCreateJournalState,
  AreaCreateJournalRecord,
  AreaCreateReceipt,
} from "../../src/modules/areas/domain/area-create-transaction.types";
import {
  canTransitionAreaCreateJournal,
  isAreaCreateJournalBlocking,
  isAreaCreateJournalRecoverable,
} from "../../src/modules/areas/domain/area-create-journal-policy";
import { areaTileProductionAdmissionFixture } from "./helpers/area-tile-production-admission-fixture";

function createHarness() {
  let nowMs = Date.parse("2026-08-07T12:00:00.000Z");
  let leaseSequence = 0;
  const store = new MemoryAreaCreateControlStore({
    leaseDurationMs: 30_000,
    now: () => new Date(nowMs),
    nextLeaseId: () => `lease-${++leaseSequence}`,
  });
  return {
    store,
    advance(ms: number) {
      nowMs += ms;
    },
  };
}

describe("Memory Area Create control store", () => {
  it("blocks Create on an external Area lifecycle journal and transfers only exact recovery", async () => {
    const harness = createHarness();
    const external = {
      listBlocking: jest.fn((moduleId: string) =>
        moduleId === "module:a"
          ? [{ transactionId: "update-1", state: "staged" as const }]
          : [],
      ),
      transferRecoveryLease: jest.fn(() => true),
    };
    harness.store.registerExternalJournalSource(external);

    await expect(harness.store.acquire("module:a", "create-1")).resolves.toBeNull();
    await expect(
      harness.store.acquire("module:a", "recovery-wrong", {
        recoveryOfTransactionId: "update-other",
      }),
    ).resolves.toBeNull();

    const recovery = await harness.store.acquire("module:a", "recovery-1", {
      recoveryOfTransactionId: "update-1",
    });
    expect(recovery).toEqual(
      expect.objectContaining({
        ownerTransactionId: "update-1",
        fencingToken: 1,
      }),
    );
    expect(external.transferRecoveryLease).toHaveBeenCalledWith("update-1", recovery);
  });

  it("fails closed when multiple lifecycle journal sources claim a blocking transaction", async () => {
    const harness = createHarness();
    for (const transactionId of ["update-1", "delete-1"]) {
      harness.store.registerExternalJournalSource({
        listBlocking: () => [{ transactionId, state: "staged" }],
        transferRecoveryLease: () => true,
      });
    }

    await expect(
      harness.store.acquire("module:a", "recovery-1", {
        recoveryOfTransactionId: "update-1",
      }),
    ).resolves.toBeNull();
  });

  it("validates lease duration and applies an explicitly supplied one-millisecond lease", async () => {
    for (const leaseDurationMs of [0, -1, 1.5, Number.NaN]) {
      expect(
        () => new MemoryAreaCreateControlStore({ leaseDurationMs }),
      ).toThrow("Area Create lease duration must be a positive integer.");
    }

    const store = new MemoryAreaCreateControlStore({
      leaseDurationMs: 1,
      now: () => new Date("2026-08-07T12:00:00.000Z"),
      nextLeaseId: () => "lease-explicit",
    });
    await expect(store.acquire("module:a", "transaction-1")).resolves.toEqual(
      expect.objectContaining({
        leaseId: "lease-explicit",
        expiresAt: "2026-08-07T12:00:00.001Z",
      }),
    );
  });

  it("provides working default clock and lease ID sources", async () => {
    const before = Date.now();
    const lease = await new MemoryAreaCreateControlStore().acquire(
      "module:a",
      "transaction-1",
    );
    const after = Date.now();

    expect(lease?.leaseId).toMatch(/^[a-f0-9-]{36}$/u);
    expect(Date.parse(lease!.expiresAt)).toBeGreaterThanOrEqual(before + 30_000);
    expect(Date.parse(lease!.expiresAt)).toBeLessThanOrEqual(after + 30_000);
  });

  it("grants one module lease, fences competitors, and rejects a stale release", async () => {
    const harness = createHarness();
    const first = await harness.store.acquire("module:a", "transaction-1");
    const competitor = await harness.store.acquire("module:a", "transaction-2");

    expect(first).toEqual({
      moduleId: "module:a",
      leaseId: "lease-1",
      ownerTransactionId: "transaction-1",
      fencingToken: 1,
      expiresAt: "2026-08-07T12:00:30.000Z",
    });
    expect(competitor).toBeNull();

    harness.advance(30_001);
    const second = await harness.store.acquire("module:a", "transaction-2");
    expect(second).toEqual(
      expect.objectContaining({
        leaseId: "lease-2",
        ownerTransactionId: "transaction-2",
        fencingToken: 2,
      }),
    );
    expect(await harness.store.release(first!)).toBe(false);
    expect(await harness.store.release(second!)).toBe(true);
  });

  it("blocks normal takeover of an unresolved journal and permits only exact recovery", async () => {
    const harness = createHarness();
    const original = await harness.store.acquire("module:a", "transaction-1");
    await harness.store.begin(journalRecord("transaction-1", "module:a", original!));
    await harness.store.transition("transaction-1", "staged", original!);

    harness.advance(30_001);
    expect(await harness.store.acquire("module:a", "transaction-2")).toBeNull();
    expect(
      await harness.store.acquire("module:a", "recovery-wrong", {
        recoveryOfTransactionId: "transaction-other",
      }),
    ).toBeNull();

    const recovery = await harness.store.acquire("module:a", "recovery-1", {
      recoveryOfTransactionId: "transaction-1",
    });
    expect(recovery).toEqual(
      expect.objectContaining({
        ownerTransactionId: "transaction-1",
        fencingToken: 2,
        leaseId: "lease-2",
      }),
    );
    expect(await harness.store.release(original!)).toBe(false);
  });

  it("treats the exact expiry instant as available for the next fenced writer", async () => {
    const harness = createHarness();
    await harness.store.acquire("module:a", "transaction-1");
    harness.advance(30_000);

    await expect(
      harness.store.acquire("module:a", "transaction-2"),
    ).resolves.toEqual(expect.objectContaining({ fencingToken: 2 }));
  });

  it("rejects recovery when no matching unresolved journal exists", async () => {
    const harness = createHarness();

    await expect(
      harness.store.acquire("module:a", "recovery-1", {
        recoveryOfTransactionId: "transaction-missing",
      }),
    ).resolves.toBeNull();
  });

  it("never permits recovery takeover of a quarantined transaction", async () => {
    const harness = createHarness();
    const lease = await harness.store.acquire("module:a", "transaction-1");
    await harness.store.begin(journalRecord("transaction-1", "module:a", lease!));
    await harness.store.transition("transaction-1", "compensation_pending", lease!);
    await harness.store.transition("transaction-1", "quarantine_required", lease!);
    harness.advance(30_001);

    await expect(
      harness.store.acquire("module:a", "recovery-1", {
        recoveryOfTransactionId: "transaction-1",
      }),
    ).resolves.toBeNull();
  });

  it("fails closed if durable corruption exposes multiple blocking journals for one module", async () => {
    const harness = createHarness();
    const first = await harness.store.acquire("module:a", "transaction-1");
    await harness.store.begin(journalRecord("transaction-1", "module:a", first!));
    const second = await harness.store.acquire("module:b", "transaction-2");
    await harness.store.begin(journalRecord("transaction-2", "module:b", second!));
    const internals = harness.store as unknown as {
      journals: Map<string, { moduleId: string }>;
    };
    internals.journals.get("transaction-2")!.moduleId = "module:a";
    harness.advance(30_001);

    await expect(
      harness.store.acquire("module:a", "recovery-1", {
        recoveryOfTransactionId: "transaction-1",
      }),
    ).resolves.toBeNull();
  });

  it("requires the current unexpired fencing lease for begin and transitions", async () => {
    const harness = createHarness();
    const lease = await harness.store.acquire("module:a", "transaction-1");
    const wrongLease = {
      ...lease!,
      leaseId: "lease-stale",
      fencingToken: 0,
    };

    await expect(
      harness.store.begin(journalRecord("transaction-1", "module:a", wrongLease)),
    ).rejects.toThrow("AREA_CREATE_CONTROL_FENCED");

    await harness.store.begin(journalRecord("transaction-1", "module:a", lease!));
    await expect(
      harness.store.transition("transaction-1", "staged", wrongLease),
    ).rejects.toThrow("AREA_CREATE_CONTROL_FENCED");

    harness.advance(30_001);
    await expect(
      harness.store.transition("transaction-1", "staged", lease!),
    ).rejects.toThrow("AREA_CREATE_CONTROL_FENCED");
  });

  it("reports the exact lease fencing failure reason, including the expiry instant", async () => {
    const missing = createHarness();
    const missingLease = {
      moduleId: "module:a",
      leaseId: "lease-missing",
      ownerTransactionId: "transaction-1",
      fencingToken: 1,
      expiresAt: "2026-08-07T12:00:30.000Z",
    };
    await expect(
      missing.store.begin(journalRecord("transaction-1", "module:a", missingLease)),
    ).rejects.toThrow("(lock_missing)");

    for (const [label, mutate] of [
      ["lease_id_mismatch", { leaseId: "lease-other" }],
      ["owner_transaction_mismatch", { ownerTransactionId: "transaction-other" }],
      ["fencing_token_mismatch", { fencingToken: 999 }],
    ] as const) {
      const harness = createHarness();
      const lease = await harness.store.acquire("module:a", "transaction-1");
      const attempted = { ...lease!, ...mutate };
      const record = journalRecord(
        attempted.ownerTransactionId,
        attempted.moduleId,
        attempted,
      );
      await expect(harness.store.begin(record)).rejects.toThrow(`(${label})`);
    }

    const expired = createHarness();
    const expiredLease = await expired.store.acquire("module:a", "transaction-1");
    expired.advance(30_000);
    await expect(
      expired.store.begin(
        journalRecord("transaction-1", "module:a", expiredLease!),
      ),
    ).rejects.toThrow("(lease_expired)");
  });

  it("binds begin to the lease owner and makes only the exact identity replay idempotent", async () => {
    const harness = createHarness();
    const lease = await harness.store.acquire("module:a", "transaction-1");
    const original = journalRecord("transaction-1", "module:a", lease!);

    await expect(
      harness.store.begin({ ...original, transactionId: "transaction-other" }),
    ).rejects.toThrow("AREA_CREATE_CONTROL_FENCED");
    await harness.store.begin(original);
    await expect(harness.store.begin(original)).resolves.toBeUndefined();

    for (const conflict of [
      { ...original, commandHash: "9".repeat(64) },
      { ...original, idempotencyKey: "key-other" },
    ]) {
      await expect(harness.store.begin(conflict)).rejects.toThrow(
        "AREA_CREATE_JOURNAL_CONFLICT: Transaction ID is already bound to a different Area Create command.",
      );
    }

    const otherLease = await harness.store.acquire("module:b", "transaction-1");
    await expect(
      harness.store.begin(journalRecord("transaction-1", "module:b", otherLease!)),
    ).rejects.toThrow("AREA_CREATE_JOURNAL_CONFLICT");
  });

  it("records deterministic journal timestamps and rejects a missing transaction explicitly", async () => {
    const harness = createHarness();
    const lease = await harness.store.acquire("module:a", "transaction-1");
    await harness.store.begin(journalRecord("transaction-1", "module:a", lease!));
    expect((await harness.store.readJournal("transaction-1"))?.updatedAt).toBe(
      "2026-08-07T12:00:00.000Z",
    );
    harness.advance(1_000);
    await harness.store.transition("transaction-1", "staged", lease!);
    expect((await harness.store.readJournal("transaction-1"))?.updatedAt).toBe(
      "2026-08-07T12:00:01.000Z",
    );

    await expect(
      harness.store.transition("transaction-missing", "staged", lease!),
    ).rejects.toThrow(
      "AREA_CREATE_JOURNAL_MISSING: Area Create journal does not exist.",
    );
  });

  it.each([
    ["moduleId", { moduleId: "module:other" }],
    ["leaseId", { leaseId: "lease-other" }],
    ["fencingToken", { fencingToken: 999 }],
    ["transactionId", { transactionId: "transaction-other" }],
  ] as const)("rejects a journal whose persisted %s no longer matches its lease", async (_field, change) => {
    const harness = createHarness();
    const lease = await harness.store.acquire("module:a", "transaction-1");
    await harness.store.begin(journalRecord("transaction-1", "module:a", lease!));
    const internals = harness.store as unknown as {
      journals: Map<string, Record<string, unknown>>;
    };
    Object.assign(internals.journals.get("transaction-1")!, change);

    await expect(
      harness.store.transition("transaction-1", "staged", lease!),
    ).rejects.toThrow(
      "AREA_CREATE_CONTROL_FENCED: Area Create journal is owned by another fencing lease.",
    );
  });

  it("enforces the journal graph while allowing idempotent same-state transitions", async () => {
    const harness = createHarness();
    const lease = await harness.store.acquire("module:a", "transaction-1");
    await harness.store.begin(journalRecord("transaction-1", "module:a", lease!));

    await expect(
      harness.store.transition("transaction-1", "resources_committed", lease!),
    ).rejects.toThrow(
      "AREA_CREATE_JOURNAL_TRANSITION_INVALID: Area Create journal cannot transition from prepared to resources_committed.",
    );

    await harness.store.transition("transaction-1", "staged", lease!);
    const beforeReplay = await harness.store.readJournal("transaction-1");
    harness.advance(1_000);
    await harness.store.transition("transaction-1", "staged", lease!);
    expect((await harness.store.readJournal("transaction-1"))?.updatedAt).toBe(
      beforeReplay?.updatedAt,
    );
    await harness.store.transition("transaction-1", "resources_committed", lease!);
    await harness.store.transition("transaction-1", "ifo_committed", lease!);
    await expect(
      harness.store.transition("transaction-1", "readback_verified", lease!),
    ).rejects.toThrow("AREA_CREATE_JOURNAL_TRANSITION_INVALID");
    await harness.store.recordReadback(
      "transaction-1",
      lease!,
      receipt("transaction-1", "a".repeat(64)),
    );

    const persisted = await harness.store.readJournal("transaction-1");
    expect(persisted?.diagnostics).toEqual([]);
    expect(persisted?.state).toBe("readback_verified");
    expect(persisted?.receipt).toEqual(receipt("transaction-1", "a".repeat(64)));
    expect(Object.isFrozen(persisted?.receipt)).toBe(true);
  });

  it("records readback only after IFO commit and makes the exact receipt replay idempotent", async () => {
    const harness = createHarness();
    const lease = await harness.store.acquire("module:a", "transaction-1");
    await harness.store.begin(journalRecord("transaction-1", "module:a", lease!));
    const verified = receipt("transaction-1", "a".repeat(64));

    await expect(
      harness.store.recordReadback("transaction-1", lease!, verified),
    ).rejects.toThrow(
      "AREA_CREATE_JOURNAL_TRANSITION_INVALID: Readback can be recorded only after IFO commit.",
    );
    for (const state of ["staged", "resources_committed", "ifo_committed"] as const) {
      await harness.store.transition("transaction-1", state, lease!);
    }
    await harness.store.recordReadback("transaction-1", lease!, verified);
    await expect(
      harness.store.recordReadback("transaction-1", lease!, verified),
    ).resolves.toBeUndefined();
    await expect(
      harness.store.recordReadback("transaction-1", lease!, {
        ...verified,
        newModuleRevision: "revision-other",
      }),
    ).rejects.toThrow(
      "AREA_CREATE_READBACK_CONFLICT: Readback receipt differs from the one already retained in the journal.",
    );
  });

  it("fails closed when a readback_verified journal has lost its durable receipt", async () => {
    const harness = createHarness();
    const lease = await harness.store.acquire("module:a", "transaction-1");
    await prepareReadback(harness.store, "transaction-1", "module:a", lease!);
    const internals = harness.store as unknown as {
      journals: Map<string, { receipt?: AreaCreateReceipt }>;
    };
    delete internals.journals.get("transaction-1")!.receipt;

    await expect(
      harness.store.recordReadback(
        "transaction-1",
        lease!,
        receipt("transaction-1", "a".repeat(64)),
      ),
    ).rejects.toThrow("AREA_CREATE_READBACK_CONFLICT");
  });

  it.each([
    ["transactionId", { transactionId: "transaction-other" }],
    ["moduleId", { moduleId: "module:other" }],
    ["commandHash", { commandHash: "9".repeat(64) }],
    ["profileId", { profileId: "profile-other" }],
    ["profileFingerprintSha256", { profileFingerprintSha256: "8".repeat(64) }],
    ["setFingerprintSha256", { setFingerprintSha256: "7".repeat(64) }],
    [
      "tileProductionAdmission",
      {
        tileProductionAdmission: {
          ...areaTileProductionAdmissionFixture(),
          reportSha256: "0".repeat(64),
        },
      },
    ],
    ["draftNormalizedSha256", { draftNormalizedSha256: "6".repeat(64) }],
    ["readbackStatus", { readbackStatus: "failed" as never }],
  ] as const)("rejects a readback receipt with mismatched %s identity", async (_field, change) => {
    const harness = createHarness();
    const lease = await harness.store.acquire("module:a", "transaction-1");
    await harness.store.begin(journalRecord("transaction-1", "module:a", lease!));
    for (const state of ["staged", "resources_committed", "ifo_committed"] as const) {
      await harness.store.transition("transaction-1", state, lease!);
    }

    await expect(
      harness.store.recordReadback("transaction-1", lease!, {
        ...receipt("transaction-1", "a".repeat(64)),
        ...change,
      }),
    ).rejects.toThrow(
      "AREA_CREATE_READBACK_CONFLICT: Readback receipt is outside the durable journal identity scope.",
    );
  });

  it("stores a byte-free bounded candidate manifest instead of resource buffers", async () => {
    const harness = createHarness();
    const lease = await harness.store.acquire("module:a", "transaction-1");
    await harness.store.begin(journalRecord("transaction-1", "module:a", lease!));

    const persisted = await harness.store.readJournal("transaction-1");
    expect(persisted?.candidateManifest).toEqual({
      areaId: "area_new",
      tileProductionAdmission: areaTileProductionAdmissionFixture(),
      resources: [
        {
          extension: "are",
          key: "modules/a/area_new.are",
          fileName: "area_new.are",
          resourceType: 2012,
          size: 3,
          sha256: "a".repeat(64),
        },
      ],
      moduleIfo: {
        key: "modules/a/module.ifo",
        fileName: "module.ifo",
        resourceType: 2014,
        baselineSize: 6,
        baselineSha256: "b".repeat(64),
        candidateSize: 5,
        candidateSha256: "c".repeat(64),
      },
    });
    expect(JSON.stringify(persisted)).not.toContain("data");
    expect(JSON.stringify(persisted)).not.toContain("before");
    expect(JSON.stringify(persisted)).not.toContain("after");
  });

  it("atomically finalizes readback and exposes the immutable idempotency result", async () => {
    const harness = createHarness();
    const lease = await harness.store.acquire("module:a", "transaction-1");
    await harness.store.begin(journalRecord("transaction-1", "module:a", lease!));
    for (const state of [
      "staged",
      "resources_committed",
      "ifo_committed",
    ] as const) {
      await harness.store.transition("transaction-1", state, lease!);
    }
    await harness.store.recordReadback(
      "transaction-1",
      lease!,
      receipt("transaction-1", "a".repeat(64)),
    );
    const entry = idempotencyEntry("transaction-1", "a".repeat(64));

    await harness.store.finalize("transaction-1", lease!, entry);
    await harness.store.finalize("transaction-1", lease!, entry);

    expect((await harness.store.readJournal("transaction-1"))?.state).toBe("complete");
    expect(await harness.store.read("module:a", "key-1")).toEqual(entry);
    expect(Object.isFrozen((await harness.store.read("module:a", "key-1"))?.result)).toBe(
      true,
    );
  });

  it("rejects finalization before durable readback and when its result differs from the receipt", async () => {
    const harness = createHarness();
    const lease = await harness.store.acquire("module:a", "transaction-1");
    await harness.store.begin(journalRecord("transaction-1", "module:a", lease!));
    const entry = idempotencyEntry("transaction-1", "a".repeat(64));

    await expect(
      harness.store.finalize("transaction-1", lease!, entry),
    ).rejects.toThrow(
      "AREA_CREATE_JOURNAL_TRANSITION_INVALID: Only a readback-verified Area Create transaction can be finalized.",
    );
    for (const state of ["staged", "resources_committed", "ifo_committed"] as const) {
      await harness.store.transition("transaction-1", state, lease!);
    }
    await harness.store.recordReadback(
      "transaction-1",
      lease!,
      receipt("transaction-1", "a".repeat(64)),
    );
    const differentResult = createAreaCreateIdempotencyEntry({
      ...entry,
      result: { ...entry.result, newModuleRevision: "revision-other" },
    });
    await expect(
      harness.store.finalize("transaction-1", lease!, differentResult),
    ).rejects.toThrow(
      "AREA_CREATE_IDEMPOTENCY_CONFLICT: Finalization result differs from the durable readback receipt.",
    );
  });

  it.each([
    ["moduleId", { moduleId: "module:other" }],
    ["key", { key: "key-other" }],
    ["commandHash", { commandHash: "9".repeat(64) }],
    [
      "transactionId",
      {
        result: {
          ...idempotencyEntry("transaction-1", "a".repeat(64)).result,
          transactionId: "transaction-other",
        },
      },
    ],
  ] as const)("rejects finalization outside journal %s scope", async (_field, change) => {
    const harness = createHarness();
    const lease = await harness.store.acquire("module:a", "transaction-1");
    await prepareReadback(harness.store, "transaction-1", "module:a", lease!);
    const base = idempotencyEntry("transaction-1", "a".repeat(64));
    const entry = createAreaCreateIdempotencyEntry({ ...base, ...change });

    if (_field === "transactionId") {
      const internals = harness.store as unknown as {
        journals: Map<string, { receipt?: AreaCreateReceipt }>;
      };
      internals.journals.get("transaction-1")!.receipt = entry.result;
    }
    await expect(
      harness.store.finalize("transaction-1", lease!, entry),
    ).rejects.toThrow(
      "AREA_CREATE_IDEMPOTENCY_CONFLICT: Finalization result is outside the journal identity scope.",
    );
  });

  it("rejects a different replay after the journal is complete", async () => {
    const harness = createHarness();
    const lease = await harness.store.acquire("module:a", "transaction-1");
    await prepareReadback(harness.store, "transaction-1", "module:a", lease!);
    const entry = idempotencyEntry("transaction-1", "a".repeat(64));
    await harness.store.finalize("transaction-1", lease!, entry);

    await expect(
      harness.store.finalize(
        "transaction-1",
        lease!,
        { ...entry, createdAt: "2026-08-07T12:00:01.000Z" },
      ),
    ).rejects.toThrow(
      "AREA_CREATE_IDEMPOTENCY_CONFLICT: Completed journal does not match the retained idempotency result.",
    );
  });

  it.each([
    ["moduleId", { moduleId: "module:other" }],
    ["key", { key: "key-other" }],
    ["commandHash", { commandHash: "9".repeat(64) }],
    ["createdAt", { createdAt: "2026-08-07T12:00:01.000Z" }],
    [
      "result",
      {
        result: {
          ...idempotencyEntry("transaction-1", "a".repeat(64)).result,
          newModuleRevision: "revision-other",
        },
      },
    ],
  ] as const)("rejects a completed replay with mismatched %s", async (_field, change) => {
    const harness = createHarness();
    const lease = await harness.store.acquire("module:a", "transaction-1");
    await prepareReadback(harness.store, "transaction-1", "module:a", lease!);
    const entry = idempotencyEntry("transaction-1", "a".repeat(64));
    await harness.store.finalize("transaction-1", lease!, entry);

    await expect(
      harness.store.finalize("transaction-1", lease!, { ...entry, ...change }),
    ).rejects.toThrow(
      "AREA_CREATE_IDEMPOTENCY_CONFLICT: Completed journal does not match the retained idempotency result.",
    );
  });

  it("keeps module and idempotency-key scopes isolated", async () => {
    const harness = createHarness();
    const lease = await harness.store.acquire("module:a", "transaction-1");
    await prepareReadback(harness.store, "transaction-1", "module:a", lease!);
    const entry = idempotencyEntry("transaction-1", "a".repeat(64));
    await harness.store.finalize("transaction-1", lease!, entry);

    expect(await harness.store.read("module:a", "key-1")).toEqual(entry);
    expect(await harness.store.read("module:other", "key-1")).toBeNull();
    expect(await harness.store.read("module:a", "key-other")).toBeNull();
  });

  it.each([
    ["moduleId", { moduleId: "module:corrupted" }],
    ["key", { key: "key-corrupted" }],
  ] as const)("rejects a completed replay when retained %s scope is corrupted", async (_field, change) => {
    const harness = createHarness();
    const lease = await harness.store.acquire("module:a", "transaction-1");
    await prepareReadback(harness.store, "transaction-1", "module:a", lease!);
    const entry = idempotencyEntry("transaction-1", "a".repeat(64));
    await harness.store.finalize("transaction-1", lease!, entry);
    const internals = harness.store as unknown as {
      idempotency: Map<string, typeof entry>;
    };
    const storageKey = Array.from(internals.idempotency.keys())[0];
    internals.idempotency.set(storageKey, { ...entry, ...change });

    await expect(
      harness.store.finalize("transaction-1", lease!, entry),
    ).rejects.toThrow(
      "AREA_CREATE_IDEMPOTENCY_CONFLICT: Completed journal does not match the retained idempotency result.",
    );
  });

  it("rolls back an idempotency conflict without completing the journal", async () => {
    const harness = createHarness();
    const firstLease = await harness.store.acquire("module:a", "transaction-1");
    await prepareReadback(harness.store, "transaction-1", "module:a", firstLease!);
    await harness.store.finalize(
      "transaction-1",
      firstLease!,
      idempotencyEntry("transaction-1", "a".repeat(64)),
    );
    await harness.store.release(firstLease!);

    const secondLease = await harness.store.acquire("module:a", "transaction-2");
    await prepareReadback(harness.store, "transaction-2", "module:a", secondLease!);
    await expect(
      harness.store.finalize(
        "transaction-2",
        secondLease!,
        idempotencyEntry("transaction-2", "a".repeat(64)),
      ),
    ).rejects.toThrow(
      "AREA_CREATE_IDEMPOTENCY_CONFLICT: Idempotency key is already retained for another Area Create result.",
    );

    expect((await harness.store.readJournal("transaction-2"))?.state).toBe(
      "readback_verified",
    );
    expect((await harness.store.read("module:a", "key-1"))?.commandHash).toBe(
      "a".repeat(64),
    );
  });

  it("lists expired recoverable journals oldest-first and excludes terminal states", async () => {
    const harness = createHarness();
    const first = await harness.store.acquire("module:a", "transaction-1");
    await harness.store.begin(journalRecord("transaction-1", "module:a", first!));
    harness.advance(1_000);
    const second = await harness.store.acquire("module:b", "transaction-2");
    await harness.store.begin(journalRecord("transaction-2", "module:b", second!));
    await harness.store.transition("transaction-2", "compensation_pending", second!);
    await harness.store.transition("transaction-2", "compensated", second!);

    harness.advance(30_001);
    const recoverable = await harness.store.listRecoverable(10);
    expect(recoverable.map((entry) => entry.transactionId)).toEqual(["transaction-1"]);
  });

  it("returns null for a missing journal and lists a released unresolved journal immediately", async () => {
    const harness = createHarness();
    expect(await harness.store.readJournal("transaction-missing")).toBeNull();
    const lease = await harness.store.acquire("module:a", "transaction-1");
    await harness.store.begin(journalRecord("transaction-1", "module:a", lease!));
    await harness.store.release(lease!);

    await expect(harness.store.listRecoverable(10)).resolves.toEqual([
      expect.objectContaining({ transactionId: "transaction-1" }),
    ]);
  });

  it("includes a journal at the exact lease expiry instant", async () => {
    const harness = createHarness();
    const lease = await harness.store.acquire("module:a", "transaction-1");
    await harness.store.begin(journalRecord("transaction-1", "module:a", lease!));
    harness.advance(30_000);

    expect((await harness.store.listRecoverable(10)).map((entry) => entry.transactionId)).toEqual([
      "transaction-1",
    ]);
  });

  it("sorts by creation time then transaction ID and enforces the requested result limit", async () => {
    const harness = createHarness();
    for (const [moduleId, transactionId] of [
      ["module:z", "transaction-z"],
      ["module:a", "transaction-a"],
      ["module:m", "transaction-m"],
    ] as const) {
      const lease = await harness.store.acquire(moduleId, transactionId);
      await harness.store.begin(journalRecord(transactionId, moduleId, lease!));
    }
    harness.advance(30_001);

    expect((await harness.store.listRecoverable(2)).map((entry) => entry.transactionId)).toEqual([
      "transaction-a",
      "transaction-m",
    ]);
    expect((await harness.store.listRecoverable(0)).map((entry) => entry.transactionId)).toEqual([
      "transaction-a",
    ]);
  });

  it("recovers a durable journal even if its lock row is missing", async () => {
    const harness = createHarness();
    const lease = await harness.store.acquire("module:a", "transaction-1");
    await harness.store.begin(journalRecord("transaction-1", "module:a", lease!));
    const internals = harness.store as unknown as { locks: Map<string, unknown> };
    internals.locks.delete("module:a");

    expect((await harness.store.listRecoverable(10)).map((entry) => entry.transactionId)).toEqual([
      "transaction-1",
    ]);
  });
});

describe("Area Create journal policy", () => {
  const states: readonly AreaCreateJournalState[] = [
    "prepared",
    "staged",
    "resources_committed",
    "ifo_committed",
    "readback_verified",
    "complete",
    "compensation_pending",
    "compensated",
    "quarantine_required",
  ];

  it("classifies every state independently for blocking and recovery", () => {
    expect(
      Object.fromEntries(
        states.map((state) => [
          state,
          {
            blocking: isAreaCreateJournalBlocking(state),
            recoverable: isAreaCreateJournalRecoverable(state),
          },
        ]),
      ),
    ).toEqual({
      prepared: { blocking: true, recoverable: true },
      staged: { blocking: true, recoverable: true },
      resources_committed: { blocking: true, recoverable: true },
      ifo_committed: { blocking: true, recoverable: true },
      readback_verified: { blocking: true, recoverable: true },
      complete: { blocking: false, recoverable: false },
      compensation_pending: { blocking: true, recoverable: true },
      compensated: { blocking: false, recoverable: false },
      quarantine_required: { blocking: true, recoverable: false },
    });
  });

  it("allows idempotent transitions but makes every terminal state absorbing", () => {
    for (const state of states) {
      expect(canTransitionAreaCreateJournal(state, state)).toBe(true);
    }
    for (const terminal of [
      "complete",
      "compensated",
      "quarantine_required",
    ] as const) {
      for (const next of states.filter((state) => state !== terminal)) {
        expect(canTransitionAreaCreateJournal(terminal, next)).toBe(false);
      }
    }
  });
});

async function prepareReadback(
  store: MemoryAreaCreateControlStore,
  transactionId: string,
  moduleId: string,
  lease: NonNullable<Awaited<ReturnType<MemoryAreaCreateControlStore["acquire"]>>>,
) {
  await store.begin(journalRecord(transactionId, moduleId, lease));
  for (const state of [
    "staged",
    "resources_committed",
    "ifo_committed",
  ] as const) {
    await store.transition(transactionId, state, lease);
  }
  await store.recordReadback(
    transactionId,
    lease,
    receipt(transactionId, "a".repeat(64)),
  );
}

function journalRecord(
  transactionId: string,
  moduleId: string,
  lease: {
    leaseId: string;
    fencingToken: number;
  },
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
          key: "modules/a/area_new.are",
          fileName: "area_new.are",
          resourceType: 2012,
          bytes: Buffer.from("are"),
          size: 3,
          sha256: "a".repeat(64),
        },
      ],
      moduleIfo: {
        key: "modules/a/module.ifo",
        fileName: "module.ifo",
        resourceType: 2014,
        baselineBytes: Buffer.from("before"),
        baselineSha256: "b".repeat(64),
        candidateBytes: Buffer.from("after"),
        candidateSha256: "c".repeat(64),
      },
    },
    createdAt: "2026-08-07T12:00:00.000Z",
  };
}

function idempotencyEntry(
  transactionId: string,
  commandHash: string,
) {
  return createAreaCreateIdempotencyEntry({
    moduleId: "module:a",
    key: "key-1",
    commandHash,
    createdAt: "2026-08-07T12:00:00.000Z",
    result: receipt(transactionId, commandHash),
  });
}

function receipt(transactionId: string, commandHash: string): AreaCreateReceipt {
  return {
    schemaVersion: "area-create-receipt.v1",
    transactionId,
    areaId: "area_new",
    resRef: "area_new",
    name: "Area",
    tag: "Area_Tag",
    moduleId: "module:a",
    previousModuleRevision: "revision-7",
    newModuleRevision: "revision-8",
    profileId: "profile-v1",
    profileFingerprintSha256: "d".repeat(64),
    setFingerprintSha256: "e".repeat(64),
    tileProductionAdmission: areaTileProductionAdmissionFixture(),
    draftNormalizedSha256: "f".repeat(64),
    commandHash,
    validatorVersion: "validator-v1",
    resources: [],
    moduleIfo: { key: "module.ifo", size: 1, sha256: "b".repeat(64) },
    readbackStatus: "verified",
    warnings: [],
    createdAt: "2026-08-07T12:00:00.000Z",
  };
}
