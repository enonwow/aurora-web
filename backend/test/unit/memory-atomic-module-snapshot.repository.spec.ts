import { createHash } from "node:crypto";
import {
  MemoryAtomicModuleSnapshotRepository,
} from "../../src/modules/areas/adapters/outbound/memory/memory-atomic-module-snapshot.repository";
import {
  applyModuleSnapshotChanges,
  buildModuleSnapshotContentKey,
  createModuleSnapshotManifest,
} from "../../src/modules/areas/domain/module-snapshot-manifest";
import type {
  AreaCreateLeaseGuardPort,
  AreaCreateSnapshotStageDescriptor,
  ModuleSnapshotHead,
} from "../../src/modules/areas/application/ports/atomic-module-snapshot.port";
import type {
  AreaCreateModuleLease,
} from "../../src/modules/areas/application/ports/area-create-transaction.port";

describe("memory atomic module snapshot repository", () => {
  it("bootstraps and reads one immutable baseline head, manifest, and content set", async () => {
    const harness = createHarness();
    const baseline = baselineFixture();
    await harness.repository.bootstrap(baseline.manifest, baseline.contents, NOW);

    const head = await harness.repository.readHead(MODULE_ID);
    expect(head).toEqual(headFor(baseline.manifest, 0, false));
    expect(Object.isFrozen(head)).toBe(true);
    expect(await harness.repository.readManifest(head!.manifestKey)).toEqual(
      baseline.manifest,
    );
    const ifo = await harness.repository.readContent(
      buildModuleSnapshotContentKey(sha(baseline.contents["module.ifo"])),
    );
    expect(ifo?.bytes.equals(baseline.contents["module.ifo"])).toBe(true);
    ifo!.bytes[0] ^= 0xff;
    expect(
      (
        await harness.repository.readContent(
          buildModuleSnapshotContentKey(sha(baseline.contents["module.ifo"])),
        )
      )?.bytes.equals(baseline.contents["module.ifo"]),
    ).toBe(true);
  });

  it("makes content and manifest puts idempotent but rejects hash or immutable-key conflicts", async () => {
    const harness = createHarness();
    const bytes = Buffer.from("candidate-are");
    const digest = sha(bytes);
    await harness.repository.putContentIfAbsent(bytes, digest);
    await expect(harness.repository.putContentIfAbsent(bytes, digest)).resolves.toEqual(
      expect.objectContaining({ sha256: digest, size: bytes.length }),
    );
    await expect(
      harness.repository.putContentIfAbsent(Buffer.from("different"), digest),
    ).rejects.toThrow("AREA_SNAPSHOT_CONTENT_HASH_MISMATCH");

    const baseline = baselineFixture();
    await harness.repository.putManifestIfAbsent(baseline.manifest);
    await expect(
      harness.repository.putManifestIfAbsent(baseline.manifest),
    ).resolves.toEqual(expect.objectContaining({ revision: baseline.manifest.revision }));
    await expect(
      harness.repository.putManifestIfAbsent({
        ...baseline.manifest,
        revision: "f".repeat(64),
      }),
    ).rejects.toThrow("AREA_SNAPSHOT_MANIFEST_INVALID");
  });

  it("retains a byte-free immutable stage and rejects a different replay", async () => {
    const harness = createHarness();
    const prepared = await prepareStage(harness);

    await expect(
      harness.repository.putStageIfAbsent(prepared.stage),
    ).resolves.toEqual(prepared.stage);
    expect(JSON.stringify(await harness.repository.readStage(TRANSACTION_ID))).not.toContain(
      "candidate-are-bytes",
    );
    await expect(
      harness.repository.putStageIfAbsent({
        ...prepared.stage,
        candidateLogicalKeys: ["different.are"],
      }),
    ).rejects.toThrow("AREA_SNAPSHOT_STAGE_CONFLICT");
  });

  it("publishes every successor object through one fenced head CAS", async () => {
    const harness = createHarness();
    const prepared = await prepareStage(harness);
    const before = await harness.repository.readHead(MODULE_ID);

    await expect(
      harness.repository.compareAndSetHead(TRANSACTION_ID, harness.lease),
    ).resolves.toBe("published");

    expect(before?.revision).toBe(prepared.baseline.manifest.revision);
    const after = await harness.repository.readHead(MODULE_ID);
    expect(after).toEqual(headFor(prepared.successor, harness.lease.fencingToken, false));
    const visible = await harness.repository.readManifest(after!.manifestKey);
    expect(visible?.objects.map((entry) => entry.logicalKey)).toEqual([
      "area_new.are",
      "area_new.gic",
      "area_new.git",
      "existing.are",
      "module.ifo",
    ]);
    expect(harness.guard.assertCurrent).toHaveBeenCalledWith(harness.lease);
  });

  it("makes exact publication replay idempotent and rejects stale base or stale fencing", async () => {
    const harness = createHarness();
    await prepareStage(harness);
    await harness.repository.compareAndSetHead(TRANSACTION_ID, harness.lease);
    await expect(
      harness.repository.compareAndSetHead(TRANSACTION_ID, harness.lease),
    ).resolves.toBe("already_published");

    harness.guard.assertCurrent.mockRejectedValueOnce(
      new Error("AREA_CREATE_CONTROL_FENCED"),
    );
    await expect(
      harness.repository.compareAndSetHead(TRANSACTION_ID, harness.lease),
    ).rejects.toThrow("AREA_CREATE_CONTROL_FENCED");

    const stale = createHarness();
    const prepared = await prepareStage(stale);
    const foreign = createModuleSnapshotManifest({
      moduleId: MODULE_ID,
      parentRevision: prepared.baseline.manifest.revision,
      objects: prepared.baseline.manifest.objects,
    });
    await stale.repository.putManifestIfAbsent(foreign);
    await stale.repository.forceHeadForTest(headFor(foreign, 99, false));
    await expect(
      stale.repository.compareAndSetHead(TRANSACTION_ID, stale.lease),
    ).rejects.toThrow("AREA_SNAPSHOT_HEAD_REVISION_CONFLICT");
  });

  it("refuses publication for missing stage, wrong owner, missing successor manifest, or quarantine", async () => {
    const missing = createHarness();
    await expect(
      missing.repository.compareAndSetHead(TRANSACTION_ID, missing.lease),
    ).rejects.toThrow("AREA_SNAPSHOT_STAGE_MISSING");

    const wrongOwner = createHarness();
    await prepareStage(wrongOwner);
    await expect(
      wrongOwner.repository.compareAndSetHead(TRANSACTION_ID, {
        ...wrongOwner.lease,
        ownerTransactionId: "transaction-other",
      }),
    ).rejects.toThrow("AREA_SNAPSHOT_STAGE_IDENTITY_MISMATCH");

    const missingManifest = createHarness();
    const prepared = await prepareStage(missingManifest);
    await missingManifest.repository.deleteManifestForTest(
      prepared.stage.successor.manifestKey,
    );
    await expect(
      missingManifest.repository.compareAndSetHead(
        TRANSACTION_ID,
        missingManifest.lease,
      ),
    ).rejects.toThrow("AREA_SNAPSHOT_MANIFEST_MISSING");

    const quarantined = createHarness();
    await prepareStage(quarantined);
    await quarantined.repository.quarantine(
      TRANSACTION_ID,
      quarantined.lease,
      ["operator quarantine"],
    );
    await expect(
      quarantined.repository.compareAndSetHead(
        TRANSACTION_ID,
        quarantined.lease,
      ),
    ).rejects.toThrow("AREA_SNAPSHOT_MODULE_QUARANTINED");
  });

  it("restores the exact baseline after publication and treats baseline replay idempotently", async () => {
    const harness = createHarness();
    const prepared = await prepareStage(harness);
    await harness.repository.compareAndSetHead(TRANSACTION_ID, harness.lease);
    const recoveryLease = { ...harness.lease, leaseId: "lease-recovery", fencingToken: 8 };

    await expect(
      harness.repository.restoreBaseline(TRANSACTION_ID, recoveryLease),
    ).resolves.toBe("restored");
    expect(await harness.repository.readHead(MODULE_ID)).toEqual(
      headFor(prepared.baseline.manifest, 8, false),
    );
    await expect(
      harness.repository.restoreBaseline(TRANSACTION_ID, recoveryLease),
    ).resolves.toBe("already_baseline");
    expect(harness.guard.assertCurrent).toHaveBeenLastCalledWith(recoveryLease);
  });

  it("quarantines only under the exact lease and retains bounded diagnostics outside metric labels", async () => {
    const harness = createHarness();
    await prepareStage(harness);
    await harness.repository.quarantine(TRANSACTION_ID, harness.lease, [
      "readback mismatch",
    ]);

    const head = await harness.repository.readHead(MODULE_ID);
    expect(head?.quarantined).toBe(true);
    expect(await harness.repository.readQuarantine(MODULE_ID)).toEqual({
      transactionId: TRANSACTION_ID,
      diagnostics: ["readback mismatch"],
    });
    harness.guard.assertCurrent.mockRejectedValueOnce(new Error("fenced"));
    await expect(
      harness.repository.quarantine(TRANSACTION_ID, harness.lease, ["again"]),
    ).rejects.toThrow("fenced");
  });
});

const MODULE_ID = "module:test";
const TRANSACTION_ID = "transaction-1";
const NOW = "2026-08-07T12:00:00.000Z";

function createHarness() {
  const lease: AreaCreateModuleLease = {
    moduleId: MODULE_ID,
    leaseId: "lease-1",
    ownerTransactionId: TRANSACTION_ID,
    fencingToken: 7,
    expiresAt: "2026-08-07T12:00:30.000Z",
  };
  const guard: jest.Mocked<AreaCreateLeaseGuardPort> = {
    assertCurrent: jest.fn(async (_lease: AreaCreateModuleLease) => undefined),
  };
  return {
    lease,
    guard,
    repository: new MemoryAtomicModuleSnapshotRepository(
      guard,
      () => new Date(NOW),
    ),
  };
}

async function prepareStage(harness: ReturnType<typeof createHarness>) {
  const baseline = baselineFixture();
  await harness.repository.bootstrap(baseline.manifest, baseline.contents, NOW);
  const candidateContents = {
    "area_new.are": Buffer.from("candidate-are-bytes"),
    "area_new.git": Buffer.from("candidate-git-bytes"),
    "area_new.gic": Buffer.from("candidate-gic-bytes"),
    "module.ifo": Buffer.from("candidate-ifo-bytes"),
  };
  for (const bytes of Object.values(candidateContents)) {
    await harness.repository.putContentIfAbsent(bytes, sha(bytes));
  }
  const successor = applyModuleSnapshotChanges(
    baseline.manifest,
    Object.entries(candidateContents).map(([logicalKey, bytes]) => ({
      logicalKey,
      resourceType:
        logicalKey.endsWith(".are") ? 2012 :
        logicalKey.endsWith(".git") ? 2023 :
        logicalKey.endsWith(".gic") ? 2046 : 2014,
      size: bytes.length,
      sha256: sha(bytes),
    })),
  );
  await harness.repository.putManifestIfAbsent(successor);
  const stage: AreaCreateSnapshotStageDescriptor = {
    schemaVersion: "area-create-snapshot-stage.v1",
    transactionId: TRANSACTION_ID,
    moduleId: MODULE_ID,
    leaseId: harness.lease.leaseId,
    fencingToken: harness.lease.fencingToken,
    base: headIdentity(baseline.manifest),
    successor: headIdentity(successor),
    candidateLogicalKeys: Object.keys(candidateContents).sort(),
    createdAt: NOW,
  };
  await harness.repository.putStageIfAbsent(stage);
  return { baseline, successor, stage };
}

function baselineFixture() {
  const contents = {
    "module.ifo": Buffer.from("baseline-ifo"),
    "existing.are": Buffer.from("existing-area"),
  };
  return {
    contents,
    manifest: createModuleSnapshotManifest({
      moduleId: MODULE_ID,
      parentRevision: null,
      objects: Object.entries(contents).map(([logicalKey, bytes]) => ({
        logicalKey,
        resourceType: logicalKey.endsWith(".ifo") ? 2014 : 2012,
        size: bytes.length,
        sha256: sha(bytes),
      })),
    }),
  };
}

function headIdentity(manifest: ReturnType<typeof createModuleSnapshotManifest>) {
  return {
    revision: manifest.revision,
    manifestKey: MemoryAtomicModuleSnapshotRepository.manifestKey(manifest),
    manifestSha256: MemoryAtomicModuleSnapshotRepository.manifestSha256(manifest),
  };
}

function headFor(
  manifest: ReturnType<typeof createModuleSnapshotManifest>,
  fencingToken: number,
  quarantined: boolean,
): ModuleSnapshotHead {
  return {
    schemaVersion: "aurora-module-snapshot-head.v1",
    moduleId: MODULE_ID,
    ...headIdentity(manifest),
    quarantined,
    fencingToken,
    updatedAt: NOW,
  };
}

function sha(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}
