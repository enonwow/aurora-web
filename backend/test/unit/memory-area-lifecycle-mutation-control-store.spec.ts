import { MemoryAreaCreateControlStore } from "../../src/modules/areas/adapters/outbound/memory/memory-area-create-control-store";
import { MemoryAreaLifecycleMutationControlStore } from "../../src/modules/areas/adapters/outbound/memory/memory-area-lifecycle-mutation-control-store";
import { createAreaCreateIdempotencyEntry } from "../../src/modules/areas/domain/area-create-idempotency";
import type {
  AreaUpdateJournalRecord,
  AreaUpdateReceipt,
} from "../../src/modules/areas/domain/area-update-transaction.types";
import { areaTileProductionAdmissionFixture } from "./helpers/area-tile-production-admission-fixture";

describe("Memory Area lifecycle mutation control store", () => {
  it("blocks all normal module writers and transfers exact recovery to the Update journal", async () => {
    const harness = createHarness();
    const lease = await harness.locks.acquire("module:a", "update-1");
    await harness.store.begin(journalRecord("update-1", lease!));
    await harness.store.transition("update-1", "staged", lease!);
    await harness.locks.release(lease!);

    await expect(harness.locks.acquire("module:a", "create-2")).resolves.toBeNull();
    await expect(
      harness.locks.acquire("module:a", "recovery-wrong", {
        recoveryOfTransactionId: "update-other",
      }),
    ).resolves.toBeNull();

    const recovery = await harness.locks.acquire("module:a", "recovery-1", {
      recoveryOfTransactionId: "update-1",
    });
    expect(recovery).toEqual(
      expect.objectContaining({
        ownerTransactionId: "update-1",
        fencingToken: 2,
      }),
    );
    expect(await harness.store.readJournal("update-1")).toEqual(
      expect.objectContaining({
        leaseId: recovery?.leaseId,
        fencingToken: recovery?.fencingToken,
      }),
    );
  });

  it("retains a byte-free candidate manifest and atomically finalizes the receipt", async () => {
    const harness = createHarness();
    const lease = await harness.locks.acquire("module:a", "update-1");
    await harness.store.begin(journalRecord("update-1", lease!));
    const prepared = await harness.store.readJournal("update-1");

    expect(prepared?.candidateManifest).toEqual({
      areaId: "crypt01",
      tileProductionAdmission: areaTileProductionAdmissionFixture("tin01"),
      resources: [
        {
          extension: "are",
          key: "crypt01.are",
          fileName: "crypt01.are",
          resourceType: 2012,
          size: 3,
          sha256: "b".repeat(64),
        },
      ],
      moduleIfo: {
        key: "module.ifo",
        fileName: "module.ifo",
        resourceType: 2014,
        baselineSize: 10,
        baselineSha256: "9".repeat(64),
        candidateSize: 9,
        candidateSha256: "9".repeat(64),
      },
    });
    expect(JSON.stringify(prepared)).not.toContain("are-bytes");
    expect(JSON.stringify(prepared)).not.toContain("ifo-before");
    expect(JSON.stringify(prepared)).not.toContain("ifo-after");

    for (const state of ["staged", "resources_committed", "ifo_committed"] as const) {
      await harness.store.transition("update-1", state, lease!);
    }
    const verified = receipt("update-1");
    await harness.store.recordReadback("update-1", lease!, verified);
    const entry = createAreaCreateIdempotencyEntry({
      moduleId: "module:a",
      key: "update-key-1",
      commandHash: "7".repeat(64),
      createdAt: "2026-08-12T12:00:00.000Z",
      result: verified,
    });
    await harness.store.finalize("update-1", lease!, entry);
    await harness.store.finalize("update-1", lease!, entry);

    expect((await harness.store.readJournal("update-1"))?.state).toBe("complete");
    expect(await harness.store.read("module:a", "update-key-1")).toEqual(entry);
    await harness.locks.release(lease!);
    await expect(harness.locks.acquire("module:a", "create-2")).resolves.toEqual(
      expect.objectContaining({ ownerTransactionId: "create-2" }),
    );
  });

  it("rejects receipt identity drift and invalid finalization order", async () => {
    const harness = createHarness();
    const lease = await harness.locks.acquire("module:a", "update-1");
    await harness.store.begin(journalRecord("update-1", lease!));
    const entry = createAreaCreateIdempotencyEntry({
      moduleId: "module:a",
      key: "update-key-1",
      commandHash: "7".repeat(64),
      createdAt: "2026-08-12T12:00:00.000Z",
      result: receipt("update-1"),
    });

    await expect(harness.store.finalize("update-1", lease!, entry)).rejects.toThrow(
      "AREA_UPDATE_JOURNAL_TRANSITION_INVALID",
    );
    for (const state of ["staged", "resources_committed", "ifo_committed"] as const) {
      await harness.store.transition("update-1", state, lease!);
    }
    await expect(
      harness.store.recordReadback("update-1", lease!, {
        ...receipt("update-1"),
        areaResRef: "other",
      }),
    ).rejects.toThrow("AREA_UPDATE_READBACK_CONFLICT");
  });

  it("lists only released or expired recoverable Update journals in deterministic order", async () => {
    const harness = createHarness();
    for (const [moduleId, transactionId] of [
      ["module:b", "update-b"],
      ["module:a", "update-a"],
    ] as const) {
      const lease = await harness.locks.acquire(moduleId, transactionId);
      await harness.store.begin(journalRecord(transactionId, lease!, moduleId));
      await harness.locks.release(lease!);
    }

    expect((await harness.store.listRecoverable(10)).map((entry) => entry.transactionId)).toEqual([
      "update-a",
      "update-b",
    ]);
  });

  it("makes only an exact begin replay idempotent and rejects transaction identity reuse", async () => {
    const harness = createHarness();
    const lease = await harness.locks.acquire("module:a", "update-1");
    const original = journalRecord("update-1", lease!);
    await harness.store.begin(original);
    await expect(harness.store.begin(original)).resolves.toBeUndefined();

    await expect(harness.store.begin({
      ...original,
      areaResRef: "other",
    })).rejects.toThrow("AREA_UPDATE_JOURNAL_CONFLICT");
    expect((await harness.store.readJournal("update-1"))?.areaResRef).toBe("crypt01");
    await expect(harness.store.readJournal("missing")).resolves.toBeNull();
  });

  it("enforces the journal graph, exact fencing lease, and idempotent same-state transitions", async () => {
    const harness = createHarness();
    const lease = await harness.locks.acquire("module:a", "update-1");
    await harness.store.begin(journalRecord("update-1", lease!));

    await expect(
      harness.store.transition("update-1", "resources_committed", lease!),
    ).rejects.toThrow("AREA_UPDATE_JOURNAL_TRANSITION_INVALID");
    await harness.store.transition("update-1", "staged", lease!);
    const once = await harness.store.readJournal("update-1");
    await harness.store.transition("update-1", "staged", lease!);
    expect((await harness.store.readJournal("update-1"))?.updatedAt).toBe(once?.updatedAt);

    await expect(harness.store.transition("missing", "staged", lease!)).rejects.toThrow(
      "AREA_UPDATE_JOURNAL_MISSING",
    );
    await expect(harness.store.transition("update-1", "resources_committed", {
      ...lease!,
      leaseId: "stale-lease",
    })).rejects.toThrow("AREA_CREATE_CONTROL_FENCED");
  });

  it("records readback only after IFO publication and accepts only the exact receipt replay", async () => {
    const harness = createHarness();
    const lease = await harness.locks.acquire("module:a", "update-1");
    await harness.store.begin(journalRecord("update-1", lease!));
    const verified = receipt("update-1");
    await expect(harness.store.recordReadback("update-1", lease!, verified)).rejects.toThrow(
      "AREA_UPDATE_JOURNAL_TRANSITION_INVALID",
    );
    for (const state of ["staged", "resources_committed", "ifo_committed"] as const) {
      await harness.store.transition("update-1", state, lease!);
    }
    await harness.store.recordReadback("update-1", lease!, verified);
    await expect(harness.store.recordReadback("update-1", lease!, verified)).resolves.toBeUndefined();
    await expect(harness.store.recordReadback("update-1", lease!, {
      ...verified,
      newModuleRevision: "3".repeat(64),
    })).rejects.toThrow("AREA_UPDATE_READBACK_CONFLICT");
  });

  it.each([
    ["transactionId", "other"],
    ["moduleId", "module:other"],
    ["areaResRef", "other"],
    ["commandHash", "0".repeat(64)],
    ["previousModuleRevision", "0".repeat(64)],
    ["sourceAreaSha256", "0".repeat(64)],
    ["candidateAreaSha256", "0".repeat(64)],
    ["setFingerprintSha256", "0".repeat(64)],
    [
      "tileProductionAdmission",
      {
        ...areaTileProductionAdmissionFixture("tin01"),
        tileIdSetSha256: "0".repeat(64),
      },
    ],
    ["readbackStatus", "failed"],
  ] as const)("rejects readback identity drift in %s", async (field, value) => {
    const harness = createHarness();
    const lease = await harness.locks.acquire("module:a", "update-1");
    await harness.store.begin(journalRecord("update-1", lease!));
    for (const state of ["staged", "resources_committed", "ifo_committed"] as const) {
      await harness.store.transition("update-1", state, lease!);
    }
    await expect(harness.store.recordReadback("update-1", lease!, {
      ...receipt("update-1"),
      [field]: value,
    } as AreaUpdateReceipt)).rejects.toThrow("AREA_UPDATE_READBACK_CONFLICT");
  });

  it.each([
    ["revision", 4],
    ["normalizedSha256", "0".repeat(64)],
  ] as const)("rejects readback draft identity drift in %s", async (field, value) => {
    const harness = createHarness();
    const lease = await harness.locks.acquire("module:a", "update-1");
    await harness.store.begin(journalRecord("update-1", lease!));
    for (const state of ["staged", "resources_committed", "ifo_committed"] as const) {
      await harness.store.transition("update-1", state, lease!);
    }
    const verified = receipt("update-1");
    await expect(harness.store.recordReadback("update-1", lease!, {
      ...verified,
      draft: { ...verified.draft, [field]: value },
    })).rejects.toThrow("AREA_UPDATE_READBACK_CONFLICT");
  });

  it("rejects out-of-scope finalization and an idempotency result collision", async () => {
    const harness = createHarness();
    const lease = await harness.locks.acquire("module:a", "update-1");
    await harness.store.begin(journalRecord("update-1", lease!));
    for (const state of ["staged", "resources_committed", "ifo_committed"] as const) {
      await harness.store.transition("update-1", state, lease!);
    }
    const verified = receipt("update-1");
    await harness.store.recordReadback("update-1", lease!, verified);
    const entry = createAreaCreateIdempotencyEntry({
      moduleId: "module:a",
      key: "update-key-1",
      commandHash: "7".repeat(64),
      createdAt: verified.updatedAt,
      result: verified,
    });

    await expect(harness.store.finalize("update-1", lease!, {
      ...entry,
      key: "other-key",
    })).rejects.toThrow("AREA_UPDATE_IDEMPOTENCY_CONFLICT");
    await expect(harness.store.finalize("update-1", lease!, {
      ...entry,
      result: { ...verified, newModuleRevision: "3".repeat(64) },
    })).rejects.toThrow("AREA_UPDATE_IDEMPOTENCY_CONFLICT");

    await harness.store.finalize("update-1", lease!, entry);
    await expect(harness.store.finalize("update-1", lease!, {
      ...entry,
      createdAt: "2026-08-12T12:00:01.000Z",
    })).rejects.toThrow("AREA_UPDATE_IDEMPOTENCY_CONFLICT");
  });

  it("excludes active and terminal journals, clamps the recovery limit, and rejects invalid transfers", async () => {
    const harness = createHarness();
    const active = await harness.locks.acquire("module:a", "update-a");
    await harness.store.begin(journalRecord("update-a", active!));
    expect(await harness.store.listRecoverable(0)).toEqual([]);
    expect(harness.store.transferRecoveryLease("missing", active!)).toBe(false);
    expect(harness.store.transferRecoveryLease("update-a", {
      ...active!,
      moduleId: "module:other",
    })).toBe(false);
    await harness.locks.release(active!);
    expect((await harness.store.listRecoverable(0)).map((entry) => entry.transactionId)).toEqual([
      "update-a",
    ]);

    const recovery = await harness.locks.acquire("module:a", "recovery", {
      recoveryOfTransactionId: "update-a",
    });
    await harness.store.transition("update-a", "compensation_pending", recovery!);
    await harness.store.transition("update-a", "compensated", recovery!);
    await harness.locks.release(recovery!);
    expect(await harness.store.listRecoverable(10)).toEqual([]);
  });
});

function createHarness() {
  let nowMs = Date.parse("2026-08-12T12:00:00.000Z");
  let sequence = 0;
  const locks = new MemoryAreaCreateControlStore({
    leaseDurationMs: 30_000,
    now: () => new Date(nowMs),
    nextLeaseId: () => `lease-${++sequence}`,
  });
  const store = new MemoryAreaLifecycleMutationControlStore(locks, {
    now: () => new Date(nowMs),
  });
  return { locks, store, advance: (ms: number) => { nowMs += ms; } };
}

function journalRecord(
  transactionId: string,
  lease: Readonly<{ leaseId: string; fencingToken: number }>,
  moduleId = "module:a",
): AreaUpdateJournalRecord {
  return {
    transactionId,
    moduleId,
    areaResRef: "crypt01",
    actorId: "actor-1",
    idempotencyKey: "update-key-1",
    commandHash: "7".repeat(64),
    expectedModuleRevision: "1".repeat(64),
    sourceAreaSha256: "a".repeat(64),
    candidateAreaSha256: "b".repeat(64),
    setFingerprintSha256: "e".repeat(64),
    tileProductionAdmission: areaTileProductionAdmissionFixture("tin01"),
    draftRevision: 3,
    draftNormalizedSha256: "d".repeat(64),
    leaseId: lease.leaseId,
    fencingToken: lease.fencingToken,
    candidate: {
      areaId: "crypt01",
      sourceAreaSha256: "a".repeat(64),
      candidateAreaSha256: "b".repeat(64),
      setFingerprintSha256: "e".repeat(64),
      projectedDraft: {
        areaResRef: "crypt01",
        name: "Crypt",
        width: 2,
        height: 2,
        tilesetResRef: "tin01",
        tilesetFingerprint: "e".repeat(64),
        areaFingerprint: "a".repeat(64),
        tiles: [],
      },
      unchangedCompanions: {
        gitSha256: "c".repeat(64),
        gicSha256: "f".repeat(64),
        moduleIfoSha256: "9".repeat(64),
      },
      resources: [
        {
          extension: "are",
          key: "crypt01.are",
          fileName: "crypt01.are",
          resourceType: 2012,
          bytes: Buffer.from("are-bytes"),
          size: 3,
          sha256: "b".repeat(64),
        },
      ],
      moduleIfo: {
        key: "module.ifo",
        fileName: "module.ifo",
        resourceType: 2014,
        baselineBytes: Buffer.from("ifo-before"),
        baselineSha256: "9".repeat(64),
        candidateBytes: Buffer.from("ifo-after"),
        candidateSha256: "9".repeat(64),
      },
    },
    createdAt: "2026-08-12T12:00:00.000Z",
  };
}

function receipt(transactionId: string): AreaUpdateReceipt {
  return {
    schemaVersion: "area-update-receipt.v1",
    transactionId,
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
