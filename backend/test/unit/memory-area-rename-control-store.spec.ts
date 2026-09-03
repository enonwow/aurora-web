import { MemoryAreaCreateControlStore } from "../../src/modules/areas/adapters/outbound/memory/memory-area-create-control-store";
import { MemoryAreaRenameControlStore } from "../../src/modules/areas/adapters/outbound/memory/memory-area-rename-control-store";

const MODULE_ID = "module:rename-control";
const TRANSACTION_ID = "rename-control-tx";
const NOW = "2026-08-24T16:00:00.000Z";

describe("MemoryAreaRenameControlStore", () => {
  it("durably transitions through verified readback and retains idempotent receipt", async () => {
    const locks = new MemoryAreaCreateControlStore({ now: () => new Date(NOW) });
    const store = new MemoryAreaRenameControlStore(locks, { now: () => new Date(NOW) });
    const lease = await locks.acquire(MODULE_ID, TRANSACTION_ID);
    if (!lease) throw new Error("Expected lease.");
    const record = journalRecord(lease);
    const receipt = receiptFixture();

    await store.begin(record);
    await store.transition(TRANSACTION_ID, "staged", lease);
    await store.transition(TRANSACTION_ID, "resources_committed", lease);
    await store.transition(TRANSACTION_ID, "ifo_committed", lease);
    await store.recordReadback(TRANSACTION_ID, lease, receipt);
    await store.finalize(TRANSACTION_ID, lease, {
      moduleId: MODULE_ID,
      key: "rename-key",
      commandHash: "1".repeat(64),
      createdAt: NOW,
      result: receipt,
    });

    await expect(store.read(MODULE_ID, "rename-key")).resolves.toMatchObject({ result: receipt });
    await expect(store.readJournal(TRANSACTION_ID)).resolves.toMatchObject({
      state: "complete",
      areaResRef: "old_area",
      targetAreaResRef: "new_area",
      candidateManifest: {
        baselineRevision: "a".repeat(64),
        successorRevision: "b".repeat(64),
      },
    });
  });

  it("rejects a transaction ID rebound to another target", async () => {
    const locks = new MemoryAreaCreateControlStore({ now: () => new Date(NOW) });
    const store = new MemoryAreaRenameControlStore(locks, { now: () => new Date(NOW) });
    const lease = await locks.acquire(MODULE_ID, TRANSACTION_ID);
    if (!lease) throw new Error("Expected lease.");
    await store.begin(journalRecord(lease));

    await expect(store.begin({
      ...journalRecord(lease),
      targetAreaResRef: "other",
    })).rejects.toThrow("AREA_RENAME_JOURNAL_CONFLICT");
  });
});

function journalRecord(lease: NonNullable<Awaited<ReturnType<MemoryAreaCreateControlStore["acquire"]>>>) {
  return {
    transactionId: TRANSACTION_ID,
    moduleId: MODULE_ID,
    areaResRef: "old_area",
    targetAreaResRef: "new_area",
    actorId: "admin-01",
    idempotencyKey: "rename-key",
    commandHash: "1".repeat(64),
    expectedModuleRevision: "a".repeat(64),
    previewSha256: "2".repeat(64),
    leaseId: lease.leaseId,
    fencingToken: lease.fencingToken,
    candidate: {
      areaId: "old_area",
      targetAreaId: "new_area",
      preview: { previewSha256: "2".repeat(64), entryAreaResRef: "old_area" },
      resources: ["are", "gic", "git"].map((extension) => ({
        extension,
        sourceKey: `old_area.${extension}`,
        targetKey: `new_area.${extension}`,
        resourceType: extension === "are" ? 2012 : extension === "git" ? 2023 : 2046,
        baselineSize: 1,
        baselineSha256: "3".repeat(64),
        candidateSize: 1,
        candidateSha256: "4".repeat(64),
      })),
      moduleIfo: {
        key: "module.ifo",
        resourceType: 2014,
        baselineSize: 2,
        baselineSha256: "5".repeat(64),
        candidateSize: 2,
        candidateSha256: "6".repeat(64),
      },
      entryAreaUpdated: true,
      survivorCount: 4,
      baselineManifest: { revision: "a".repeat(64) },
      successorManifest: { revision: "b".repeat(64) },
    } as never,
    createdAt: NOW,
  };
}

function receiptFixture() {
  return {
    schemaVersion: "area-rename-receipt.v1" as const,
    transactionId: TRANSACTION_ID,
    moduleId: MODULE_ID,
    areaResRef: "old_area",
    targetAreaResRef: "new_area",
    previousModuleRevision: "a".repeat(64),
    newModuleRevision: "b".repeat(64),
    commandHash: "1".repeat(64),
    previewSha256: "2".repeat(64),
    scanVersion: "area-rename-impact-scan.v1",
    resources: (["are", "gic", "git"] as const).map((extension) => ({
      extension,
      sourceKey: `old_area.${extension}`,
      targetKey: `new_area.${extension}`,
      resourceType: extension === "are" ? 2012 : extension === "git" ? 2023 : 2046,
      baselineSize: 1,
      baselineSha256: "3".repeat(64),
      candidateSize: 1,
      candidateSha256: "4".repeat(64),
    })),
    moduleIfo: {
      key: "module.ifo" as const,
      baselineSize: 2,
      baselineSha256: "5".repeat(64),
      candidateSize: 2,
      candidateSha256: "6".repeat(64),
    },
    entryAreaUpdated: true,
    blockerCount: 0 as const,
    warningCount: 0,
    readbackStatus: "verified" as const,
    warnings: [],
    renamedAt: NOW,
  };
}
