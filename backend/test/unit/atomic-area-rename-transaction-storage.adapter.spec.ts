import { createHash } from "node:crypto";
import { AtomicAreaRenameTransactionStorageAdapter } from "../../src/modules/areas/adapters/outbound/snapshot/atomic-area-rename-transaction-storage.adapter";
import { AreaRenameCandidateCompiler } from "../../src/modules/areas/application/area-rename-candidate.compiler";
import { AreaRenameImpactScanner } from "../../src/modules/areas/application/area-rename-impact-scanner";
import { MemoryAtomicModuleSnapshotRepository } from "../../src/modules/areas/adapters/outbound/memory/memory-atomic-module-snapshot.repository";
import type { AreaCreateLeaseGuardPort } from "../../src/modules/areas/application/ports/atomic-module-snapshot.port";
import type { AreaCreateModuleLease } from "../../src/modules/areas/application/ports/area-create-transaction.port";
import type {
  AreaRenamePersistedJournalRecord,
  AreaRenameReadbackResult,
} from "../../src/modules/areas/domain/area-rename-transaction.types";
import { createModuleSnapshotManifest } from "../../src/modules/areas/domain/module-snapshot-manifest";
import { buildGffBuffer } from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-uti-writer";

const MODULE_ID = "module:rename-storage";
const SOURCE = "old_area";
const TARGET = "new_area";
const TRANSACTION_ID = "rename-transaction-1";
const NOW = "2026-08-24T14:00:00.000Z";
const LEASE: AreaCreateModuleLease = {
  moduleId: MODULE_ID,
  leaseId: "lease-rename-1",
  ownerTransactionId: TRANSACTION_ID,
  fencingToken: 23,
  expiresAt: "2026-08-24T14:00:30.000Z",
};

describe("AtomicAreaRenameTransactionStorageAdapter", () => {
  it("keeps baseline visible until one CAS publishes the complete rename", async () => {
    const harness = await createHarness();

    await harness.storage.stage(TRANSACTION_ID, MODULE_ID, harness.candidate, LEASE);
    await harness.storage.commitResources(TRANSACTION_ID, MODULE_ID, harness.candidate, LEASE);
    expect((await harness.repository.readHead(MODULE_ID))?.revision).toBe(harness.baseline.revision);

    await harness.storage.commitModuleIfo(TRANSACTION_ID, MODULE_ID, harness.candidate, LEASE);
    const head = await harness.repository.readHead(MODULE_ID);
    expect(head?.revision).toBe(harness.candidate.successorManifest.revision);
    const manifest = await harness.repository.readManifest(head!.manifestKey);
    expect(manifest?.objects.map((entry) => entry.logicalKey)).toEqual([
      "keep01.are", "keep01.gic", "keep01.git", "module.ifo",
      "new_area.are", "new_area.gic", "new_area.git",
    ]);

    await expect(harness.storage.readBack(
      TRANSACTION_ID, MODULE_ID, harness.candidate, LEASE,
    )).resolves.toMatchObject({
      verified: true,
      newModuleRevision: harness.candidate.successorManifest.revision,
      survivorCount: 4,
      entryAreaUpdated: true,
      diagnostics: [],
    });
  });

  it("stages idempotently and rejects a changed candidate", async () => {
    const harness = await createHarness();
    await harness.storage.stage(TRANSACTION_ID, MODULE_ID, harness.candidate, LEASE);
    await expect(harness.storage.stage(
      TRANSACTION_ID, MODULE_ID, harness.candidate, LEASE,
    )).resolves.toBeUndefined();

    const changed = {
      ...harness.candidate,
      resources: harness.candidate.resources.map((entry, index) => index === 0
        ? { ...entry, candidateSha256: "0".repeat(64) }
        : entry),
    };
    await expect(harness.storage.stage(
      TRANSACTION_ID, MODULE_ID, changed, LEASE,
    )).rejects.toThrow("AREA_RENAME_SNAPSHOT_CANDIDATE_INVALID");
  });

  it("restores the exact baseline after publication", async () => {
    const harness = await createHarness();
    await publish(harness);
    const recoveryLease = { ...LEASE, leaseId: "lease-recovery", fencingToken: 24 };

    await expect(harness.storage.compensate(
      TRANSACTION_ID, MODULE_ID, harness.candidate, recoveryLease,
    )).resolves.toEqual({ restored: true, diagnostics: [] });
    expect((await harness.repository.readHead(MODULE_ID))?.revision).toBe(harness.baseline.revision);
  });

  it("independently reverifies the persisted successor and durable receipt during recovery", async () => {
    const harness = await createHarness();
    await publish(harness);
    const readback = await harness.storage.readBack(
      TRANSACTION_ID, MODULE_ID, harness.candidate, LEASE,
    );
    const journal = recoveryJournal(harness, readback, "readback_verified");
    const recoveryLease = { ...LEASE, leaseId: "lease-recovery", fencingToken: 24 };

    await expect(
      harness.storage.verifyRecordedReadback(journal, recoveryLease),
    ).resolves.toEqual({ verified: true, diagnostics: [] });
  });

  it("proves a stage-free baseline only from exact byte-free journal descriptors", async () => {
    const harness = await createHarness();
    const journal = recoveryJournal(harness, null, "prepared");
    const recoveryLease = { ...LEASE, leaseId: "lease-recovery", fencingToken: 24 };

    await expect(
      harness.storage.compensate(journal, recoveryLease),
    ).resolves.toEqual({ restored: true, diagnostics: [] });

    const changed = {
      ...journal,
      candidateManifest: {
        ...journal.candidateManifest,
        resources: journal.candidateManifest.resources.map((entry, index) =>
          index === 0 ? { ...entry, baselineSha256: "0".repeat(64) } : entry,
        ),
      },
    } as AreaRenamePersistedJournalRecord;
    await expect(harness.storage.compensate(changed, recoveryLease)).resolves.toMatchObject({
      restored: false,
      diagnostics: [expect.stringContaining("AREA_RENAME_SNAPSHOT_STAGE_MISSING_BASELINE_UNPROVEN")],
    });
  });

  it("rejects lease scope mismatch and a baseline that drifted from the candidate", async () => {
    const harness = await createHarness();
    await expect(harness.storage.stage(
      TRANSACTION_ID,
      MODULE_ID,
      harness.candidate,
      { ...LEASE, ownerTransactionId: "other" },
    )).rejects.toThrow("AREA_RENAME_SNAPSHOT_STAGE_IDENTITY_MISMATCH");

    const changed = {
      ...harness.candidate,
      baselineManifest: { ...harness.candidate.baselineManifest, revision: "0".repeat(64) },
    };
    await expect(harness.storage.stage(
      TRANSACTION_ID, MODULE_ID, changed, LEASE,
    )).rejects.toThrow("AREA_RENAME_SNAPSHOT_CANDIDATE_INVALID");
  });
});

async function publish(harness: Awaited<ReturnType<typeof createHarness>>) {
  await harness.storage.stage(TRANSACTION_ID, MODULE_ID, harness.candidate, LEASE);
  await harness.storage.commitResources(TRANSACTION_ID, MODULE_ID, harness.candidate, LEASE);
  await harness.storage.commitModuleIfo(TRANSACTION_ID, MODULE_ID, harness.candidate, LEASE);
}

async function createHarness() {
  const guard: jest.Mocked<AreaCreateLeaseGuardPort> = {
    assertCurrent: jest.fn(async (_lease: AreaCreateModuleLease) => undefined),
  };
  const repository = new MemoryAtomicModuleSnapshotRepository(guard, () => new Date(NOW));
  const contents = moduleContents();
  const baseline = createModuleSnapshotManifest({
    moduleId: MODULE_ID,
    parentRevision: null,
    objects: Object.entries(contents).map(([logicalKey, bytes]) => ({
      logicalKey,
      resourceType: resourceType(logicalKey),
      size: bytes.length,
      sha256: sha(bytes),
    })),
  });
  await repository.bootstrap(baseline, contents, NOW);
  const scanner = new AreaRenameImpactScanner(repository, { nowIso: () => NOW });
  const preview = await scanner.scan({
    moduleId: MODULE_ID,
    areaResRef: SOURCE,
    targetAreaResRef: TARGET,
    expectedModuleRevision: baseline.revision,
  });
  const compiler = new AreaRenameCandidateCompiler({ repository, scanner });
  const candidate = await compiler.compile({
    schemaVersion: "area-rename-command.v1",
    moduleId: MODULE_ID,
    areaResRef: SOURCE,
    targetAreaResRef: TARGET,
    expectedModuleRevision: baseline.revision,
    preview: { sha256: preview.previewSha256 },
    confirmation: {
      sourceAreaResRef: SOURCE,
      targetAreaResRef: TARGET,
      policy: "block_on_references",
    },
    clientCommandId: "client-01",
  }, {
    moduleId: MODULE_ID,
    revision: baseline.revision,
    quarantined: false,
  }, "admin-01", TRANSACTION_ID);
  return {
    baseline,
    candidate,
    repository,
    storage: new AtomicAreaRenameTransactionStorageAdapter(repository, { nowIso: () => NOW }),
  };
}

function moduleContents(): Record<string, Buffer> {
  return {
    "old_area.are": buildGffBuffer([{ label: "ResRef", type: "resref", value: SOURCE }], "ARE ", 0),
    "old_area.git": buildGffBuffer([], "GIT ", 0),
    "old_area.gic": buildGffBuffer([], "GIC ", 0),
    "keep01.are": buildGffBuffer([{ label: "ResRef", type: "resref", value: "keep01" }], "ARE ", 0),
    "keep01.git": buildGffBuffer([], "GIT ", 0),
    "keep01.gic": buildGffBuffer([], "GIC ", 0),
    "module.ifo": buildGffBuffer([
      { label: "Mod_Entry_Area", type: "resref", value: SOURCE },
      {
        label: "Mod_Area_list", type: "list",
        value: [SOURCE, "keep01"].map((area) => ({
          typeId: 6,
          fields: [{ label: "Area_Name", type: "resref" as const, value: area }],
        })),
      },
    ], "IFO ", 0),
  };
}

function resourceType(logicalKey: string): number {
  if (logicalKey === "module.ifo") return 2014;
  if (logicalKey.endsWith(".are")) return 2012;
  if (logicalKey.endsWith(".git")) return 2023;
  return 2046;
}

function sha(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function recoveryJournal(
  harness: Awaited<ReturnType<typeof createHarness>>,
  readback: AreaRenameReadbackResult | null,
  state: AreaRenamePersistedJournalRecord["state"],
): AreaRenamePersistedJournalRecord {
  const candidate = harness.candidate;
  const candidateManifest = {
    areaId: candidate.areaId,
    targetAreaId: candidate.targetAreaId,
    previewSha256: candidate.preview.previewSha256,
    resources: candidate.resources.map((resource) => ({
      extension: resource.extension,
      sourceKey: resource.sourceKey,
      targetKey: resource.targetKey,
      resourceType: resource.resourceType,
      baselineSize: resource.baselineSize,
      baselineSha256: resource.baselineSha256,
      candidateSize: resource.candidateSize,
      candidateSha256: resource.candidateSha256,
    })),
    moduleIfo: {
      key: candidate.moduleIfo.key,
      resourceType: candidate.moduleIfo.resourceType,
      baselineSize: candidate.moduleIfo.baselineSize,
      baselineSha256: candidate.moduleIfo.baselineSha256,
      candidateSize: candidate.moduleIfo.candidateSize,
      candidateSha256: candidate.moduleIfo.candidateSha256,
    },
    entryAreaUpdated: candidate.entryAreaUpdated,
    entryAreaResRef: candidate.preview.entryAreaResRef,
    survivorCount: candidate.survivorCount,
    baselineRevision: candidate.baselineManifest.revision,
    successorRevision: candidate.successorManifest.revision,
  };
  const receipt = readback ? {
    schemaVersion: "area-rename-receipt.v1" as const,
    transactionId: TRANSACTION_ID,
    moduleId: MODULE_ID,
    areaResRef: SOURCE,
    targetAreaResRef: TARGET,
    previousModuleRevision: candidate.baselineManifest.revision,
    newModuleRevision: readback.newModuleRevision,
    commandHash: "7".repeat(64),
    previewSha256: candidate.preview.previewSha256,
    scanVersion: candidate.preview.scanVersion,
    resources: readback.resources,
    moduleIfo: readback.moduleIfo,
    entryAreaUpdated: readback.entryAreaUpdated,
    blockerCount: 0 as const,
    warningCount: candidate.preview.warningCount,
    readbackStatus: "verified" as const,
    warnings: [],
    renamedAt: NOW,
  } : undefined;
  return {
    transactionId: TRANSACTION_ID,
    moduleId: MODULE_ID,
    areaResRef: SOURCE,
    targetAreaResRef: TARGET,
    actorId: "admin-01",
    idempotencyKey: "rename-key",
    commandHash: "7".repeat(64),
    expectedModuleRevision: candidate.baselineManifest.revision,
    previewSha256: candidate.preview.previewSha256,
    leaseId: LEASE.leaseId,
    fencingToken: LEASE.fencingToken,
    state,
    candidateManifest,
    ...(receipt ? { receipt } : {}),
    diagnostics: [],
    createdAt: NOW,
    updatedAt: NOW,
  };
}
