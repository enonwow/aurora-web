import { MemoryAreaCreateControlStore } from "../../src/modules/areas/adapters/outbound/memory/memory-area-create-control-store";
import { MemoryAreaDeleteControlStore } from "../../src/modules/areas/adapters/outbound/memory/memory-area-delete-control-store";
import { createAreaCreateIdempotencyEntry } from "../../src/modules/areas/domain/area-create-idempotency";
import type {
  AreaDeleteJournalRecord,
  AreaDeleteReceipt,
} from "../../src/modules/areas/domain/area-delete-transaction.types";

describe("Memory Area Delete control store", () => {
  it("retains a byte-free manifest, blocks other writers, and transfers recovery ownership", async () => {
    const harness = createHarness();
    const lease = await harness.locks.acquire("module:a", "delete-1");
    await harness.store.begin(journalRecord(lease!));
    await harness.store.transition("delete-1", "staged", lease!);
    await harness.locks.release(lease!);

    const durable = await harness.store.readJournal("delete-1");
    expect(durable?.candidateManifest).toEqual(expect.objectContaining({
      areaId: "crypt01",
      previewSha256: "6".repeat(64),
      survivorCount: 4,
      removedResources: [
        expect.objectContaining({ fileName: "crypt01.are", sha256: "a".repeat(64) }),
      ],
    }));
    expect(JSON.stringify(durable)).not.toContain("removed-bytes");
    expect(JSON.stringify(durable)).not.toContain("ifo-before");
    expect(JSON.stringify(durable)).not.toContain("ifo-after");
    await expect(harness.locks.acquire("module:a", "update-2")).resolves.toBeNull();

    const recovery = await harness.locks.acquire("module:a", "recovery", {
      recoveryOfTransactionId: "delete-1",
    });
    expect(recovery).toEqual(expect.objectContaining({ ownerTransactionId: "delete-1" }));
    expect(await harness.store.readJournal("delete-1")).toEqual(expect.objectContaining({
      leaseId: recovery?.leaseId,
      fencingToken: recovery?.fencingToken,
    }));
  });

  it("records only an exact verified receipt and atomically finalizes idempotency", async () => {
    const harness = createHarness();
    const lease = await harness.locks.acquire("module:a", "delete-1");
    await harness.store.begin(journalRecord(lease!));
    for (const state of ["staged", "resources_committed", "ifo_committed"] as const) {
      await harness.store.transition("delete-1", state, lease!);
    }
    const verified = receipt();
    await harness.store.recordReadback("delete-1", lease!, verified);
    await expect(harness.store.recordReadback("delete-1", lease!, {
      ...verified,
      previewSha256: "0".repeat(64),
    })).rejects.toThrow("AREA_DELETE_READBACK_CONFLICT");
    const entry = createAreaCreateIdempotencyEntry({
      moduleId: "module:a",
      key: "delete-key-1",
      commandHash: "7".repeat(64),
      createdAt: verified.deletedAt,
      result: verified,
    });
    await harness.store.finalize("delete-1", lease!, entry);
    await harness.store.finalize("delete-1", lease!, entry);
    expect(await harness.store.read("module:a", "delete-key-1")).toEqual(entry);
    expect((await harness.store.readJournal("delete-1"))?.state).toBe("complete");
  });

  it("enforces transition ordering, fencing, and transaction identity", async () => {
    const harness = createHarness();
    const lease = await harness.locks.acquire("module:a", "delete-1");
    const original = journalRecord(lease!);
    await harness.store.begin(original);
    await expect(harness.store.begin(original)).resolves.toBeUndefined();
    await expect(harness.store.begin({ ...original, areaResRef: "other" })).rejects.toThrow(
      "AREA_DELETE_JOURNAL_CONFLICT",
    );
    await expect(
      harness.store.transition("delete-1", "resources_committed", lease!),
    ).rejects.toThrow("AREA_DELETE_JOURNAL_TRANSITION_INVALID");
    await expect(harness.store.transition("delete-1", "staged", {
      ...lease!, leaseId: "stale",
    })).rejects.toThrow("AREA_CREATE_CONTROL_FENCED");
  });

  it("lists only released recoverable journals and releases blocking after compensation", async () => {
    const harness = createHarness();
    const lease = await harness.locks.acquire("module:a", "delete-1");
    await harness.store.begin(journalRecord(lease!));
    expect(await harness.store.listRecoverable(10)).toEqual([]);
    await harness.locks.release(lease!);
    expect((await harness.store.listRecoverable(10)).map((entry) => entry.transactionId)).toEqual([
      "delete-1",
    ]);
    const recovery = await harness.locks.acquire("module:a", "recovery", {
      recoveryOfTransactionId: "delete-1",
    });
    await harness.store.transition("delete-1", "compensation_pending", recovery!);
    await harness.store.transition("delete-1", "compensated", recovery!);
    await harness.locks.release(recovery!);
    await expect(harness.locks.acquire("module:a", "create-2")).resolves.toEqual(
      expect.objectContaining({ ownerTransactionId: "create-2" }),
    );
  });

  it("retains the complete recovery manifest identity and deterministic timestamps", async () => {
    const harness = createHarness();
    const lease = await harness.locks.acquire("module:a", "delete-1");
    await harness.store.begin(journalRecord(lease!));
    const durable = await harness.store.readJournal("delete-1");
    expect(durable).toEqual({
      transactionId: "delete-1",
      moduleId: "module:a",
      areaResRef: "crypt01",
      actorId: "actor-1",
      idempotencyKey: "delete-key-1",
      commandHash: "7".repeat(64),
      expectedModuleRevision: "1".repeat(64),
      previewSha256: "6".repeat(64),
      leaseId: lease!.leaseId,
      fencingToken: lease!.fencingToken,
      state: "prepared",
      candidateManifest: {
        areaId: "crypt01",
        previewSha256: "6".repeat(64),
        removedResources: [{
          extension: "are", key: "crypt01.are", fileName: "crypt01.are",
          resourceType: 2012, size: Buffer.byteLength("removed-bytes"),
          sha256: "a".repeat(64),
        }],
        moduleIfo: {
          key: "module.ifo", fileName: "module.ifo", resourceType: 2014,
          baselineSize: Buffer.byteLength("ifo-before"), baselineSha256: "9".repeat(64),
          candidateSize: Buffer.byteLength("ifo-after"), candidateSha256: "8".repeat(64),
        },
        survivorCount: 4,
      },
      diagnostics: [],
      createdAt: "2026-08-12T21:00:00.000Z",
      updatedAt: "2026-08-12T21:00:00.000Z",
    });
    await expect(harness.store.readJournal("missing")).resolves.toBeNull();
    await expect(harness.store.read("module:a", "missing")).resolves.toBeNull();
  });

  it("allows same-state replay but rejects missing journals and every invalid graph edge", async () => {
    const harness = createHarness();
    const lease = await harness.locks.acquire("module:a", "delete-1");
    await harness.store.begin(journalRecord(lease!));
    const prepared = await harness.store.readJournal("delete-1");
    await harness.store.transition("delete-1", "prepared", lease!);
    expect((await harness.store.readJournal("delete-1"))?.updatedAt).toBe(prepared?.updatedAt);
    await expect(harness.store.transition("missing", "staged", lease!)).rejects.toThrow(
      "AREA_DELETE_JOURNAL_MISSING",
    );
    for (const state of ["resources_committed", "ifo_committed", "readback_verified", "complete"] as const) {
      await expect(harness.store.transition("delete-1", state, lease!)).rejects.toThrow(
        "AREA_DELETE_JOURNAL_TRANSITION_INVALID",
      );
    }
  });

  it("records readback only after publication and accepts only the byte-identical replay", async () => {
    const harness = createHarness();
    const lease = await harness.locks.acquire("module:a", "delete-1");
    await harness.store.begin(journalRecord(lease!));
    await expect(harness.store.recordReadback("delete-1", lease!, receipt())).rejects.toThrow(
      "AREA_DELETE_JOURNAL_TRANSITION_INVALID",
    );
    for (const state of ["staged", "resources_committed", "ifo_committed"] as const) {
      await harness.store.transition("delete-1", state, lease!);
    }
    await harness.store.recordReadback("delete-1", lease!, receipt());
    await expect(harness.store.recordReadback("delete-1", lease!, receipt()))
      .resolves.toBeUndefined();
    await expect(harness.store.recordReadback("delete-1", lease!, {
      ...receipt(), newModuleRevision: "3".repeat(64),
    })).rejects.toThrow("AREA_DELETE_READBACK_CONFLICT");
  });

  it.each([
    ["transactionId", "other"],
    ["moduleId", "module:other"],
    ["areaResRef", "other"],
    ["commandHash", "0".repeat(64)],
    ["previousModuleRevision", "0".repeat(64)],
    ["previewSha256", "0".repeat(64)],
    ["scanVersion", "other"],
    ["survivorCount", 5],
    ["blockerCount", 1],
    ["readbackStatus", "failed"],
  ] as const)("rejects readback identity drift in %s", async (field, value) => {
    const harness = createHarness();
    const lease = await harness.locks.acquire("module:a", "delete-1");
    await harness.store.begin(journalRecord(lease!));
    for (const state of ["staged", "resources_committed", "ifo_committed"] as const) {
      await harness.store.transition("delete-1", state, lease!);
    }
    await expect(harness.store.recordReadback("delete-1", lease!, {
      ...receipt(), [field]: value,
    } as AreaDeleteReceipt)).rejects.toThrow("AREA_DELETE_READBACK_CONFLICT");
  });

  it("rejects finalization order, scope drift, result drift, and completed-result collision", async () => {
    const harness = createHarness();
    const lease = await harness.locks.acquire("module:a", "delete-1");
    await harness.store.begin(journalRecord(lease!));
    const verified = receipt();
    const entry = createAreaCreateIdempotencyEntry({
      moduleId: "module:a", key: "delete-key-1", commandHash: "7".repeat(64),
      createdAt: verified.deletedAt, result: verified,
    });
    await expect(harness.store.finalize("delete-1", lease!, entry)).rejects.toThrow(
      "AREA_DELETE_JOURNAL_TRANSITION_INVALID",
    );
    for (const state of ["staged", "resources_committed", "ifo_committed"] as const) {
      await harness.store.transition("delete-1", state, lease!);
    }
    await harness.store.recordReadback("delete-1", lease!, verified);
    for (const changed of [
      { ...entry, moduleId: "module:other" },
      { ...entry, key: "other" },
      { ...entry, commandHash: "0".repeat(64) },
      { ...entry, result: { ...verified, transactionId: "other" } },
      { ...entry, result: { ...verified, newModuleRevision: "3".repeat(64) } },
    ]) {
      await expect(harness.store.finalize("delete-1", lease!, changed))
        .rejects.toThrow("AREA_DELETE_IDEMPOTENCY_CONFLICT");
    }
    await harness.store.finalize("delete-1", lease!, entry);
    await expect(harness.store.finalize("delete-1", lease!, {
      ...entry, createdAt: "2026-08-12T21:00:01.000Z",
    })).rejects.toThrow("AREA_DELETE_IDEMPOTENCY_CONFLICT");
  });

  it("sorts released recovery work and rejects invalid recovery transfers", async () => {
    const harness = createHarness();
    for (const [moduleId, transactionId] of [["module:b", "delete-b"], ["module:a", "delete-a"]] as const) {
      const lease = await harness.locks.acquire(moduleId, transactionId);
      await harness.store.begin({
        ...journalRecord(lease!), moduleId, transactionId,
      });
      await harness.locks.release(lease!);
    }
    expect((await harness.store.listRecoverable(0)).map((entry) => entry.transactionId)).toEqual([
      "delete-a",
    ]);
    const unrelated = await harness.locks.acquire("module:c", "other");
    expect(harness.store.transferRecoveryLease("missing", unrelated!)).toBe(false);
    expect(harness.store.transferRecoveryLease("delete-a", unrelated!)).toBe(false);
  });
});

function createHarness() {
  let sequence = 0;
  const now = () => new Date("2026-08-12T21:00:00.000Z");
  const locks = new MemoryAreaCreateControlStore({
    now,
    leaseDurationMs: 30_000,
    nextLeaseId: () => `lease-${++sequence}`,
  });
  return { locks, store: new MemoryAreaDeleteControlStore(locks, { now }) };
}

function journalRecord(
  lease: Readonly<{ leaseId: string; fencingToken: number }>,
): AreaDeleteJournalRecord {
  const removed = Buffer.from("removed-bytes");
  return {
    transactionId: "delete-1",
    moduleId: "module:a",
    areaResRef: "crypt01",
    actorId: "actor-1",
    idempotencyKey: "delete-key-1",
    commandHash: "7".repeat(64),
    expectedModuleRevision: "1".repeat(64),
    previewSha256: "6".repeat(64),
    leaseId: lease.leaseId,
    fencingToken: lease.fencingToken,
    candidate: {
      areaId: "crypt01",
      preview: {
        schemaVersion: "area-delete-preview.v1",
        scanVersion: "area-delete-impact-scan.v1",
        moduleId: "module:a",
        areaResRef: "crypt01",
        moduleRevision: "1".repeat(64),
        targetResources: [],
        moduleIfo: { logicalKey: "module.ifo", resourceType: 2014, size: 10, sha256: "9".repeat(64) },
        membershipCount: 1,
        entryAreaResRef: "keep",
        findings: [], blockerCount: 0, warningCount: 0,
        previewSha256: "6".repeat(64),
        expiresAt: "2026-08-12T21:05:00.000Z",
      },
      removedResources: [{
        extension: "are", key: "crypt01.are", fileName: "crypt01.are",
        resourceType: 2012, bytes: removed, size: removed.length, sha256: "a".repeat(64),
      }],
      moduleIfo: {
        key: "module.ifo", fileName: "module.ifo", resourceType: 2014,
        baselineBytes: Buffer.from("ifo-before"), baselineSha256: "9".repeat(64),
        candidateBytes: Buffer.from("ifo-after"), candidateSha256: "8".repeat(64),
      },
      survivorCount: 4,
    },
    createdAt: "2026-08-12T21:00:00.000Z",
  };
}

function receipt(): AreaDeleteReceipt {
  return {
    schemaVersion: "area-delete-receipt.v1",
    transactionId: "delete-1",
    areaResRef: "crypt01",
    moduleId: "module:a",
    previousModuleRevision: "1".repeat(64),
    newModuleRevision: "2".repeat(64),
    commandHash: "7".repeat(64),
    previewSha256: "6".repeat(64),
    scanVersion: "area-delete-impact-scan.v1",
    removedResources: [],
    moduleIfo: {
      key: "module.ifo", baselineSha256: "9".repeat(64),
      candidateSha256: "8".repeat(64), size: 9,
    },
    survivorCount: 4,
    blockerCount: 0,
    readbackStatus: "verified",
    warnings: [],
    deletedAt: "2026-08-12T21:00:00.000Z",
  };
}
