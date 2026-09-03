import { createHash } from "node:crypto";
import { AtomicAreaDeleteTransactionStorageAdapter } from "../../src/modules/areas/adapters/outbound/snapshot/atomic-area-delete-transaction-storage.adapter";
import { MemoryAtomicModuleSnapshotRepository } from "../../src/modules/areas/adapters/outbound/memory/memory-atomic-module-snapshot.repository";
import { buildGffBuffer } from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-uti-writer";
import { removeAreaFromModuleIfoAreaList } from "../../src/modules/areas/adapters/outbound/blob/aurora-gff-module-ifo-area-writer";
import {
  createModuleSnapshotManifest,
  type ModuleSnapshotManifest,
} from "../../src/modules/areas/domain/module-snapshot-manifest";
import type { AreaCreateLeaseGuardPort } from "../../src/modules/areas/application/ports/atomic-module-snapshot.port";
import type { AreaCreateModuleLease } from "../../src/modules/areas/application/ports/area-create-transaction.port";
import type { AreaDeleteCompiledCandidate } from "../../src/modules/areas/domain/area-delete-transaction.types";
import type { AreaDeletePersistedJournalRecord } from "../../src/modules/areas/domain/area-delete-transaction.types";

describe("AtomicAreaDeleteTransactionStorageAdapter", () => {
  it("keeps the baseline visible until one CAS publishes triplet removal and IFO replacement", async () => {
    const harness = await createHarness();

    await harness.storage.stage(TRANSACTION_ID, MODULE_ID, harness.candidate, LEASE);
    await harness.storage.commitResources(
      TRANSACTION_ID,
      MODULE_ID,
      harness.candidate,
      LEASE,
    );
    expect((await harness.repository.readHead(MODULE_ID))?.revision).toBe(
      harness.baseline.revision,
    );

    await harness.storage.commitModuleIfo(
      TRANSACTION_ID,
      MODULE_ID,
      harness.candidate,
      LEASE,
    );
    const published = await harness.repository.readHead(MODULE_ID);
    expect(published?.revision).not.toBe(harness.baseline.revision);
    const manifest = await harness.repository.readManifest(published!.manifestKey);
    expect(manifest?.objects.map((entry) => entry.logicalKey)).toEqual([
      "keep.are",
      "keep.gic",
      "keep.git",
      "module.ifo",
    ]);

    await expect(
      harness.storage.readBack(TRANSACTION_ID, MODULE_ID, harness.candidate, LEASE),
    ).resolves.toEqual({
      verified: true,
      newModuleRevision: published!.revision,
      removedResources: harness.candidate.removedResources.map(({ bytes: _bytes, ...entry }) => entry),
      moduleIfo: {
        key: "module.ifo",
        size: harness.candidate.moduleIfo.candidateBytes.length,
        sha256: harness.candidate.moduleIfo.candidateSha256,
      },
      survivorCount: 4,
      diagnostics: [],
    });
  });

  it("replays a retained stage and rejects a changed destructive candidate", async () => {
    const harness = await createHarness();
    await harness.storage.stage(TRANSACTION_ID, MODULE_ID, harness.candidate, LEASE);
    await expect(
      harness.storage.stage(TRANSACTION_ID, MODULE_ID, harness.candidate, LEASE),
    ).resolves.toBeUndefined();

    const changed = {
      ...harness.candidate,
      removedResources: harness.candidate.removedResources.map((entry, index) =>
        index === 0 ? { ...entry, bytes: Buffer.from("different") } : entry,
      ),
    } as AreaDeleteCompiledCandidate;
    await expect(
      harness.storage.stage(TRANSACTION_ID, MODULE_ID, changed, LEASE),
    ).rejects.toThrow("AREA_DELETE_SNAPSHOT_CANDIDATE_INVALID");
  });

  it("rejects a candidate whose retained baseline resource bytes are not exact", async () => {
    const harness = await createHarness();
    const changedBytes = Buffer.from("not-the-retained-area");
    const changed = {
      ...harness.candidate,
      removedResources: harness.candidate.removedResources.map((entry) =>
        entry.extension === "are"
          ? { ...entry, bytes: changedBytes, size: changedBytes.length, sha256: sha(changedBytes) }
          : entry,
      ),
    } as AreaDeleteCompiledCandidate;

    await expect(
      harness.storage.stage(TRANSACTION_ID, MODULE_ID, changed, LEASE),
    ).rejects.toThrow("AREA_DELETE_SNAPSHOT_BASELINE_RESOURCE_MISMATCH");
    await expect(harness.repository.readStage(TRANSACTION_ID)).resolves.toBeNull();
  });

  it("restores the exact retained baseline after a published destructive successor", async () => {
    const harness = await createHarness();
    await publish(harness);
    const recoveryLease = { ...LEASE, leaseId: "lease-recovery", fencingToken: 18 };

    await expect(
      harness.storage.compensate(
        TRANSACTION_ID,
        MODULE_ID,
        harness.candidate,
        recoveryLease,
      ),
    ).resolves.toEqual({ restored: true, diagnostics: [] });
    expect((await harness.repository.readHead(MODULE_ID))?.revision).toBe(
      harness.baseline.revision,
    );
  });

  it("fails closed when the successor lacks the exact deletion delta", async () => {
    const harness = await createHarness();
    await harness.storage.stage(TRANSACTION_ID, MODULE_ID, harness.candidate, LEASE);
    const stage = await harness.repository.readStage(TRANSACTION_ID);
    const successor = await harness.repository.readManifest(stage!.successor.manifestKey);
    const altered = {
      ...successor!,
      objects: successor!.objects.filter((entry) => entry.logicalKey !== "keep.are"),
    };
    jest
      .spyOn(harness.repository, "readManifest")
      .mockImplementation(async (key) =>
        key === stage!.successor.manifestKey ? (altered as ModuleSnapshotManifest) : null,
      );

    await expect(
      harness.storage.commitResources(
        TRANSACTION_ID,
        MODULE_ID,
        harness.candidate,
        LEASE,
      ),
    ).rejects.toThrow("AREA_DELETE_SNAPSHOT_MANIFEST_CONFLICT");
  });

  it("reads exact module state and rejects a transaction/lease scope mismatch", async () => {
    const harness = await createHarness();
    await expect(harness.storage.readModuleState(MODULE_ID)).resolves.toEqual({
      moduleId: MODULE_ID, revision: harness.baseline.revision, quarantined: false,
    });
    for (const lease of [
      { ...LEASE, moduleId: "module:other" },
      { ...LEASE, ownerTransactionId: "other" },
      { ...LEASE, fencingToken: 0 },
    ]) {
      await expect(harness.storage.stage(
        TRANSACTION_ID, MODULE_ID, harness.candidate, lease,
      )).rejects.toThrow("AREA_DELETE_SNAPSHOT_STAGE_IDENTITY_MISMATCH");
    }
  });

  it.each([
    ["preview module", (candidate: AreaDeleteCompiledCandidate) => ({
      ...candidate, preview: { ...candidate.preview, moduleId: "module:other" },
    })],
    ["preview area", (candidate: AreaDeleteCompiledCandidate) => ({
      ...candidate, preview: { ...candidate.preview, areaResRef: "other" },
    })],
    ["preview blockers", (candidate: AreaDeleteCompiledCandidate) => ({
      ...candidate, preview: { ...candidate.preview, blockerCount: 1 },
    })],
    ["survivor zero", (candidate: AreaDeleteCompiledCandidate) => ({
      ...candidate, survivorCount: 0,
    })],
    ["survivor fractional", (candidate: AreaDeleteCompiledCandidate) => ({
      ...candidate, survivorCount: 3.5,
    })],
    ["resource cardinality", (candidate: AreaDeleteCompiledCandidate) => ({
      ...candidate, removedResources: candidate.removedResources.slice(0, 2),
    })],
    ["duplicate extension", (candidate: AreaDeleteCompiledCandidate) => ({
      ...candidate,
      removedResources: [candidate.removedResources[0], candidate.removedResources[0], candidate.removedResources[2]],
    })],
    ["resource file", (candidate: AreaDeleteCompiledCandidate) => ({
      ...candidate,
      removedResources: candidate.removedResources.map((entry, index) =>
        index === 0 ? { ...entry, fileName: "other.are" } : entry),
    })],
    ["resource size", (candidate: AreaDeleteCompiledCandidate) => ({
      ...candidate,
      removedResources: candidate.removedResources.map((entry, index) =>
        index === 0 ? { ...entry, size: entry.size + 1 } : entry),
    })],
    ["resource type", (candidate: AreaDeleteCompiledCandidate) => ({
      ...candidate,
      removedResources: candidate.removedResources.map((entry, index) =>
        index === 0 ? { ...entry, resourceType: 2023 } : entry),
    })],
    ["resource hash", (candidate: AreaDeleteCompiledCandidate) => ({
      ...candidate,
      removedResources: candidate.removedResources.map((entry, index) =>
        index === 0 ? { ...entry, sha256: "0".repeat(64) } : entry),
    })],
    ["IFO file", (candidate: AreaDeleteCompiledCandidate) => ({
      ...candidate, moduleIfo: { ...candidate.moduleIfo, fileName: "other.ifo" },
    })],
    ["IFO type", (candidate: AreaDeleteCompiledCandidate) => ({
      ...candidate, moduleIfo: { ...candidate.moduleIfo, resourceType: 2012 },
    })],
    ["IFO baseline hash", (candidate: AreaDeleteCompiledCandidate) => ({
      ...candidate, moduleIfo: { ...candidate.moduleIfo, baselineSha256: "0".repeat(64) },
    })],
    ["IFO candidate hash", (candidate: AreaDeleteCompiledCandidate) => ({
      ...candidate, moduleIfo: { ...candidate.moduleIfo, candidateSha256: "0".repeat(64) },
    })],
    ["IFO candidate membership", (candidate: AreaDeleteCompiledCandidate) => ({
      ...candidate,
      moduleIfo: {
        ...candidate.moduleIfo,
        candidateBytes: candidate.moduleIfo.baselineBytes,
        candidateSha256: candidate.moduleIfo.baselineSha256,
      },
    })],
  ] as const)("rejects inconsistent destructive candidate metadata: %s", async (_label, mutate) => {
    const harness = await createHarness();
    await expect(harness.storage.stage(
      TRANSACTION_ID,
      MODULE_ID,
      mutate(harness.candidate) as AreaDeleteCompiledCandidate,
      LEASE,
    )).rejects.toThrow("AREA_DELETE_SNAPSHOT_CANDIDATE_INVALID");
    await expect(harness.repository.readStage(TRANSACTION_ID)).resolves.toBeNull();
  });

  it("rejects baseline IFO drift and a survivor count not derived from the manifest", async () => {
    const ifo = await createHarness();
    const wrongBaseline = moduleIfo(["keep", TARGET, "extra"]);
    const wrongIfoCandidate = removeAreaFromModuleIfoAreaList(wrongBaseline, TARGET).bytes;
    const candidate = {
      ...ifo.candidate,
      moduleIfo: {
        ...ifo.candidate.moduleIfo,
        baselineBytes: wrongBaseline,
        baselineSha256: sha(wrongBaseline),
        candidateBytes: wrongIfoCandidate,
        candidateSha256: sha(wrongIfoCandidate),
      },
    };
    await expect(ifo.storage.stage(TRANSACTION_ID, MODULE_ID, candidate, LEASE))
      .rejects.toThrow("AREA_DELETE_SNAPSHOT_BASELINE_IFO_MISMATCH");

    const count = await createHarness();
    await expect(count.storage.stage(
      TRANSACTION_ID, MODULE_ID, { ...count.candidate, survivorCount: 5 }, LEASE,
    )).rejects.toThrow("AREA_DELETE_SNAPSHOT_CANDIDATE_INVALID");
  });

  it("is idempotent after publication and rejects later quarantine publication", async () => {
    const harness = await createHarness();
    await publish(harness);
    await expect(harness.storage.commitModuleIfo(
      TRANSACTION_ID, MODULE_ID, harness.candidate, LEASE,
    )).resolves.toBeUndefined();
    await harness.storage.quarantine(
      MODULE_ID, TRANSACTION_ID, ["operator quarantine"], LEASE,
    );
    expect((await harness.storage.readModuleState(MODULE_ID)).quarantined).toBe(true);
    await expect(harness.storage.commitModuleIfo(
      TRANSACTION_ID, MODULE_ID, harness.candidate, LEASE,
    )).rejects.toThrow("AREA_SNAPSHOT_MODULE_QUARANTINED");
  });

  it("certifies stage-free baseline compensation and rejects an unprovable one", async () => {
    const exact = await createHarness();
    await expect(exact.storage.compensate(
      TRANSACTION_ID, MODULE_ID, exact.candidate, LEASE,
    )).resolves.toEqual({ restored: true, diagnostics: [] });

    const changed = await createHarness();
    const bad = {
      ...changed.candidate,
      removedResources: changed.candidate.removedResources.map((entry, index) =>
        index === 0 ? { ...entry, sha256: "0".repeat(64) } : entry),
    } as AreaDeleteCompiledCandidate;
    await expect(changed.storage.compensate(
      TRANSACTION_ID, MODULE_ID, bad, LEASE,
    )).resolves.toEqual(expect.objectContaining({
      restored: false,
      diagnostics: [expect.stringContaining("STAGE_MISSING_BASELINE_UNPROVEN")],
    }));
  });

  it("verifies a durable recovery receipt and detects retained resource/survivor drift", async () => {
    const harness = await createHarness();
    await publish(harness);
    const journal = recoveryJournal(harness.candidate);
    await expect(harness.storage.verifyRecordedReadback(journal, LEASE)).resolves.toEqual({
      verified: true, diagnostics: [],
    });

    await expect(harness.storage.verifyRecordedReadback({
      ...journal,
      candidateManifest: { ...journal.candidateManifest, survivorCount: 99 },
    }, LEASE)).resolves.toEqual({
      verified: false,
      diagnostics: ["AREA_DELETE_SNAPSHOT_SURVIVOR_COUNT_MISMATCH"],
    });
  });

  it("returns semantic readback diagnostics when a forbidden entry Area survives", async () => {
    const harness = await createHarness([TARGET, "keep"]);
    await publish(harness);
    await expect(harness.storage.readBack(
      TRANSACTION_ID, MODULE_ID, harness.candidate, LEASE,
    )).resolves.toEqual(expect.objectContaining({
      verified: false,
      diagnostics: ["AREA_DELETE_ENTRY_AREA_READBACK_FAILED"],
    }));
  });
});

const MODULE_ID = "module:delete-test";
const TRANSACTION_ID = "delete-transaction-1";
const NOW = "2026-08-12T20:30:00.000Z";
const TARGET = "delete01";
const LEASE: AreaCreateModuleLease = {
  moduleId: MODULE_ID,
  leaseId: "lease-delete-1",
  ownerTransactionId: TRANSACTION_ID,
  fencingToken: 17,
  expiresAt: "2026-08-12T20:30:30.000Z",
};

async function createHarness(areaOrder: string[] = ["keep", TARGET]) {
  const guard: jest.Mocked<AreaCreateLeaseGuardPort> = {
    assertCurrent: jest.fn(async (_lease: AreaCreateModuleLease) => undefined),
  };
  const repository = new MemoryAtomicModuleSnapshotRepository(guard, () => new Date(NOW));
  const baselineIfo = moduleIfo(areaOrder);
  const baselineContents: Record<string, Buffer> = {
    "module.ifo": baselineIfo,
    [`${TARGET}.are`]: Buffer.from("delete-are"),
    [`${TARGET}.git`]: Buffer.from("delete-git"),
    [`${TARGET}.gic`]: Buffer.from("delete-gic"),
    "keep.are": Buffer.from("keep-are"),
    "keep.git": Buffer.from("keep-git"),
    "keep.gic": Buffer.from("keep-gic"),
  };
  const baseline = manifestFor(baselineContents);
  await repository.bootstrap(baseline, baselineContents, NOW);
  const candidate = candidateFixture(baselineContents, baselineIfo);
  return {
    baseline,
    candidate,
    repository,
    storage: new AtomicAreaDeleteTransactionStorageAdapter(repository, {
      nowIso: () => NOW,
    }),
  };
}

function recoveryJournal(
  candidate: AreaDeleteCompiledCandidate,
): AreaDeletePersistedJournalRecord {
  return {
    transactionId: TRANSACTION_ID,
    moduleId: MODULE_ID,
    areaResRef: TARGET,
    actorId: "actor-1",
    idempotencyKey: "delete-key",
    commandHash: "7".repeat(64),
    expectedModuleRevision: "1".repeat(64),
    previewSha256: candidate.preview.previewSha256,
    leaseId: LEASE.leaseId,
    fencingToken: LEASE.fencingToken,
    state: "readback_verified",
    candidateManifest: {
      areaId: candidate.areaId,
      previewSha256: candidate.preview.previewSha256,
      removedResources: candidate.removedResources.map(({ bytes: _bytes, ...entry }) => entry),
      moduleIfo: {
        key: candidate.moduleIfo.key,
        fileName: candidate.moduleIfo.fileName,
        resourceType: candidate.moduleIfo.resourceType,
        baselineSize: candidate.moduleIfo.baselineBytes.length,
        baselineSha256: candidate.moduleIfo.baselineSha256,
        candidateSize: candidate.moduleIfo.candidateBytes.length,
        candidateSha256: candidate.moduleIfo.candidateSha256,
      },
      survivorCount: candidate.survivorCount,
    },
    diagnostics: [],
    createdAt: NOW,
    updatedAt: NOW,
  };
}

async function publish(harness: Awaited<ReturnType<typeof createHarness>>) {
  await harness.storage.stage(TRANSACTION_ID, MODULE_ID, harness.candidate, LEASE);
  await harness.storage.commitResources(TRANSACTION_ID, MODULE_ID, harness.candidate, LEASE);
  await harness.storage.commitModuleIfo(TRANSACTION_ID, MODULE_ID, harness.candidate, LEASE);
}

function candidateFixture(
  contents: Record<string, Buffer>,
  baselineIfo: Buffer,
): AreaDeleteCompiledCandidate {
  const removedResources = (["are", "git", "gic"] as const).map((extension) => {
    const bytes = contents[`${TARGET}.${extension}`];
    return {
      extension,
      key: `${TARGET}.${extension}`,
      fileName: `${TARGET}.${extension}`,
      resourceType: extension === "are" ? 2012 : extension === "git" ? 2023 : 2046,
      bytes: Buffer.from(bytes),
      size: bytes.length,
      sha256: sha(bytes),
    };
  });
  const candidateIfo = removeAreaFromModuleIfoAreaList(baselineIfo, TARGET).bytes;
  return {
    areaId: TARGET,
    preview: {
      schemaVersion: "area-delete-preview.v1",
      scanVersion: "area-delete-impact-scan.v1",
      moduleId: MODULE_ID,
      areaResRef: TARGET,
      moduleRevision: "a".repeat(64),
      targetResources: removedResources.map((entry) => ({
        logicalKey: entry.fileName,
        resourceType: entry.resourceType,
        size: entry.size,
        sha256: entry.sha256,
      })),
      moduleIfo: {
        logicalKey: "module.ifo",
        resourceType: 2014,
        size: baselineIfo.length,
        sha256: sha(baselineIfo),
      },
      membershipCount: 1,
      entryAreaResRef: "keep",
      findings: [],
      blockerCount: 0,
      warningCount: 0,
      previewSha256: "b".repeat(64),
      expiresAt: "2026-08-12T20:35:00.000Z",
    },
    removedResources,
    moduleIfo: {
      key: "module.ifo",
      fileName: "module.ifo",
      resourceType: 2014,
      baselineBytes: Buffer.from(baselineIfo),
      baselineSha256: sha(baselineIfo),
      candidateBytes: candidateIfo,
      candidateSha256: sha(candidateIfo),
    },
    survivorCount: 4,
  };
}

function manifestFor(contents: Record<string, Buffer>): ModuleSnapshotManifest {
  return createModuleSnapshotManifest({
    moduleId: MODULE_ID,
    parentRevision: null,
    objects: Object.entries(contents).map(([logicalKey, bytes]) => ({
      logicalKey,
      resourceType: logicalKey === "module.ifo"
        ? 2014
        : logicalKey.endsWith(".are")
          ? 2012
          : logicalKey.endsWith(".git")
            ? 2023
            : 2046,
      size: bytes.length,
      sha256: sha(bytes),
    })),
  });
}

function moduleIfo(areaResRefs: string[]): Buffer {
  return buildGffBuffer([
    { label: "Mod_Entry_Area", type: "resref", value: areaResRefs[0] },
    {
      label: "Mod_Area_list",
      type: "list",
      value: areaResRefs.map((value) => ({
        typeId: 6,
        fields: [{ label: "Area_Name", type: "resref" as const, value }],
      })),
    },
  ], "IFO ", 0);
}

function sha(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}
