import { createHash } from "node:crypto";
import {
  parseAreaAudioEnvironmentFromGitGff,
  parseAreaVariablesFromGitGff,
} from "../../src/modules/areas/adapters/outbound/blob/aurora-gff-area-parser";
import {
  AreaUpdateCandidateCompiler,
} from "../../src/modules/areas/application/area-update-candidate.compiler";
import {
  MODULE_SNAPSHOT_HEAD_SCHEMA_VERSION,
  type AtomicModuleSnapshotRepositoryPort,
} from "../../src/modules/areas/application/ports/atomic-module-snapshot.port";
import type { AreaDraftRepositoryPort } from "../../src/modules/areas/application/ports/area-draft.repository.port";
import type { AreaUpdateCommand } from "../../src/modules/areas/domain/area-update-command.types";
import type { AreaDraftSnapshot } from "../../src/modules/areas/domain/area-draft.types";
import {
  buildModuleSnapshotManifestKey,
  createModuleSnapshotManifest,
  hashModuleSnapshotManifest,
} from "../../src/modules/areas/domain/module-snapshot-manifest";
import {
  buildGffBuffer,
  type SupportedGffField,
} from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-uti-writer";
import { serializeAreaEditingDraftToAreGff } from "../../src/modules/areas/adapters/outbound/blob/aurora-gff-area-editing-writer";

const MODULE_ID = "workspace:module-variables";
const AREA = "crypt01";
const DRAFT_HASH = "d".repeat(64);
const TILESET_HASH = "e".repeat(64);

describe("AreaUpdateCandidateCompiler Area variables", () => {
  it("compiles one exact typed ordered VarTable into the atomic GIT candidate", async () => {
    const harness = createHarness();

    const candidate = await harness.compiler.compile(
      harness.command,
      { moduleId: MODULE_ID, revision: harness.revision, quarantined: false },
      "actor-01",
      "tx-variables",
    );

    const git = candidate.resources.find((entry) => entry.extension === "git")!;
    const target = targetEntries();
    expect(parseAreaVariablesFromGitGff(git.bytes)).toEqual({
      expectedEntries: target.map((entry, sourceIndex) => ({ ...entry, sourceIndex })),
    });
    expect(candidate.variableMutation).toEqual({
      expectedEntries: sourceEntries(),
      entries: target,
      sourceGitSha256: sha256(harness.sourceGit),
      candidateGitSha256: git.sha256,
    });
    expect(candidate.unchangedCompanions).toBeUndefined();
    expect(candidate.resources.find((entry) => entry.extension === "gic")?.bytes)
      .toEqual(harness.sourceGic);
  });

  it("composes audio and variables while binding every summary to the final GIT", async () => {
    const harness = createHarness({ includeAudioMutation: true });

    const candidate = await harness.compiler.compile(
      harness.command,
      { moduleId: MODULE_ID, revision: harness.revision, quarantined: false },
      "actor-01",
      "tx-audio-variables",
    );

    const git = candidate.resources.find((entry) => entry.extension === "git")!;
    expect(candidate.audioEnvironmentMutation?.candidateGitSha256).toBe(git.sha256);
    expect(candidate.variableMutation?.candidateGitSha256).toBe(git.sha256);
    expect(parseAreaAudioEnvironmentFromGitGff(git.bytes)).toEqual(audioTarget());
    expect(parseAreaVariablesFromGitGff(git.bytes)?.expectedEntries).toEqual(
      targetEntries().map((entry, sourceIndex) => ({ ...entry, sourceIndex })),
    );
  });

  it("fails closed before writing when variable lineage names a stale source GIT", async () => {
    const harness = createHarness({ sourceGitSha256: "f".repeat(64) });

    await expect(harness.compiler.compile(
      harness.command,
      { moduleId: MODULE_ID, revision: harness.revision, quarantined: false },
      "actor-01",
      "tx-stale-variables",
    )).rejects.toMatchObject({
      code: "AREA_UPDATE_SOURCE_STALE",
      status: 409,
    });
  });
});

function createHarness(options: Readonly<{
  includeAudioMutation?: boolean;
  sourceGitSha256?: string;
}> = {}) {
  const sourceAre = Buffer.from("source-area-variables");
  const sourceGit = git();
  const sourceGic = buildGffBuffer(objectListFields(), "GIC ", 0xffff_ffff);
  const sourceIfo = Buffer.from("preserved-ifo-variables");
  const contents: Record<string, Buffer> = {
    [`${AREA}.are`]: sourceAre,
    [`${AREA}.git`]: sourceGit,
    [`${AREA}.gic`]: sourceGic,
    "module.ifo": sourceIfo,
  };
  const manifest = createModuleSnapshotManifest({
    moduleId: MODULE_ID,
    parentRevision: null,
    objects: Object.entries(contents).map(([logicalKey, bytes]) => ({
      logicalKey,
      resourceType: resourceType(logicalKey),
      size: bytes.length,
      sha256: sha256(bytes),
    })),
  });
  const records = new Map(manifest.objects.map((descriptor) => [
    descriptor.contentKey,
    {
      contentKey: descriptor.contentKey,
      size: descriptor.size,
      sha256: descriptor.sha256,
      bytes: Buffer.from(contents[descriptor.logicalKey]!),
    },
  ]));
  const head = {
    schemaVersion: MODULE_SNAPSHOT_HEAD_SCHEMA_VERSION,
    moduleId: MODULE_ID,
    revision: manifest.revision,
    manifestKey: buildModuleSnapshotManifestKey(manifest),
    manifestSha256: hashModuleSnapshotManifest(manifest),
    quarantined: false,
    fencingToken: 0,
    updatedAt: "2026-08-24T10:00:00.000Z",
  };
  const repository = {
    readHead: jest.fn(async () => head),
    readManifest: jest.fn(async () => manifest),
    readContent: jest.fn(async (key: string) => records.get(key) ?? null),
  } as unknown as AtomicModuleSnapshotRepositoryPort;
  const snapshot = draftSnapshot({
    sourceAreaSha256: sha256(sourceAre),
    sourceGitSha256: options.sourceGitSha256 ?? sha256(sourceGit),
    includeAudioMutation: options.includeAudioMutation ?? false,
  });
  const drafts = {
    read: jest.fn(async () => snapshot),
  } as unknown as AreaDraftRepositoryPort;
  const candidateAre = serializeAreaEditingDraftToAreGff({
    areaResRef: AREA,
    name: "Crypt 01",
    width: 2,
    height: 2,
    tilesetResRef: "tin01",
    tiles: tiles(),
  });
  const command: AreaUpdateCommand = {
    schemaVersion: "area-update-command.v1",
    moduleId: MODULE_ID,
    areaResRef: AREA,
    expectedModuleRevision: manifest.revision,
    draft: { id: "draft-01", revision: 3, normalizedSha256: DRAFT_HASH },
    clientCommandId: "client-variables",
  };
  return {
    compiler: new AreaUpdateCandidateCompiler({
      repository,
      drafts,
      areaEditing: {
        exportAre: jest.fn(async () => ({
          fileName: `${AREA}.are`,
          contentType: "application/octet-stream" as const,
          size: candidateAre.length,
          bytes: candidateAre,
          tileCount: 4,
          tilesetFingerprint: TILESET_HASH,
        })),
      } as never,
      blueprints: { resolve: jest.fn() } as never,
      appearanceCatalog: {} as never,
    }),
    command,
    revision: manifest.revision,
    sourceGit,
    sourceGic,
  };
}

function draftSnapshot(input: Readonly<{
  sourceAreaSha256: string;
  sourceGitSha256: string;
  includeAudioMutation: boolean;
}>): AreaDraftSnapshot {
  return {
    draftId: "draft-01",
    title: "Variables",
    revision: 3,
    updatedAt: "2026-08-24T10:00:00.000Z",
    normalizedSha256: DRAFT_HASH,
    source: { type: "production_area", areaId: `area_${AREA}` },
    draft: {
      schemaVersion: "area-draft.v1",
      title: "Variables",
      source: { type: "production_area", areaId: `area_${AREA}` },
      payload: {
        schemaVersion: "production-area-draft-payload.v1",
        provenance: {
          areaId: `area_${AREA}`,
          sourceUpdatedAt: "2026-08-24T09:00:00.000Z",
          processingCacheKey: "cache-variables",
          sourceGitSha256: input.sourceGitSha256,
        },
        sourceArea: {
          areaId: `area_${AREA}`,
          name: "Crypt 01",
          width: 2,
          height: 2,
          variables: { expectedEntries: sourceEntries() },
          ...(input.includeAudioMutation ? { audioEnvironment: audioSource() } : {}),
        },
        editableScene: {
          areaName: "Crypt 01",
          width: 2,
          height: 2,
          objects: [],
          areaVariables: targetEntries(),
          ...(input.includeAudioMutation
            ? { areaAudioEnvironment: audioTarget() }
            : {}),
          auroraAreaEditing: {
            state: {
              schemaVersion: 1,
              areaResRef: AREA,
              tilesetResRef: "tin01",
              tilesetFingerprint: TILESET_HASH,
              sourceAreaFingerprint: input.sourceAreaSha256,
              width: 2,
              height: 2,
              tiles: tiles(),
            },
          },
        },
      },
    },
  };
}

function git(): Buffer {
  return buildGffBuffer([
    variableField(),
    ...objectListFields(),
    {
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
    },
  ], "GIT ", 0xffff_ffff);
}

function objectListFields(): SupportedGffField[] {
  return [
    ["Creature List", 4],
    ["Door List", 8],
    ["Encounter List", 7],
    ["List", 0],
    ["Placeable List", 9],
    ["SoundList", 6],
    ["StoreList", 11],
    ["TriggerList", 1],
    ["WaypointList", 5],
  ].map(([label]) => ({ label: label as string, type: "list", value: [] }));
}

function variableField(): SupportedGffField {
  return {
    label: "VarTable",
    type: "list",
    value: sourceEntries().map((entry) => ({
      typeId: 0,
      fields: [
        { label: "Name", type: "cexostring", value: entry.name },
        {
          label: "Type",
          type: "dword",
          value: entry.type === "int" ? 1 : entry.type === "float" ? 2 : 3,
        },
        entry.type === "int"
          ? { label: "Value", type: "int", value: entry.value }
          : entry.type === "float"
            ? { label: "Value", type: "float", value: entry.value }
            : { label: "Value", type: "cexostring", value: entry.value },
      ],
    })),
  };
}

function sourceEntries() {
  return [
    { sourceIndex: 0, name: "COUNT", type: "int" as const, value: 3 },
    { sourceIndex: 1, name: "RATIO", type: "float" as const, value: Math.fround(1.25) },
    { sourceIndex: 2, name: "TEXT", type: "string" as const, value: "original" },
  ];
}

function targetEntries() {
  return [
    { name: "TEXT", type: "string" as const, value: "updated" },
    { name: "COUNT", type: "int" as const, value: 7 },
    { name: "RATIO", type: "float" as const, value: Math.fround(-2.5) },
  ];
}

function audioSource() {
  return {
    ambientSoundDayId: 41,
    ambientSoundNightId: 42,
    ambientSoundDayVolume: 101,
    ambientSoundNightVolume: 102,
    environmentAudioId: 7,
    musicBattleId: 13,
    musicDayId: 11,
    musicNightId: 12,
    musicDelayMilliseconds: 3000,
  };
}

function audioTarget() {
  return {
    ...audioSource(),
    ambientSoundNightVolume: 77,
    musicDelayMilliseconds: -4000,
  };
}

function tiles() {
  return Array.from({ length: 4 }, (_value, index) => ({
    index,
    x: index % 2,
    y: Math.floor(index / 2),
    row: Math.floor(index / 2),
    col: index % 2,
    sourceRow: Math.floor(index / 2),
    sourceCol: index % 2,
    tileId: 12,
    orientation: index,
    height: 0,
    mainLight1: 0,
    mainLight2: 0,
    sourceLight1: 0,
    sourceLight2: 0,
    animLoop1: 1,
    animLoop2: 1,
    animLoop3: 1,
  }));
}

function resourceType(logicalKey: string): number {
  if (logicalKey.endsWith(".are")) return 2012;
  if (logicalKey.endsWith(".git")) return 2023;
  if (logicalKey.endsWith(".gic")) return 2046;
  return 2014;
}

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}
