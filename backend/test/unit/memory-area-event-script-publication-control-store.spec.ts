import { createHash } from "node:crypto";
import { MemoryAreaCreateControlStore } from "../../src/modules/areas/adapters/outbound/memory/memory-area-create-control-store";
import { MemoryAreaEventScriptPublicationControlStore } from "../../src/modules/areas/adapters/outbound/memory/memory-area-event-script-publication-control-store";
import { createAreaCreateIdempotencyEntry } from "../../src/modules/areas/domain/area-create-idempotency";
import type {
  AreaEventScriptPublicationCandidate,
  AreaEventScriptPublicationReceipt,
} from "../../src/modules/areas/domain/area-event-script-publication.types";

const MODULE_ID = "module:test";
const TRANSACTION_ID = "script-tx-1";
const NOW = "2026-08-26T12:00:00.000Z";

describe("memory Area event-script publication control store", () => {
  it("retains a byte-free journal, enforces transitions, and atomically finalizes idempotency", async () => {
    const clock = { value: new Date(NOW) };
    const locks = new MemoryAreaCreateControlStore({
      now: () => clock.value,
      nextLeaseId: () => "lease-1",
    });
    const store = new MemoryAreaEventScriptPublicationControlStore(locks, {
      now: () => clock.value,
    });
    const lease = await locks.acquire(MODULE_ID, TRANSACTION_ID);
    expect(lease).not.toBeNull();
    const candidate = candidateFixture();

    await store.begin({
      transactionId: TRANSACTION_ID,
      moduleId: MODULE_ID,
      targetResRef: "area_enter",
      actorId: "admin-1",
      idempotencyKey: "publish-1",
      commandHash: "a".repeat(64),
      expectedModuleRevision: "b".repeat(64),
      leaseId: lease!.leaseId,
      fencingToken: lease!.fencingToken,
      candidate,
      createdAt: NOW,
    });
    const prepared = await store.readJournal(TRANSACTION_ID);
    expect(prepared?.state).toBe("prepared");
    expect(JSON.stringify(prepared)).not.toContain("source-bytes");
    expect(prepared?.candidateManifest.resources).toHaveLength(3);

    for (const state of [
      "staged",
      "resources_committed",
      "ifo_committed",
    ] as const) {
      await store.transition(TRANSACTION_ID, state, lease!);
    }
    const receipt = receiptFixture(candidate);
    await store.recordReadback(TRANSACTION_ID, lease!, receipt);
    const retained = createAreaCreateIdempotencyEntry({
      moduleId: MODULE_ID,
      key: "publish-1",
      commandHash: "a".repeat(64),
      createdAt: NOW,
      result: receipt,
    });
    await store.finalize(TRANSACTION_ID, lease!, retained);

    expect((await store.readJournal(TRANSACTION_ID))?.state).toBe("complete");
    expect(await store.read(MODULE_ID, "publish-1")).toEqual(retained);
    await expect(store.finalize(TRANSACTION_ID, lease!, retained)).resolves.toBeUndefined();
  });

  it("participates in the shared module blocking/recovery lease protocol", async () => {
    const clock = { value: new Date(NOW) };
    let leaseOrdinal = 0;
    const locks = new MemoryAreaCreateControlStore({
      leaseDurationMs: 1_000,
      now: () => clock.value,
      nextLeaseId: () => `lease-${++leaseOrdinal}`,
    });
    const store = new MemoryAreaEventScriptPublicationControlStore(locks, {
      now: () => clock.value,
    });
    const lease = (await locks.acquire(MODULE_ID, TRANSACTION_ID))!;
    await store.begin({
      transactionId: TRANSACTION_ID,
      moduleId: MODULE_ID,
      targetResRef: "area_enter",
      actorId: "admin-1",
      idempotencyKey: "publish-1",
      commandHash: "a".repeat(64),
      expectedModuleRevision: "b".repeat(64),
      leaseId: lease.leaseId,
      fencingToken: lease.fencingToken,
      candidate: candidateFixture(),
      createdAt: NOW,
    });
    await store.transition(TRANSACTION_ID, "staged", lease);
    clock.value = new Date("2026-08-26T12:00:02.000Z");

    await expect(locks.acquire(MODULE_ID, "other-tx")).resolves.toBeNull();
    const recovery = await locks.acquire(MODULE_ID, "recovery-run", {
      recoveryOfTransactionId: TRANSACTION_ID,
    });
    expect(recovery).toEqual(expect.objectContaining({
      ownerTransactionId: TRANSACTION_ID,
      fencingToken: 2,
    }));
    expect((await store.readJournal(TRANSACTION_ID))?.leaseId).toBe(
      recovery?.leaseId,
    );
    expect(await store.listRecoverable(10)).toEqual([]);
  });

  it("rejects a receipt outside the immutable journal identity", async () => {
    const locks = new MemoryAreaCreateControlStore({
      now: () => new Date(NOW),
      nextLeaseId: () => "lease-1",
    });
    const store = new MemoryAreaEventScriptPublicationControlStore(locks, {
      now: () => new Date(NOW),
    });
    const lease = (await locks.acquire(MODULE_ID, TRANSACTION_ID))!;
    const candidate = candidateFixture();
    await store.begin({
      transactionId: TRANSACTION_ID,
      moduleId: MODULE_ID,
      targetResRef: "area_enter",
      actorId: "admin-1",
      idempotencyKey: "publish-1",
      commandHash: "a".repeat(64),
      expectedModuleRevision: "b".repeat(64),
      leaseId: lease.leaseId,
      fencingToken: lease.fencingToken,
      candidate,
      createdAt: NOW,
    });
    await store.transition(TRANSACTION_ID, "staged", lease);
    await store.transition(TRANSACTION_ID, "resources_committed", lease);
    await store.transition(TRANSACTION_ID, "ifo_committed", lease);

    await expect(store.recordReadback(TRANSACTION_ID, lease, {
      ...receiptFixture(candidate),
      sourceSha256: "f".repeat(64),
    })).rejects.toThrow("AREA_EVENT_SCRIPT_READBACK_CONFLICT");
  });
});

function candidateFixture(): AreaEventScriptPublicationCandidate {
  const sourceSha256 = sha(Buffer.from("source-bytes"));
  return {
    expectedModuleRevision: "b".repeat(64),
    targetResRef: "area_enter",
    sourceSha256,
    includeSetSha256: "d".repeat(64),
    executionProfileSha256: "e".repeat(64),
    provider: {
      providerId: "neverwinter-nim-official-script-compiler",
      executableSha256: "1".repeat(64),
      versionMarker: "neverwinter 2.1.2",
      versionOutputSha256: "2".repeat(64),
      languageSpecSha256: "3".repeat(64),
      runtimeLibrarySetSha256: "4".repeat(64),
      launcherFileSetSha256: "5".repeat(64),
    },
    compilerReceiptSha256: "6".repeat(64),
    diagnostics: [],
    resources: [
      resource("ncs", 2010, "ncs-bytes"),
      resource("ndb", 2064, "ndb-bytes"),
      resource("nss", 2009, "source-bytes"),
    ],
  };
}

function resource(
  extension: "ncs" | "ndb" | "nss",
  resourceType: number,
  value: string,
) {
  const bytes = Buffer.from(value);
  return {
    extension,
    logicalKey: `area_enter.${extension}`,
    resourceType,
    bytes,
    size: bytes.length,
    sha256: sha(bytes),
  };
}

function sha(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function receiptFixture(
  candidate: AreaEventScriptPublicationCandidate,
): AreaEventScriptPublicationReceipt {
  return {
    schemaVersion: "area-event-script-publication-receipt.v1",
    transactionId: TRANSACTION_ID,
    moduleId: MODULE_ID,
    targetResRef: candidate.targetResRef,
    previousModuleRevision: candidate.expectedModuleRevision,
    newModuleRevision: "9".repeat(64),
    commandHash: "a".repeat(64),
    sourceSha256: candidate.sourceSha256,
    includeSetSha256: candidate.includeSetSha256,
    executionProfileSha256: candidate.executionProfileSha256,
    provider: candidate.provider,
    compilerReceiptSha256: candidate.compilerReceiptSha256,
    resources: candidate.resources.map(({ bytes: _bytes, ...resource }) => resource),
    readbackStatus: "verified",
    warnings: [],
    publishedAt: NOW,
  };
}
