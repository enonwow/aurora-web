import { createHash } from "node:crypto";
import { MySqlAtomicModuleSnapshotRepository } from "../../src/modules/areas/adapters/outbound/mysql/mysql-atomic-module-snapshot.repository";
import {
  applyModuleSnapshotChanges,
  buildModuleSnapshotContentKey,
  buildModuleSnapshotManifestKey,
  createModuleSnapshotManifest,
  hashModuleSnapshotManifest,
  type ModuleSnapshotManifest,
} from "../../src/modules/areas/domain/module-snapshot-manifest";
import type {
  AreaCreateSnapshotStageDescriptor,
  ModuleSnapshotHead,
} from "../../src/modules/areas/application/ports/atomic-module-snapshot.port";
import type { AreaCreateModuleLease } from "../../src/modules/areas/application/ports/area-create-transaction.port";
import type { DatabaseTransaction } from "../../src/database/database.service";
import type {
  ImmutableModuleBlobStoragePort,
  ModuleBlobImmutablePutResult,
  ModuleBlobObjectPayload,
} from "../../src/modules/runtime-settings/application/ports/module-blob-storage.port";
import type { BlobStorageSettings } from "../../src/modules/runtime-settings/domain/runtime-settings.types";

describe("MySqlAtomicModuleSnapshotRepository", () => {
  it("bootstraps an immutable baseline and inserts the initial head only when absent", async () => {
    const inserted: unknown[][] = [];
    const harness = createHarness(async (statement, params, transactional) => {
      if (statement.includes("FROM module_snapshot_heads")) {
        expect(transactional).toBe(true);
        return [];
      }
      if (statement.includes("INSERT INTO module_snapshot_heads")) {
        inserted.push(params);
        return affected(1);
      }
      throw unexpected(statement);
    });
    const contents = {
      "module.ifo": Buffer.from("baseline-ifo"),
      "existing.are": Buffer.from("existing-area"),
    };
    const manifest = createModuleSnapshotManifest({
      moduleId: MODULE_ID,
      parentRevision: null,
      objects: Object.entries(contents).map(([logicalKey, bytes]) =>
        descriptor(logicalKey, bytes, logicalKey.endsWith(".ifo") ? 2014 : 2012),
      ),
    });

    await expect(harness.repository.bootstrap(manifest, contents, NOW)).resolves.toEqual(
      headFor(manifest, 0, false),
    );
    expect(inserted).toHaveLength(1);
    expect(harness.objects.has(
      `${SETTINGS.modulePrefix}/${buildModuleSnapshotContentKey(sha(contents["module.ifo"]))}`,
    )).toBe(true);
    expect(harness.objects.has(
      `${SETTINGS.modulePrefix}/${buildModuleSnapshotManifestKey(manifest)}`,
    )).toBe(true);
  });

  it("stores and reads immutable content and canonical manifests through blob storage", async () => {
    const harness = createHarness();
    const bytes = Buffer.from("candidate-are");
    const digest = sha(bytes);

    await expect(harness.repository.putContentIfAbsent(bytes, digest)).resolves.toEqual({
      contentKey: buildModuleSnapshotContentKey(digest),
      size: bytes.length,
      sha256: digest,
    });
    const content = await harness.repository.readContent(
      buildModuleSnapshotContentKey(digest),
    );
    expect(content?.bytes).toEqual(bytes);

    const baseline = baselineManifest();
    await expect(harness.repository.putManifestIfAbsent(baseline)).resolves.toEqual(
      baseline,
    );
    expect(
      await harness.repository.readManifest(buildModuleSnapshotManifestKey(baseline)),
    ).toEqual(baseline);
    expect(harness.blob.putImmutableModuleObject).toHaveBeenCalledWith(
      SETTINGS,
      expect.objectContaining({ fileName: buildModuleSnapshotManifestKey(baseline) }),
      hashModuleSnapshotManifest(baseline),
    );
  });

  it("inserts one byte-free immutable stage and rejects a different replay", async () => {
    let retained: ReturnType<typeof stageRow> | null = null;
    const harness = createHarness(async (statement, params) => {
      if (statement.includes("FROM area_create_snapshot_stages")) {
        return retained ? [retained] : [];
      }
      if (statement.includes("INSERT INTO area_create_snapshot_stages")) {
        retained = stageRow(stageFixture().stage);
        expect(JSON.stringify(params)).not.toContain("candidate-are-bytes");
        return affected(1);
      }
      throw unexpected(statement);
    });
    const fixture = stageFixture();
    await seedManifests(harness, fixture);

    await expect(harness.repository.putStageIfAbsent(fixture.stage)).resolves.toEqual(
      fixture.stage,
    );
    await expect(harness.repository.putStageIfAbsent(fixture.stage)).resolves.toEqual(
      fixture.stage,
    );
    await expect(
      harness.repository.putStageIfAbsent({
        ...fixture.stage,
        candidateLogicalKeys: ["area_new.are"],
      }),
    ).rejects.toThrow("AREA_SNAPSHOT_STAGE_CONFLICT");
  });

  it("publishes the complete successor with one fenced SQL head CAS", async () => {
    const fixture = stageFixture();
    const updates: unknown[][] = [];
    const harness = createHarness(async (statement, params) => {
      if (statement.includes("FROM area_create_module_locks")) return [lockRow(LEASE)];
      if (statement.includes("FROM area_create_snapshot_stages")) return [stageRow(fixture.stage)];
      if (statement.includes("FROM module_snapshot_heads")) {
        return [headRow(headFor(fixture.baseline, 0, false))];
      }
      if (statement.includes("UPDATE module_snapshot_heads")) {
        updates.push(params);
        return affected(1);
      }
      throw unexpected(statement);
    });
    await seedManifests(harness, fixture);

    await expect(
      harness.repository.compareAndSetHead(TRANSACTION_ID, LEASE),
    ).resolves.toBe("published");
    expect(updates).toHaveLength(1);
    expect(updates[0]).toEqual(
      expect.arrayContaining([
        fixture.successor.revision,
        buildModuleSnapshotManifestKey(fixture.successor),
        hashModuleSnapshotManifest(fixture.successor),
        LEASE.fencingToken,
      ]),
    );
  });

  it("treats an exact published replay idempotently and rejects an expired lease", async () => {
    const fixture = stageFixture();
    const replay = createHarness(async (statement) => {
      if (statement.includes("FROM area_create_module_locks")) return [lockRow(LEASE)];
      if (statement.includes("FROM area_create_snapshot_stages")) return [stageRow(fixture.stage)];
      if (statement.includes("FROM module_snapshot_heads")) {
        return [headRow(headFor(fixture.successor, LEASE.fencingToken, false))];
      }
      throw unexpected(statement);
    });
    await seedManifests(replay, fixture);
    await expect(
      replay.repository.compareAndSetHead(TRANSACTION_ID, LEASE),
    ).resolves.toBe("already_published");

    const expired = createHarness(async (statement) => {
      if (statement.includes("FROM area_create_module_locks")) {
        return [lockRow({ ...LEASE, expiresAt: "2026-08-07T11:59:59.000Z" })];
      }
      if (statement.includes("FROM area_create_snapshot_stages")) return [stageRow(fixture.stage)];
      if (statement.includes("FROM module_snapshot_heads")) {
        return [headRow(headFor(fixture.baseline, 0, false))];
      }
      throw unexpected(statement);
    });
    await seedManifests(expired, fixture);
    await expect(
      expired.repository.compareAndSetHead(TRANSACTION_ID, LEASE),
    ).rejects.toThrow("AREA_CREATE_CONTROL_FENCED");
  });

  it("restores the exact baseline under a newer recovery fence", async () => {
    const fixture = stageFixture();
    const recoveryLease = { ...LEASE, leaseId: "lease-recovery", fencingToken: 8 };
    const harness = createHarness(async (statement) => {
      if (statement.includes("FROM area_create_module_locks")) {
        return [lockRow(recoveryLease)];
      }
      if (statement.includes("FROM area_create_snapshot_stages")) return [stageRow(fixture.stage)];
      if (statement.includes("FROM module_snapshot_heads")) {
        return [headRow(headFor(fixture.successor, LEASE.fencingToken, false))];
      }
      if (statement.includes("UPDATE module_snapshot_heads")) return affected(1);
      throw unexpected(statement);
    });
    await seedManifests(harness, fixture);

    await expect(
      harness.repository.restoreBaseline(TRANSACTION_ID, recoveryLease),
    ).resolves.toBe("restored");
  });

  it("quarantines the head and persists bounded diagnostics in the same transaction", async () => {
    const fixture = stageFixture();
    const statements: string[] = [];
    const harness = createHarness(async (statement) => {
      statements.push(statement);
      if (statement.includes("FROM area_create_module_locks")) return [lockRow(LEASE)];
      if (statement.includes("FROM area_create_snapshot_stages")) return [stageRow(fixture.stage)];
      if (statement.includes("FROM module_snapshot_heads")) {
        return [headRow(headFor(fixture.baseline, 0, false))];
      }
      if (statement.includes("UPDATE module_snapshot_heads")) return affected(1);
      if (statement.includes("INSERT INTO module_snapshot_quarantines")) return affected(1);
      throw unexpected(statement);
    });

    await harness.repository.quarantine(TRANSACTION_ID, LEASE, ["readback mismatch"]);
    expect(statements.some((statement) => statement.includes("quarantined = 1"))).toBe(true);
    expect(
      statements.some((statement) => statement.includes("module_snapshot_quarantines")),
    ).toBe(true);
  });

  it("quarantines a fenced module directly when recovery has no retained stage", async () => {
    const fixture = stageFixture();
    const statements: string[] = [];
    const harness = createHarness(async (statement) => {
      statements.push(statement);
      if (statement.includes("FROM area_create_module_locks")) return [lockRow(LEASE)];
      if (statement.includes("FROM module_snapshot_heads")) {
        return [headRow(headFor(fixture.baseline, 0, false))];
      }
      if (statement.includes("UPDATE module_snapshot_heads")) return affected(1);
      if (statement.includes("INSERT INTO module_snapshot_quarantines")) return affected(1);
      throw unexpected(statement);
    });

    await harness.repository.quarantineModule(
      MODULE_ID,
      TRANSACTION_ID,
      LEASE,
      ["baseline unproven"],
    );

    expect(statements.some((statement) =>
      statement.includes("FROM area_create_snapshot_stages"),
    )).toBe(false);
    expect(statements.some((statement) => statement.includes("quarantined = 1")))
      .toBe(true);
  });
});

const MODULE_ID = "module:test";
const TRANSACTION_ID = "transaction-1";
const NOW = "2026-08-07T12:00:00.000Z";
const SETTINGS: BlobStorageSettings = {
  endpoint: "http://localhost:8333",
  region: "us-east-1",
  bucket: "aurora-module-assets",
  modulePrefix: "modules/current",
  accessKeyId: "key",
  secretAccessKey: "secret",
  forcePathStyle: true,
};
const LEASE: AreaCreateModuleLease = {
  moduleId: MODULE_ID,
  leaseId: "lease-1",
  ownerTransactionId: TRANSACTION_ID,
  fencingToken: 7,
  expiresAt: "2026-08-07T12:00:30.000Z",
};

type QueryHandler = (
  statement: string,
  params: unknown[],
  transactional: boolean,
) => Promise<unknown>;

function createHarness(handler: QueryHandler = async (statement) => {
  throw unexpected(statement);
}) {
  const query = jest.fn((statement: string, params: unknown[] = []) =>
    handler(statement, params, false),
  );
  const transactionQuery = jest.fn((statement: string, params: unknown[] = []) =>
    handler(statement, params, true),
  );
  const database = {
    query,
    withTransaction: jest.fn(async <T>(
      operation: (transaction: DatabaseTransaction) => Promise<T>,
    ) => operation({ query: transactionQuery as DatabaseTransaction["query"] })),
  };
  const objects = new Map<string, Buffer>();
  const blob = {
    putImmutableModuleObject: jest.fn(async (
      settings: BlobStorageSettings,
      file: { fileName: string; bytes: Buffer },
      expectedSha256: string,
    ): Promise<ModuleBlobImmutablePutResult> => {
      const actual = sha(file.bytes);
      if (actual !== expectedSha256) throw new Error("hash mismatch");
      const key = `${settings.modulePrefix}/${file.fileName}`;
      const existing = objects.get(key);
      if (existing && !existing.equals(file.bytes)) throw new Error("immutable conflict");
      objects.set(key, Buffer.from(file.bytes));
      return {
        key,
        size: file.bytes.length,
        sha256: actual,
        status: existing ? "already_exists" : "created",
      };
    }),
    getModuleObject: jest.fn(async (
      _settings: BlobStorageSettings,
      key: string,
    ): Promise<ModuleBlobObjectPayload | null> => {
      const bytes = objects.get(key);
      return bytes
        ? { key, size: bytes.length, contentType: "application/octet-stream", bytes: Buffer.from(bytes) }
        : null;
    }),
  } as unknown as jest.Mocked<ImmutableModuleBlobStoragePort>;
  const settingsRepository = { get: jest.fn(async () => ({ blobStorage: SETTINGS })) };
  return {
    database,
    blob,
    objects,
    repository: new MySqlAtomicModuleSnapshotRepository(
      database as never,
      settingsRepository as never,
      blob,
      () => new Date(NOW),
    ),
  };
}

async function seedManifests(
  harness: ReturnType<typeof createHarness>,
  fixture: ReturnType<typeof stageFixture>,
) {
  await harness.repository.putManifestIfAbsent(fixture.baseline);
  await harness.repository.putManifestIfAbsent(fixture.successor);
}

function baselineManifest() {
  return createModuleSnapshotManifest({
    moduleId: MODULE_ID,
    parentRevision: null,
    objects: [descriptor("module.ifo", Buffer.from("baseline-ifo"), 2014)],
  });
}

function stageFixture() {
  const baseline = baselineManifest();
  const successor = applyModuleSnapshotChanges(baseline, [
    descriptor("area_new.are", Buffer.from("candidate-are-bytes"), 2012),
    descriptor("area_new.git", Buffer.from("candidate-git-bytes"), 2023),
    descriptor("area_new.gic", Buffer.from("candidate-gic-bytes"), 2046),
    descriptor("module.ifo", Buffer.from("candidate-ifo-bytes"), 2014),
  ]);
  const stage: AreaCreateSnapshotStageDescriptor = {
    schemaVersion: "area-create-snapshot-stage.v1",
    transactionId: TRANSACTION_ID,
    moduleId: MODULE_ID,
    leaseId: LEASE.leaseId,
    fencingToken: LEASE.fencingToken,
    base: identity(baseline),
    successor: identity(successor),
    candidateLogicalKeys: ["area_new.are", "area_new.gic", "area_new.git", "module.ifo"],
    createdAt: NOW,
  };
  return { baseline, successor, stage };
}

function descriptor(logicalKey: string, bytes: Buffer, resourceType: number) {
  return { logicalKey, resourceType, size: bytes.length, sha256: sha(bytes) };
}

function identity(manifest: ModuleSnapshotManifest) {
  return {
    revision: manifest.revision,
    manifestKey: buildModuleSnapshotManifestKey(manifest),
    manifestSha256: hashModuleSnapshotManifest(manifest),
  };
}

function headFor(
  manifest: ModuleSnapshotManifest,
  fencingToken: number,
  quarantined: boolean,
): ModuleSnapshotHead {
  return {
    schemaVersion: "aurora-module-snapshot-head.v1",
    moduleId: MODULE_ID,
    ...identity(manifest),
    quarantined,
    fencingToken,
    updatedAt: NOW,
  };
}

function lockRow(lease: AreaCreateModuleLease) {
  return {
    module_id: lease.moduleId,
    lease_id: lease.leaseId,
    owner_transaction_id: lease.ownerTransactionId,
    fencing_token: lease.fencingToken,
    lease_expires_at: lease.expiresAt,
  };
}

function headRow(head: ModuleSnapshotHead) {
  return {
    module_id: head.moduleId,
    schema_version: head.schemaVersion,
    revision: head.revision,
    manifest_key: head.manifestKey,
    manifest_sha256: head.manifestSha256,
    quarantined: head.quarantined ? 1 : 0,
    fencing_token: head.fencingToken,
    updated_at: head.updatedAt,
  };
}

function stageRow(stage: AreaCreateSnapshotStageDescriptor) {
  return {
    transaction_id: stage.transactionId,
    schema_version: stage.schemaVersion,
    module_id: stage.moduleId,
    lease_id: stage.leaseId,
    fencing_token: stage.fencingToken,
    base_revision: stage.base.revision,
    base_manifest_key: stage.base.manifestKey,
    base_manifest_sha256: stage.base.manifestSha256,
    successor_revision: stage.successor.revision,
    successor_manifest_key: stage.successor.manifestKey,
    successor_manifest_sha256: stage.successor.manifestSha256,
    candidate_logical_keys_json: JSON.stringify(stage.candidateLogicalKeys),
    created_at: stage.createdAt,
  };
}

function affected(count: number) {
  return { affectedRows: count };
}

function unexpected(statement: string): Error {
  return new Error(`Unexpected SQL: ${statement.replace(/\s+/gu, " ").trim()}`);
}

function sha(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}
