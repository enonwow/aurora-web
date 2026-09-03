import { createHash } from "node:crypto";
import { MemoryAreaCreateControlStore } from "../../src/modules/areas/adapters/outbound/memory/memory-area-create-control-store";
import { MemoryAreaEventScriptPublicationControlStore } from "../../src/modules/areas/adapters/outbound/memory/memory-area-event-script-publication-control-store";
import { MemoryAtomicModuleSnapshotRepository } from "../../src/modules/areas/adapters/outbound/memory/memory-atomic-module-snapshot.repository";
import { AtomicAreaEventScriptPublicationStorageAdapter } from "../../src/modules/areas/adapters/outbound/snapshot/atomic-area-event-script-publication-storage.adapter";
import { CommittedNwnScriptSourceSnapshotAdapter } from "../../src/modules/areas/adapters/outbound/snapshot/committed-nwn-script-source-snapshot.adapter";
import { AreaEventScriptPublicationCoordinator } from "../../src/modules/areas/application/area-event-script-publication.coordinator";
import { AreaEventScriptPublicationRecoveryCoordinator } from "../../src/modules/areas/application/area-event-script-publication-recovery.coordinator";
import type { NwnScriptCompileResult } from "../../src/modules/areas/application/ports/nwn-script-compiler.port";
import {
  AREA_EVENT_SCRIPT_PUBLICATION_RECEIPT_SCHEMA_VERSION,
  buildAreaEventScriptPublicationCandidate,
  type AreaEventScriptPublicationReceipt,
} from "../../src/modules/areas/domain/area-event-script-publication.types";
import {
  validateAndNormalizeAreaEventScriptSourceCommand,
} from "../../src/modules/areas/domain/area-event-script-source-command";
import {
  createModuleSnapshotManifest,
} from "../../src/modules/areas/domain/module-snapshot-manifest";

const MODULE_ID = "module:test";
const NOW = "2026-08-26T12:00:00.000Z";

describe("Area event-script atomic publication integration", () => {
  it("captures committed includes, publishes exactly NSS/NCS/NDB, and replays the receipt", async () => {
    const harness = await createHarness();
    const command = commandFixture(harness.baseline.revision);

    const created = await harness.coordinator.execute({
      actorId: "admin-1",
      idempotencyKey: "publish-1",
      ifMatchHeader: `"${harness.baseline.revision}"`,
      command: command.value,
      commandHash: command.commandHash,
    });
    const replayed = await harness.coordinator.execute({
      actorId: "admin-1",
      idempotencyKey: "publish-1",
      ifMatchHeader: `"${harness.baseline.revision}"`,
      command: command.value,
      commandHash: command.commandHash,
    });

    expect(created.idempotency).toBe("created");
    expect(created.receipt.resources.map((resource) => [
      resource.logicalKey,
      resource.resourceType,
    ])).toEqual([
      ["area_enter.ncs", 2010],
      ["area_enter.ndb", 2064],
      ["area_enter.nss", 2009],
    ]);
    expect(replayed).toEqual({ idempotency: "replayed", receipt: created.receipt });
    expect(harness.compile).toHaveBeenCalledTimes(1);
    expect(harness.compile).toHaveBeenCalledWith(expect.objectContaining({
      includes: [{ resref: "shared", bytes: Buffer.from("int Shared = 1;\n") }],
    }));
    const head = await harness.repository.readHead(MODULE_ID);
    const manifest = await harness.repository.readManifest(head!.manifestKey);
    expect(manifest?.objects.map((resource) => resource.logicalKey)).toEqual([
      "area_enter.ncs",
      "area_enter.ndb",
      "area_enter.nss",
      "module.ifo",
      "shared.nss",
    ]);
    expect(JSON.stringify(created.receipt)).not.toContain("void main");
    expect(JSON.stringify(created.receipt)).not.toContain("compiled-ncs");
  });

  it("finishes a readback-verified interrupted publication from its byte-free journal", async () => {
    const harness = await createHarness();
    const command = commandFixture(harness.baseline.revision);
    const transactionId = "script-recovery-tx";
    const lease = (await harness.locks.acquire(MODULE_ID, transactionId))!;
    const compilation = compiled(command.value.sourceBytes);
    const candidate = buildAreaEventScriptPublicationCandidate({
      expectedModuleRevision: harness.baseline.revision,
      sourceBytes: command.value.sourceBytes,
      compilation,
    });
    await harness.control.begin({
      transactionId,
      moduleId: MODULE_ID,
      targetResRef: command.value.targetResRef,
      actorId: "admin-1",
      idempotencyKey: "recover-publish-1",
      commandHash: command.commandHash,
      expectedModuleRevision: harness.baseline.revision,
      leaseId: lease.leaseId,
      fencingToken: lease.fencingToken,
      candidate,
      createdAt: NOW,
    });
    await harness.storage.stage(
      transactionId,
      MODULE_ID,
      candidate,
      lease,
      NOW,
    );
    await harness.control.transition(transactionId, "staged", lease);
    await harness.storage.publish(transactionId, MODULE_ID, candidate, lease);
    await harness.control.transition(transactionId, "resources_committed", lease);
    await harness.control.transition(transactionId, "ifo_committed", lease);
    const readback = await harness.storage.readBack(
      transactionId,
      MODULE_ID,
      candidate,
      lease,
    );
    const receipt: AreaEventScriptPublicationReceipt = {
      schemaVersion: AREA_EVENT_SCRIPT_PUBLICATION_RECEIPT_SCHEMA_VERSION,
      transactionId,
      moduleId: MODULE_ID,
      targetResRef: candidate.targetResRef,
      previousModuleRevision: harness.baseline.revision,
      newModuleRevision: readback.newModuleRevision,
      commandHash: command.commandHash,
      sourceSha256: candidate.sourceSha256,
      includeSetSha256: candidate.includeSetSha256,
      executionProfileSha256: candidate.executionProfileSha256,
      provider: candidate.provider,
      compilerReceiptSha256: candidate.compilerReceiptSha256,
      resources: readback.resources,
      readbackStatus: "verified",
      warnings: [],
      publishedAt: NOW,
    };
    await harness.control.recordReadback(transactionId, lease, receipt);
    await harness.locks.release(lease);
    expect(JSON.stringify(await harness.control.readJournal(transactionId)))
      .not.toContain("void main");

    const recovery = new AreaEventScriptPublicationRecoveryCoordinator({
      lock: harness.locks,
      journal: harness.control,
      storage: harness.storage,
      ids: { nextRecoveryId: () => "recovery-run-1" },
    });

    await expect(recovery.recover(10)).resolves.toEqual([{
      transactionId,
      outcome: "completed",
      diagnostics: [],
    }]);
    expect((await harness.control.readJournal(transactionId))?.state).toBe("complete");
    expect(await harness.control.read(MODULE_ID, "recover-publish-1"))
      .toEqual(expect.objectContaining({ result: receipt }));
  });
});

async function createHarness() {
  let transactionOrdinal = 0;
  let leaseOrdinal = 0;
  const clock = { value: new Date(NOW) };
  const locks = new MemoryAreaCreateControlStore({
    now: () => clock.value,
    nextLeaseId: () => `lease-${++leaseOrdinal}`,
  });
  const repository = new MemoryAtomicModuleSnapshotRepository(
    locks,
    () => clock.value,
  );
  const contents = {
    "module.ifo": Buffer.from("module-ifo"),
    "shared.nss": Buffer.from("int Shared = 1;\n"),
  };
  const baseline = createModuleSnapshotManifest({
    moduleId: MODULE_ID,
    parentRevision: null,
    objects: [
      descriptor("module.ifo", 2014, contents["module.ifo"]),
      descriptor("shared.nss", 2009, contents["shared.nss"]),
    ],
  });
  await repository.bootstrap(baseline, contents, NOW);
  const control = new MemoryAreaEventScriptPublicationControlStore(locks, {
    now: () => clock.value,
  });
  const storage = new AtomicAreaEventScriptPublicationStorageAdapter(repository);
  const compile = jest.fn(async (input: { target: { bytes: Buffer } }) =>
    compiled(input.target.bytes));
  const coordinator = new AreaEventScriptPublicationCoordinator({
    authorization: { authorize: async () => true },
    sourceSnapshot: new CommittedNwnScriptSourceSnapshotAdapter(repository),
    compiler: { compile },
    lock: locks,
    idempotency: control,
    storage,
    journal: control,
    ids: { nextTransactionId: () => `script-tx-${++transactionOrdinal}` },
    clock: { nowIso: () => clock.value.toISOString() },
  });
  return { locks, repository, baseline, control, storage, compile, coordinator };
}

function commandFixture(revision: string) {
  const result = validateAndNormalizeAreaEventScriptSourceCommand({
    schemaVersion: "area-event-script-source-command.v1",
    moduleId: MODULE_ID,
    targetResRef: "area_enter",
    expectedModuleRevision: revision,
    sourceText: "void main() {}\n",
    includeResRefs: ["shared"],
  });
  if (!result.valid) throw new Error("Command fixture is invalid.");
  return result;
}

function compiled(source: Buffer): NwnScriptCompileResult {
  const ncs = Buffer.from("compiled-ncs");
  const ndb = Buffer.from("compiled-ndb");
  return {
    schemaVersion: "area-nwscript-compile-result.v1",
    status: "compiled",
    targetResref: "area_enter",
    sourceSha256: sha(source),
    includeSetSha256: sha(Buffer.from("shared")),
    executionProfileSha256: "3".repeat(64),
    provider: {
      providerId: "neverwinter-nim-official-script-compiler",
      executableSha256: "4".repeat(64),
      versionMarker: "neverwinter 2.1.2",
      versionOutputSha256: "5".repeat(64),
      languageSpecSha256: "6".repeat(64),
      runtimeLibrarySetSha256: "7".repeat(64),
      launcherFileSetSha256: "8".repeat(64),
    },
    diagnostics: [],
    artifacts: {
      ncs: { bytes: ncs, size: ncs.length, sha256: sha(ncs) },
      ndb: { bytes: ndb, size: ndb.length, sha256: sha(ndb) },
    },
    receiptSha256: "9".repeat(64),
  };
}

function descriptor(logicalKey: string, resourceType: number, bytes: Buffer) {
  return { logicalKey, resourceType, size: bytes.length, sha256: sha(bytes) };
}

function sha(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}
