import { createHash } from "node:crypto";
import { AtomicAreaEventScriptPublicationStorageAdapter } from "../../src/modules/areas/adapters/outbound/snapshot/atomic-area-event-script-publication-storage.adapter";
import { MemoryAtomicModuleSnapshotRepository } from "../../src/modules/areas/adapters/outbound/memory/memory-atomic-module-snapshot.repository";
import type { AreaCreateLeaseGuardPort } from "../../src/modules/areas/application/ports/atomic-module-snapshot.port";
import type { AreaCreateModuleLease } from "../../src/modules/areas/application/ports/area-create-transaction.port";
import type { NwnScriptCompileResult } from "../../src/modules/areas/application/ports/nwn-script-compiler.port";
import {
  buildAreaEventScriptPublicationCandidate,
  createAreaEventScriptPublicationCandidateManifest,
  type AreaEventScriptPublicationCandidate,
  type AreaEventScriptPublicationPersistedJournalRecord,
  type AreaEventScriptPublicationReceipt,
} from "../../src/modules/areas/domain/area-event-script-publication.types";
import {
  buildModuleSnapshotManifestKey,
  createModuleSnapshotManifest,
} from "../../src/modules/areas/domain/module-snapshot-manifest";

const MODULE_ID = "module:test";
const TRANSACTION_ID = "script-publication-tx-1";
const NOW = "2026-08-26T12:00:00.000Z";

describe("atomic Area event-script publication storage adapter", () => {
  it("stages NSS/NCS/NDB without visibility, publishes one head, and independently reads all three back", async () => {
    const harness = await createHarness();
    const sourceInput = Buffer.from("void main() {}\n", "utf8");
    const candidate = buildAreaEventScriptPublicationCandidate({
      expectedModuleRevision: harness.baseline.revision,
      sourceBytes: sourceInput,
      compilation: compiled(sourceInput),
    });
    sourceInput.fill(0);

    await harness.storage.stage(
      TRANSACTION_ID,
      MODULE_ID,
      candidate,
      harness.lease,
      NOW,
    );
    expect((await harness.repository.readHead(MODULE_ID))?.revision).toBe(
      harness.baseline.revision,
    );

    await expect(
      harness.storage.publish(TRANSACTION_ID, MODULE_ID, candidate, harness.lease),
    ).resolves.toBe("published");
    const readback = await harness.storage.readBack(
      TRANSACTION_ID,
      MODULE_ID,
      candidate,
      harness.lease,
    );

    expect(readback.verified).toBe(true);
    expect(readback.resources).toEqual([
      expect.objectContaining({ extension: "ncs", logicalKey: "area_enter.ncs", resourceType: 2010 }),
      expect.objectContaining({ extension: "ndb", logicalKey: "area_enter.ndb", resourceType: 2064 }),
      expect.objectContaining({ extension: "nss", logicalKey: "area_enter.nss", resourceType: 2009 }),
    ]);
    expect("bytes" in readback.resources[0]).toBe(false);
    const head = await harness.repository.readHead(MODULE_ID);
    const manifest = await harness.repository.readManifest(head!.manifestKey);
    expect(manifest?.objects.map((entry) => entry.logicalKey)).toEqual([
      "area_enter.ncs",
      "area_enter.ndb",
      "area_enter.nss",
      "module.ifo",
    ]);
    expect(readback.newModuleRevision).toBe(head?.revision);
  });

  it("restores the exact baseline after publication", async () => {
    const harness = await createHarness();
    const source = Buffer.from("void main() {}\n");
    const candidate = buildAreaEventScriptPublicationCandidate({
      expectedModuleRevision: harness.baseline.revision,
      sourceBytes: source,
      compilation: compiled(source),
    });
    await harness.storage.stage(
      TRANSACTION_ID,
      MODULE_ID,
      candidate,
      harness.lease,
      NOW,
    );
    await harness.storage.publish(TRANSACTION_ID, MODULE_ID, candidate, harness.lease);

    await expect(
      harness.storage.compensate(
        TRANSACTION_ID,
        MODULE_ID,
        candidate,
        harness.lease,
      ),
    ).resolves.toEqual({ restored: true, diagnostics: [] });
    expect(await harness.repository.readHead(MODULE_ID)).toEqual(
      expect.objectContaining({
        revision: harness.baseline.revision,
        manifestKey: buildModuleSnapshotManifestKey(harness.baseline),
      }),
    );
  });

  it("verifies and restores a published snapshot using only the byte-free durable journal", async () => {
    const harness = await createHarness();
    const source = Buffer.from("void main() {}\n");
    const candidate = buildAreaEventScriptPublicationCandidate({
      expectedModuleRevision: harness.baseline.revision,
      sourceBytes: source,
      compilation: compiled(source),
    });
    await harness.storage.stage(
      TRANSACTION_ID,
      MODULE_ID,
      candidate,
      harness.lease,
      NOW,
    );
    await harness.storage.publish(TRANSACTION_ID, MODULE_ID, candidate, harness.lease);
    const published = await harness.storage.readBack(
      TRANSACTION_ID,
      MODULE_ID,
      candidate,
      harness.lease,
    );
    const retained = journalFixture(
      harness.baseline.revision,
      candidate,
      "readback_verified",
      receiptFixture(harness.baseline.revision, candidate, published),
    );

    await expect(
      harness.storage.verifyRecordedReadback(retained, harness.lease),
    ).resolves.toEqual({ verified: true, diagnostics: [] });
    await expect(
      harness.storage.restoreRecordedBaseline(retained, harness.lease),
    ).resolves.toEqual({ restored: true, diagnostics: [] });
    expect((await harness.repository.readHead(MODULE_ID))?.revision).toBe(
      harness.baseline.revision,
    );
  });

  it("rejects a durable receipt that is outside the retained successor identity", async () => {
    const harness = await createHarness();
    const source = Buffer.from("void main() {}\n");
    const candidate = buildAreaEventScriptPublicationCandidate({
      expectedModuleRevision: harness.baseline.revision,
      sourceBytes: source,
      compilation: compiled(source),
    });
    await harness.storage.stage(
      TRANSACTION_ID,
      MODULE_ID,
      candidate,
      harness.lease,
      NOW,
    );
    await harness.storage.publish(TRANSACTION_ID, MODULE_ID, candidate, harness.lease);
    const published = await harness.storage.readBack(
      TRANSACTION_ID,
      MODULE_ID,
      candidate,
      harness.lease,
    );
    const invalidReceipt = {
      ...receiptFixture(harness.baseline.revision, candidate, published),
      newModuleRevision: "f".repeat(64),
    };
    const retained = journalFixture(
      harness.baseline.revision,
      candidate,
      "readback_verified",
      invalidReceipt,
    );

    await expect(
      harness.storage.verifyRecordedReadback(retained, harness.lease),
    ).resolves.toEqual({
      verified: false,
      diagnostics: ["AREA_EVENT_SCRIPT_RECOVERY_RECEIPT_MISMATCH"],
    });
  });

  it("proves an unstaged prepared transaction is already at its exact baseline", async () => {
    const harness = await createHarness();
    const source = Buffer.from("void main() {}\n");
    const candidate = buildAreaEventScriptPublicationCandidate({
      expectedModuleRevision: harness.baseline.revision,
      sourceBytes: source,
      compilation: compiled(source),
    });
    const retained = journalFixture(
      harness.baseline.revision,
      candidate,
      "prepared",
    );

    await expect(
      harness.storage.restoreRecordedBaseline(retained, harness.lease),
    ).resolves.toEqual({ restored: true, diagnostics: [] });
  });

  it("quarantines an unprovable prepared transaction even when no stage exists", async () => {
    const harness = await createHarness();
    const source = Buffer.from("void main() {}\n");
    const candidate = buildAreaEventScriptPublicationCandidate({
      expectedModuleRevision: harness.baseline.revision,
      sourceBytes: source,
      compilation: compiled(source),
    });
    const retained = journalFixture(
      harness.baseline.revision,
      candidate,
      "prepared",
    );
    const current = (await harness.repository.readHead(MODULE_ID))!;
    await harness.repository.forceHeadForTest({
      ...current,
      revision: "f".repeat(64),
    });

    await expect(
      harness.storage.restoreRecordedBaseline(retained, harness.lease),
    ).resolves.toEqual({
      restored: false,
      diagnostics: ["AREA_EVENT_SCRIPT_RECOVERY_BASELINE_UNPROVEN"],
    });
    await harness.storage.quarantineRecordedPublication(
      retained,
      harness.lease,
      ["AREA_EVENT_SCRIPT_RECOVERY_BASELINE_UNPROVEN"],
    );

    expect((await harness.repository.readHead(MODULE_ID))?.quarantined).toBe(true);
    await expect(harness.repository.readQuarantine(MODULE_ID)).resolves.toEqual({
      transactionId: TRANSACTION_ID,
      diagnostics: ["AREA_EVENT_SCRIPT_RECOVERY_BASELINE_UNPROVEN"],
    });
  });

  it("rejects rejected or identity-inconsistent compiler output before staging", () => {
    const source = Buffer.from("void main() {}\n");
    expect(() => buildAreaEventScriptPublicationCandidate({
      expectedModuleRevision: "a".repeat(64),
      sourceBytes: source,
      compilation: { ...compiled(source), status: "rejected", artifacts: undefined },
    })).toThrow("AREA_EVENT_SCRIPT_COMPILE_REJECTED");
    expect(() => buildAreaEventScriptPublicationCandidate({
      expectedModuleRevision: "a".repeat(64),
      sourceBytes: source,
      compilation: { ...compiled(source), sourceSha256: "f".repeat(64) },
    })).toThrow("AREA_EVENT_SCRIPT_COMPILER_RESULT_INVALID");
  });
});

async function createHarness() {
  const guard: AreaCreateLeaseGuardPort = { assertCurrent: jest.fn().mockResolvedValue(undefined) };
  const repository = new MemoryAtomicModuleSnapshotRepository(
    guard,
    () => new Date(NOW),
  );
  const ifo = Buffer.from("module-ifo");
  const baseline = createModuleSnapshotManifest({
    moduleId: MODULE_ID,
    parentRevision: null,
    objects: [{
      logicalKey: "module.ifo",
      resourceType: 2014,
      size: ifo.length,
      sha256: sha(ifo),
    }],
  });
  await repository.bootstrap(baseline, { "module.ifo": ifo }, NOW);
  const lease: AreaCreateModuleLease = Object.freeze({
    leaseId: "lease-1",
    moduleId: MODULE_ID,
    ownerTransactionId: TRANSACTION_ID,
    fencingToken: 1,
    expiresAt: "2026-08-26T12:01:00.000Z",
  });
  return {
    repository,
    storage: new AtomicAreaEventScriptPublicationStorageAdapter(repository),
    baseline,
    lease,
  };
}

function compiled(source: Buffer): NwnScriptCompileResult {
  const ncs = Buffer.from("compiled-ncs");
  const ndb = Buffer.from("compiled-ndb");
  return Object.freeze({
    schemaVersion: "area-nwscript-compile-result.v1",
    status: "compiled",
    targetResref: "area_enter",
    sourceSha256: sha(source),
    includeSetSha256: sha(Buffer.from("[]")),
    executionProfileSha256: "b".repeat(64),
    provider: Object.freeze({
      providerId: "neverwinter-nim-official-script-compiler",
      executableSha256: "c".repeat(64),
      versionMarker: "neverwinter 2.1.2",
      versionOutputSha256: "d".repeat(64),
      languageSpecSha256: "e".repeat(64),
      runtimeLibrarySetSha256: "f".repeat(64),
      launcherFileSetSha256: "0".repeat(64),
    }),
    diagnostics: Object.freeze([]),
    artifacts: Object.freeze({
      ncs: Object.freeze({ bytes: ncs, size: ncs.length, sha256: sha(ncs) }),
      ndb: Object.freeze({ bytes: ndb, size: ndb.length, sha256: sha(ndb) }),
    }),
    receiptSha256: "1".repeat(64),
  });
}

function journalFixture(
  expectedModuleRevision: string,
  candidate: AreaEventScriptPublicationCandidate,
  state: AreaEventScriptPublicationPersistedJournalRecord["state"],
  receipt?: AreaEventScriptPublicationReceipt,
): AreaEventScriptPublicationPersistedJournalRecord {
  return {
    transactionId: TRANSACTION_ID,
    moduleId: MODULE_ID,
    targetResRef: candidate.targetResRef,
    actorId: "admin-1",
    idempotencyKey: "publish-1",
    commandHash: "a".repeat(64),
    expectedModuleRevision,
    leaseId: "old-lease",
    fencingToken: 0,
    state,
    candidateManifest: createAreaEventScriptPublicationCandidateManifest(candidate),
    ...(receipt ? { receipt } : {}),
    diagnostics: [],
    createdAt: NOW,
    updatedAt: NOW,
  };
}

function receiptFixture(
  previousModuleRevision: string,
  candidate: AreaEventScriptPublicationCandidate,
  readback: Awaited<ReturnType<AtomicAreaEventScriptPublicationStorageAdapter["readBack"]>>,
): AreaEventScriptPublicationReceipt {
  return {
    schemaVersion: "area-event-script-publication-receipt.v1",
    transactionId: TRANSACTION_ID,
    moduleId: MODULE_ID,
    targetResRef: candidate.targetResRef,
    previousModuleRevision,
    newModuleRevision: readback.newModuleRevision,
    commandHash: "a".repeat(64),
    sourceSha256: candidate.sourceSha256,
    includeSetSha256: candidate.includeSetSha256,
    executionProfileSha256: candidate.executionProfileSha256,
    provider: candidate.provider,
    compilerReceiptSha256: candidate.compilerReceiptSha256,
    resources: readback.resources,
    readbackStatus: "verified",
    warnings: candidate.diagnostics,
    publishedAt: NOW,
  };
}

function sha(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}
