import { createHash } from "node:crypto";
import { AuroraAreaUpdatePersistedReadbackVerifier } from "../../src/modules/areas/adapters/outbound/blob/aurora-area-update-persisted-readback-verifier";
import { updateGitAreaAudioEnvironment } from "../../src/modules/areas/adapters/outbound/blob/aurora-gff-area-audio-writer";
import { parseAreaAudioEnvironmentFromGitGff } from "../../src/modules/areas/adapters/outbound/blob/aurora-gff-area-parser";
import { AtomicAreaCreateTransactionStorageAdapter } from "../../src/modules/areas/adapters/outbound/snapshot/atomic-area-create-transaction-storage.adapter";
import { MemoryAreaCreateControlStore } from "../../src/modules/areas/adapters/outbound/memory/memory-area-create-control-store";
import { MemoryAreaLifecycleMutationControlStore } from "../../src/modules/areas/adapters/outbound/memory/memory-area-lifecycle-mutation-control-store";
import { MemoryAtomicModuleSnapshotRepository } from "../../src/modules/areas/adapters/outbound/memory/memory-atomic-module-snapshot.repository";
import { AreaUpdateTransactionCoordinator } from "../../src/modules/areas/application/area-update-transaction.coordinator";
import { validateAndNormalizeAreaUpdateCommand } from "../../src/modules/areas/domain/area-update-command.validation";
import type { AreaUpdateCompiledCandidate } from "../../src/modules/areas/domain/area-update-transaction.types";
import { createModuleSnapshotManifest } from "../../src/modules/areas/domain/module-snapshot-manifest";
import {
  buildGffBuffer,
  type SupportedGffField,
} from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-uti-writer";

const MODULE_ID = "workspace:audio-integration";
const AREA = "crypt01";
const NOW = "2026-08-22T12:00:00.000Z";

describe("Area audio atomic publication integration", () => {
  it("publishes one provenance-bound GIT successor and independently reads back all nine fields", async () => {
    const controls = new MemoryAreaCreateControlStore({
      nextLeaseId: () => "lease-audio-1",
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

    const expectedValue = audioEnvironment();
    const value = Object.freeze({
      ...expectedValue,
      ambientSoundNightVolume: 77,
      musicDelayMilliseconds: -4000,
    });
    const candidateGit = updateGitAreaAudioEnvironment(baselineGit, {
      expectedValue,
      value,
    }).bytes;
    const tiles = Object.freeze(Array.from({ length: 4 }, (_, index) => Object.freeze({
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
        audioEnvironment: Object.freeze({
          expectedValue,
          value,
          sourceGitSha256: sha(baselineGit),
        }),
        tiles,
      }),
      audioEnvironmentMutation: Object.freeze({
        expectedValue,
        value,
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
    const command = validateAndNormalizeAreaUpdateCommand({
      schemaVersion: "area-update-command.v1",
      moduleId: MODULE_ID,
      areaResRef: AREA,
      expectedModuleRevision: manifest.revision,
      draft: { id: "audio-draft-1", revision: 1, normalizedSha256: "d".repeat(64) },
      clientCommandId: "audio-client-command-1",
    });
    if (!command.valid) throw new Error("Audio integration command must be valid.");
    const readbackVerifier = new AuroraAreaUpdatePersistedReadbackVerifier();
    expect(await readbackVerifier.verify({
      areaId: AREA,
      resources: candidate.resources,
      moduleIfo: {
        key: "module.ifo",
        size: baselineIfo.length,
        sha256: sha(baselineIfo),
        bytes: baselineIfo,
      },
    })).toEqual({ valid: true, diagnostics: [] });
    const compiler = { compile: jest.fn(async () => candidate) };
    const coordinator = new AreaUpdateTransactionCoordinator({
      authorization: { authorize: async () => true },
      lock: controls,
      idempotency: lifecycle,
      storage: new AtomicAreaCreateTransactionStorageAdapter(
        repository,
        readbackVerifier,
      ),
      compiler,
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
            planId: "audio-integration-plan",
            corpusHash: "c".repeat(64),
            profileId: "source-bound-v7",
            ledgerSha256: "3".repeat(64),
            reportSha256: "4".repeat(64),
            tilesetResRef: "tin01",
            uniqueTileIdCount: 1,
            tileIdSetSha256: "5".repeat(64),
          }),
        }),
      },
      journal: lifecycle,
      ids: { nextTransactionId: () => "audio-update-tx-1" },
      clock: { nowIso: () => NOW },
    });

    const result = await coordinator.execute({
      actorId: "admin-1",
      idempotencyKey: "audio-update-integration-1",
      ifMatchHeader: `"${manifest.revision}"`,
      command: command.value,
      commandHash: command.commandHash,
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
    expect(parseAreaAudioEnvironmentFromGitGff(publishedGit)).toEqual(value);
    expect(await read(`${AREA}.are`)).toEqual(baselineAre);
    expect(await read(`${AREA}.gic`)).toEqual(baselineGic);
    expect(await read("module.ifo")).toEqual(baselineIfo);
    expect(result.receipt).toMatchObject({
      readbackStatus: "verified",
      audioEnvironmentMutation: {
        expectedValue,
        value,
        sourceGitSha256: sha(baselineGit),
        candidateGitSha256: sha(candidateGit),
      },
    });
    expect(result.receipt.unchangedCompanions).toBeUndefined();
    expect(head?.revision).toBe(result.receipt.newModuleRevision);
  });
});

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
  ], "ARE ", 0xffffffff);
}

function gitBytes(): Buffer {
  const fields = objectListFields();
  fields.push({
    label: "AreaProperties",
    type: "struct",
    value: {
      typeId: 100,
      fields: [
        { label: "AmbientSndDay", type: "int", value: 41 },
        { label: "AmbientSndNight", type: "int", value: 42 },
        { label: "AmbientSndDayVol", type: "int", value: 101 },
        { label: "AmbientSndNitVol", type: "int", value: 102 },
        { label: "EnvAudio", type: "int", value: 7 },
        { label: "MusicBattle", type: "int", value: 13 },
        { label: "MusicDay", type: "int", value: 11 },
        { label: "MusicNight", type: "int", value: 12 },
        { label: "MusicDelay", type: "int", value: 3000 },
      ],
    },
  });
  return buildGffBuffer(fields, "GIT ", 0xffffffff);
}

function gicBytes(): Buffer {
  return buildGffBuffer(objectListFields(), "GIC ", 0xffffffff);
}

function objectListFields(): SupportedGffField[] {
  return [
    ["Creature List", 4], ["Door List", 8], ["Encounter List", 7],
    ["List", 0], ["Placeable List", 9], ["SoundList", 6],
    ["StoreList", 11], ["TriggerList", 1], ["WaypointList", 5],
  ].map(([label]) => ({ label: String(label), type: "list", value: [] }));
}

function moduleIfoBytes(): Buffer {
  return buildGffBuffer([{
    label: "Mod_Area_list",
    type: "list",
    value: [{
      typeId: 6,
      fields: [{ label: "Area_Name", type: "resref", value: AREA }],
    }],
  }], "IFO ", 0xffffffff);
}

function audioEnvironment() {
  return Object.freeze({
    ambientSoundDayId: 41,
    ambientSoundNightId: 42,
    ambientSoundDayVolume: 101,
    ambientSoundNightVolume: 102,
    environmentAudioId: 7,
    musicBattleId: 13,
    musicDayId: 11,
    musicNightId: 12,
    musicDelayMilliseconds: 3000,
  });
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
