import { createHash } from "node:crypto";
import { MemoryAreaCreateControlStore } from "../../src/modules/areas/adapters/outbound/memory/memory-area-create-control-store";
import { MemoryAreaDeleteControlStore } from "../../src/modules/areas/adapters/outbound/memory/memory-area-delete-control-store";
import { MemoryAtomicModuleSnapshotRepository } from "../../src/modules/areas/adapters/outbound/memory/memory-atomic-module-snapshot.repository";
import { AtomicAreaDeleteTransactionStorageAdapter } from "../../src/modules/areas/adapters/outbound/snapshot/atomic-area-delete-transaction-storage.adapter";
import { moduleIfoAreaMembershipCount } from "../../src/modules/areas/adapters/outbound/blob/aurora-gff-module-ifo-area-writer";
import { AreaDeleteImpactScanner } from "../../src/modules/areas/application/area-delete-impact-scanner";
import { AreaDeleteCandidateCompiler } from "../../src/modules/areas/application/area-delete-candidate.compiler";
import { AreaDeleteTransactionCoordinator } from "../../src/modules/areas/application/area-delete-transaction.coordinator";
import { validateAndNormalizeAreaDeleteCommand } from "../../src/modules/areas/domain/area-delete-command.validation";
import { createModuleSnapshotManifest } from "../../src/modules/areas/domain/module-snapshot-manifest";
import { buildGffBuffer } from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-uti-writer";

describe("Area Delete atomic publication integration", () => {
  it("scans, compiles, removes the exact triplet/IFO membership, reads back, and replays", async () => {
    const harness = await createHarness();
    const first = await harness.coordinator.execute(harness.input);

    expect(first).toEqual({ idempotency: "created", receipt: expect.objectContaining({
      areaResRef: TARGET,
      previousModuleRevision: harness.baselineRevision,
      previewSha256: harness.previewSha256,
      survivorCount: 4,
      blockerCount: 0,
      readbackStatus: "verified",
    }) });
    const head = await harness.repository.readHead(MODULE_ID);
    expect(head?.revision).toBe(first.receipt.newModuleRevision);
    const manifest = await harness.repository.readManifest(head!.manifestKey);
    expect(manifest?.objects.map((entry) => entry.logicalKey)).toEqual([
      "keep01.are", "keep01.gic", "keep01.git", "module.ifo",
    ]);
    for (const logicalKey of ["keep01.are", "keep01.git", "keep01.gic"] as const) {
      const descriptor = manifest!.objects.find((entry) => entry.logicalKey === logicalKey)!;
      expect((await harness.repository.readContent(descriptor.contentKey))?.bytes)
        .toEqual(harness.baselineContents[logicalKey]);
    }
    const ifoDescriptor = manifest!.objects.find((entry) => entry.logicalKey === "module.ifo")!;
    const ifoBytes = (await harness.repository.readContent(ifoDescriptor.contentKey))!.bytes;
    expect(moduleIfoAreaMembershipCount(ifoBytes, TARGET)).toBe(0);
    expect(moduleIfoAreaMembershipCount(ifoBytes, "keep01")).toBe(1);

    const replay = await harness.coordinator.execute(harness.input);
    expect(replay).toEqual({ idempotency: "replayed", receipt: first.receipt });
    expect((await harness.repository.readHead(MODULE_ID))?.revision)
      .toBe(first.receipt.newModuleRevision);
  });

  it("rejects a different command still bound to the pre-delete revision", async () => {
    const harness = await createHarness();
    await harness.coordinator.execute(harness.input);
    await expect(harness.coordinator.execute({
      ...harness.input,
      idempotencyKey: "delete-integration-2",
    })).rejects.toMatchObject({
      code: "AREA_DELETE_MODULE_REVISION_CONFLICT", status: 412, mutationStarted: false,
    });
  });
});

const MODULE_ID = "workspace:delete-integration";
const TARGET = "crypt01";
const NOW = "2026-08-12T23:30:00.000Z";

async function createHarness() {
  let sequence = 0;
  const locks = new MemoryAreaCreateControlStore({
    nextLeaseId: () => `lease-${++sequence}`,
  });
  const control = new MemoryAreaDeleteControlStore(locks);
  const repository = new MemoryAtomicModuleSnapshotRepository(locks);
  const baselineContents = {
    [`${TARGET}.are`]: area(TARGET),
    [`${TARGET}.git`]: companion("GIT "),
    [`${TARGET}.gic`]: companion("GIC "),
    "keep01.are": area("keep01"),
    "keep01.git": companion("GIT "),
    "keep01.gic": companion("GIC "),
    "module.ifo": moduleIfo(),
  } as const;
  const baseline = createModuleSnapshotManifest({
    moduleId: MODULE_ID,
    parentRevision: null,
    objects: Object.entries(baselineContents).map(([logicalKey, bytes]) => ({
      logicalKey, resourceType: resourceType(logicalKey), size: bytes.length, sha256: sha(bytes),
    })),
  });
  await repository.bootstrap(baseline, baselineContents, NOW);
  const scanner = new AreaDeleteImpactScanner(repository, { nowIso: () => NOW });
  const preview = await scanner.scan({
    moduleId: MODULE_ID,
    areaResRef: TARGET,
    expectedModuleRevision: baseline.revision,
  });
  expect(preview.blockerCount).toBe(0);
  const normalized = validateAndNormalizeAreaDeleteCommand({
    schemaVersion: "area-delete-command.v1",
    moduleId: MODULE_ID,
    areaResRef: TARGET,
    expectedModuleRevision: baseline.revision,
    preview: { sha256: preview.previewSha256 },
    confirmation: { areaResRef: TARGET, policy: "block_on_references" },
    clientCommandId: "delete-integration-command-1",
  });
  if (!normalized.valid) throw new Error("Integration Delete command must remain valid.");
  const coordinator = new AreaDeleteTransactionCoordinator({
    authorization: { authorize: async () => true },
    lock: locks,
    idempotency: control,
    storage: new AtomicAreaDeleteTransactionStorageAdapter(repository, { nowIso: () => NOW }),
    compiler: new AreaDeleteCandidateCompiler({ repository, scanner }),
    journal: control,
    ids: { nextTransactionId: (() => {
      let id = 0;
      return () => `delete-tx-${++id}`;
    })() },
    clock: { nowIso: () => NOW },
  });
  return {
    repository,
    baselineContents,
    baselineRevision: baseline.revision,
    previewSha256: preview.previewSha256,
    coordinator,
    input: {
      actorId: "admin-1",
      idempotencyKey: "delete-integration-1",
      ifMatchHeader: `"${baseline.revision}"`,
      command: normalized.value,
      commandHash: normalized.commandHash,
    },
  };
}

function area(resRef: string): Buffer {
  return buildGffBuffer([
    { label: "ResRef", type: "resref", value: resRef },
    { label: "Tag", type: "cexostring", value: resRef },
    { label: "Width", type: "int", value: 1 },
    { label: "Height", type: "int", value: 1 },
    { label: "Tileset", type: "resref", value: "tin01" },
    { label: "Tile_List", type: "list", value: [{
      typeId: 1,
      fields: [
        { label: "Tile_ID", type: "int" as const, value: 0 },
        { label: "Tile_Orientation", type: "int" as const, value: 0 },
        { label: "Tile_Height", type: "int" as const, value: 0 },
      ],
    }] },
  ], "ARE ", 0);
}

function companion(fileType: "GIT " | "GIC "): Buffer {
  return buildGffBuffer([
    { label: "Creature List", type: "list", value: [] },
  ], fileType, 0);
}

function moduleIfo(): Buffer {
  return buildGffBuffer([
    { label: "Mod_Entry_Area", type: "resref", value: "keep01" },
    {
      label: "Mod_Area_list",
      type: "list",
      value: ["keep01", TARGET].map((value) => ({
        typeId: 6,
        fields: [{ label: "Area_Name", type: "resref" as const, value }],
      })),
    },
  ], "IFO ", 0);
}

function resourceType(logicalKey: string): number {
  if (logicalKey.endsWith(".are")) return 2012;
  if (logicalKey.endsWith(".git")) return 2023;
  if (logicalKey.endsWith(".gic")) return 2046;
  return 2014;
}

function sha(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}
