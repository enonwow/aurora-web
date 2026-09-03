import { createHash } from "node:crypto";
import { AuroraAreaUpdatePersistedReadbackVerifier } from "../../src/modules/areas/adapters/outbound/blob/aurora-area-update-persisted-readback-verifier";
import {
  parseAreaVariablesFromGitGff,
} from "../../src/modules/areas/adapters/outbound/blob/aurora-gff-area-parser";
import { updateGitAreaVariables } from "../../src/modules/areas/adapters/outbound/blob/aurora-gff-area-variable-writer";
import { MemoryAreaCreateControlStore } from "../../src/modules/areas/adapters/outbound/memory/memory-area-create-control-store";
import { MemoryAreaLifecycleMutationControlStore } from "../../src/modules/areas/adapters/outbound/memory/memory-area-lifecycle-mutation-control-store";
import { MemoryAtomicModuleSnapshotRepository } from "../../src/modules/areas/adapters/outbound/memory/memory-atomic-module-snapshot.repository";
import { AtomicAreaCreateTransactionStorageAdapter } from "../../src/modules/areas/adapters/outbound/snapshot/atomic-area-create-transaction-storage.adapter";
import { AreaUpdateTransactionCoordinator } from "../../src/modules/areas/application/area-update-transaction.coordinator";
import { validateAndNormalizeAreaUpdateCommand } from "../../src/modules/areas/domain/area-update-command.validation";
import type { AreaUpdateCompiledCandidate } from "../../src/modules/areas/domain/area-update-transaction.types";
import { createModuleSnapshotManifest } from "../../src/modules/areas/domain/module-snapshot-manifest";
import {
  buildGffBuffer,
  type SupportedGffField,
} from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-uti-writer";

const MODULE_ID = "workspace:variables-integration";
const AREA = "crypt01";
const NOW = "2026-08-24T12:00:00.000Z";

describe("Area variables atomic publication integration", () => {
  it("publishes one provenance-bound GIT successor and independently reads back the complete table", async () => {
    const controls = new MemoryAreaCreateControlStore({
      nextLeaseId: () => "lease-variables-1",
    });
    const lifecycle = new MemoryAreaLifecycleMutationControlStore(controls);
    const repository = new MemoryAtomicModuleSnapshotRepository(controls);
    const baselineAre = areaBytes();
    const baselineGit = gitBytes();
    const baselineGic = gicBytes();
    const baselineIfo = moduleIfoBytes();
    const baselineContents = Object.freeze({
      [`${AREA}.are`]: baselineAre,
      [`${AREA}.git`]: baselineGit,
      [`${AREA}.gic`]: baselineGic,
      "module.ifo": baselineIfo,
    });
    const manifest = createModuleSnapshotManifest({
      moduleId: MODULE_ID,
      parentRevision: null,
      objects: Object.entries(baselineContents).map(([logicalKey, bytes]) => ({
        logicalKey,
        resourceType: resourceType(logicalKey),
        size: bytes.length,
        sha256: sha(bytes),
      })),
    });
    await repository.bootstrap(manifest, baselineContents, NOW);

    const expectedEntries = sourceEntries();
    const entries = targetEntries();
    const candidateGit = updateGitAreaVariables(baselineGit, {
      expectedEntries,
      entries,
      sourceGitSha256: sha(baselineGit),
    }).bytes;
    const candidate: AreaUpdateCompiledCandidate = Object.freeze({
      areaId: AREA,
      sourceAreaSha256: sha(baselineAre),
      candidateAreaSha256: sha(baselineAre),
      setFingerprintSha256: "e".repeat(64),
      projectedDraft: Object.freeze({
        areaResRef: AREA,
        name: "Crypt",
        width: 2,
        height: 2,
        tilesetResRef: "tin01",
        tilesetFingerprint: "e".repeat(64),
        areaFingerprint: sha(baselineAre),
        variables: Object.freeze({
          expectedEntries,
          entries,
          sourceGitSha256: sha(baselineGit),
        }),
        tiles: tiles(),
      }),
      variableMutation: Object.freeze({
        expectedEntries,
        entries,
        sourceGitSha256: sha(baselineGit),
        candidateGitSha256: sha(candidateGit),
      }),
      resources: Object.freeze([
        resource("are", 2012, baselineAre),
        resource("git", 2023, candidateGit),
        resource("gic", 2046, baselineGic),
      ]),
      moduleIfo: Object.freeze({
        key: "module.ifo",
        fileName: "module.ifo",
        resourceType: 2014,
        baselineBytes: Buffer.from(baselineIfo),
        baselineSha256: sha(baselineIfo),
        candidateBytes: Buffer.from(baselineIfo),
        candidateSha256: sha(baselineIfo),
      }),
    });
    const normalized = validateAndNormalizeAreaUpdateCommand({
      schemaVersion: "area-update-command.v1",
      moduleId: MODULE_ID,
      areaResRef: AREA,
      expectedModuleRevision: manifest.revision,
      draft: { id: "variable-draft-1", revision: 1, normalizedSha256: "d".repeat(64) },
      clientCommandId: "variable-client-command-1",
    });
    if (!normalized.valid) throw new Error("Variable integration command must be valid.");
    const readbackVerifier = new AuroraAreaUpdatePersistedReadbackVerifier();
    const coordinator = new AreaUpdateTransactionCoordinator({
      authorization: { authorize: async () => true },
      lock: controls,
      idempotency: lifecycle,
      storage: new AtomicAreaCreateTransactionStorageAdapter(repository, readbackVerifier),
      compiler: { compile: jest.fn(async () => candidate) },
      tileAdmission: {
        evaluateProductionAdmission: async () => ({
          allowed: true as const,
          code: "AREA_TILE_PRODUCTION_ADMITTED" as const,
          tilesetResRef: "tin01",
          tileIds: Object.freeze([12]),
          diagnostics: Object.freeze([]) as readonly [],
          admission: Object.freeze({
            schemaVersion: "area-tile-production-admission.v1" as const,
            policyVersion: "area-tile-production-admission-policy.v1" as const,
            reportGeneratedAtIso: NOW,
            planId: "variables-integration-plan",
            corpusHash: "c".repeat(64),
            profileId: "source-bound-v8",
            ledgerSha256: "3".repeat(64),
            reportSha256: "4".repeat(64),
            tilesetResRef: "tin01",
            uniqueTileIdCount: 1,
            tileIdSetSha256: "5".repeat(64),
          }),
        }),
      },
      journal: lifecycle,
      ids: { nextTransactionId: () => "variables-update-tx-1" },
      clock: { nowIso: () => NOW },
    });

    const result = await coordinator.execute({
      actorId: "admin-1",
      idempotencyKey: "update-area-variables-integration-1",
      ifMatchHeader: `"${manifest.revision}"`,
      command: normalized.value,
      commandHash: normalized.commandHash,
    });

    const head = await repository.readHead(MODULE_ID);
    const publishedManifest = await repository.readManifest(head!.manifestKey);
    const read = async (logicalKey: string) => {
      const descriptor = publishedManifest!.objects.find(
        (entry) => entry.logicalKey === logicalKey,
      )!;
      return (await repository.readContent(descriptor.contentKey))!.bytes;
    };
    const publishedGit = await read(`${AREA}.git`);
    expect(parseAreaVariablesFromGitGff(publishedGit)).toEqual({
      expectedEntries: entries.map((entry, sourceIndex) => ({ ...entry, sourceIndex })),
    });
    expect(await read(`${AREA}.are`)).toEqual(baselineAre);
    expect(await read(`${AREA}.gic`)).toEqual(baselineGic);
    expect(await read("module.ifo")).toEqual(baselineIfo);
    expect(result.receipt).toMatchObject({
      readbackStatus: "verified",
      variableMutation: {
        expectedEntries,
        entries,
        sourceGitSha256: sha(baselineGit),
        candidateGitSha256: sha(candidateGit),
      },
    });
    expect(result.receipt.unchangedCompanions).toBeUndefined();
    expect(head?.revision).toBe(result.receipt.newModuleRevision);
  });
});

function sourceEntries() {
  return Object.freeze([
    Object.freeze({ sourceIndex: 0, name: "COUNT", type: "int" as const, value: 3 }),
    Object.freeze({ sourceIndex: 1, name: "TEXT", type: "string" as const, value: "old" }),
  ]);
}

function targetEntries() {
  return Object.freeze([
    Object.freeze({ name: "TEXT", type: "string" as const, value: "updated" }),
    Object.freeze({ name: "COUNT", type: "int" as const, value: 7 }),
    Object.freeze({ name: "RATIO", type: "float" as const, value: Math.fround(-2.5) }),
  ]);
}

function gitBytes(): Buffer {
  return buildGffBuffer([
    variableField(sourceEntries()),
    ...objectListFields(),
  ], "GIT ", 0xffff_ffff);
}

function variableField(entries: ReturnType<typeof sourceEntries>): SupportedGffField {
  return {
    label: "VarTable",
    type: "list",
    value: entries.map((entry) => ({
      typeId: 0,
      fields: [
        { label: "Name", type: "cexostring", value: entry.name },
        { label: "Type", type: "dword", value: entry.type === "int" ? 1 : 3 },
        entry.type === "int"
          ? { label: "Value", type: "int", value: entry.value }
          : { label: "Value", type: "cexostring", value: entry.value },
      ],
    })),
  };
}

function areaBytes(): Buffer {
  return buildGffBuffer([
    { label: "ResRef", type: "resref", value: AREA },
    { label: "Name", type: "cexolocstring", value: { text: "Crypt" } },
    { label: "Tag", type: "cexostring", value: AREA },
    { label: "Width", type: "int", value: 2 },
    { label: "Height", type: "int", value: 2 },
    { label: "Tileset", type: "resref", value: "tin01" },
    {
      label: "Tile_List",
      type: "list",
      value: Array.from({ length: 4 }, () => ({
        typeId: 0,
        fields: [
          { label: "Tile_ID", type: "int" as const, value: 12 },
          { label: "Tile_Orientation", type: "int" as const, value: 0 },
          { label: "Tile_Height", type: "int" as const, value: 0 },
        ],
      })),
    },
  ], "ARE ", 0xffff_ffff);
}

function gicBytes(): Buffer {
  return buildGffBuffer(objectListFields(), "GIC ", 0xffff_ffff);
}

function objectListFields(): SupportedGffField[] {
  return [
    "Creature List", "Door List", "Encounter List", "List", "Placeable List",
    "SoundList", "StoreList", "TriggerList", "WaypointList",
  ].map((label) => ({ label, type: "list", value: [] }));
}

function moduleIfoBytes(): Buffer {
  return buildGffBuffer([{
    label: "Mod_Area_list",
    type: "list",
    value: [{
      typeId: 6,
      fields: [{ label: "Area_Name", type: "resref", value: AREA }],
    }],
  }], "IFO ", 0xffff_ffff);
}

function tiles() {
  return Object.freeze(Array.from({ length: 4 }, (_, index) => Object.freeze({
    row: Math.floor(index / 2),
    col: index % 2,
    sourceRow: Math.floor(index / 2),
    sourceCol: index % 2,
    tileId: 12,
    orientation: 0,
    height: 0,
    mainLight1: 0,
    mainLight2: 0,
    sourceLight1: 0,
    sourceLight2: 0,
    animLoop1: 1,
    animLoop2: 1,
    animLoop3: 1,
  })));
}

function resource(
  extension: "are" | "git" | "gic",
  resourceTypeValue: number,
  bytes: Buffer,
) {
  return Object.freeze({
    extension,
    key: `${AREA}.${extension}`,
    fileName: `${AREA}.${extension}`,
    resourceType: resourceTypeValue,
    bytes: Buffer.from(bytes),
    size: bytes.length,
    sha256: sha(bytes),
  });
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
