import { createHash } from "node:crypto";
import { Inject, Injectable, Optional } from "@nestjs/common";
import type { ResultSetHeader } from "mysql2";
import {
  DatabaseService,
  type DatabaseTransaction,
} from "../../../../../database/database.service";
import {
  MODULE_BLOB_STORAGE,
  type ImmutableModuleBlobStoragePort,
} from "../../../../runtime-settings/application/ports/module-blob-storage.port";
import {
  RUNTIME_SETTINGS_REPOSITORY,
  type RuntimeSettingsRepositoryPort,
} from "../../../../runtime-settings/application/ports/runtime-settings-repository.port";
import type { BlobStorageSettings } from "../../../../runtime-settings/domain/runtime-settings.types";
import type {
  AreaCreateSnapshotStageDescriptor,
  AtomicModuleSnapshotRepositoryPort,
  ModuleSnapshotContentRecord,
  ModuleSnapshotHead,
  ModuleSnapshotHeadIdentity,
  ModuleSnapshotPublicationResult,
  ModuleSnapshotRestorationResult,
} from "../../../application/ports/atomic-module-snapshot.port";
import {
  AREA_CREATE_SNAPSHOT_STAGE_SCHEMA_VERSION,
  MODULE_SNAPSHOT_HEAD_SCHEMA_VERSION,
} from "../../../application/ports/atomic-module-snapshot.port";
import type { AreaCreateModuleLease } from "../../../application/ports/area-create-transaction.port";
import {
  buildModuleSnapshotContentKey,
  buildModuleSnapshotManifestKey,
  hashModuleSnapshotManifest,
  normalizeModuleSnapshotLogicalKey,
  validateModuleSnapshotManifest,
  type ModuleSnapshotManifest,
} from "../../../domain/module-snapshot-manifest";

const SHA256_PATTERN = /^[a-f0-9]{64}$/u;
const MODULE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const SHORT_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/u;
const MAX_DIAGNOSTICS = 100;
const MAX_DIAGNOSTIC_BYTES = 1_024;
export const MYSQL_ATOMIC_MODULE_SNAPSHOT_CLOCK = Symbol(
  "MYSQL_ATOMIC_MODULE_SNAPSHOT_CLOCK",
);

interface HeadRow {
  module_id: string;
  schema_version: string;
  revision: string;
  manifest_key: string;
  manifest_sha256: string;
  quarantined: boolean | number | string;
  fencing_token: number | string;
  updated_at: Date | string;
}

interface StageRow {
  transaction_id: string;
  schema_version: string;
  module_id: string;
  lease_id: string;
  fencing_token: number | string;
  base_revision: string;
  base_manifest_key: string;
  base_manifest_sha256: string;
  successor_revision: string;
  successor_manifest_key: string;
  successor_manifest_sha256: string;
  candidate_logical_keys_json: string | readonly string[];
  created_at: Date | string;
}

interface LockRow {
  module_id: string;
  lease_id: string | null;
  owner_transaction_id: string | null;
  fencing_token: number | string;
  lease_expires_at: Date | string | null;
}

@Injectable()
export class MySqlAtomicModuleSnapshotRepository
  implements AtomicModuleSnapshotRepositoryPort
{
  constructor(
    private readonly database: DatabaseService,
    @Inject(RUNTIME_SETTINGS_REPOSITORY)
    private readonly settingsRepository: RuntimeSettingsRepositoryPort,
    @Inject(MODULE_BLOB_STORAGE)
    private readonly blobStorage: ImmutableModuleBlobStoragePort,
    @Optional() @Inject(MYSQL_ATOMIC_MODULE_SNAPSHOT_CLOCK)
    now?: () => Date,
  ) {
    this.now = now ?? (() => new Date());
  }

  private readonly now: () => Date;

  async bootstrap(
    manifest: ModuleSnapshotManifest,
    contentsByLogicalKey: Readonly<Record<string, Buffer>>,
    updatedAt: string,
  ): Promise<ModuleSnapshotHead> {
    const verified = validateModuleSnapshotManifest(manifest);
    if (!isCanonicalIso(updatedAt)) {
      throw snapshotError(
        "AREA_SNAPSHOT_BOOTSTRAP_MISMATCH",
        "Bootstrap update time is not a canonical ISO timestamp.",
      );
    }
    const suppliedKeys = Object.keys(contentsByLogicalKey).sort();
    const expectedKeys = verified.objects.map((object) => object.logicalKey).sort();
    if (!sameJson(suppliedKeys, expectedKeys)) {
      throw snapshotError(
        "AREA_SNAPSHOT_BOOTSTRAP_MISMATCH",
        "Bootstrap content keys do not match the complete manifest.",
      );
    }
    for (const object of verified.objects) {
      const supplied = contentsByLogicalKey[object.logicalKey];
      if (!Buffer.isBuffer(supplied)) {
        throw snapshotError(
          "AREA_SNAPSHOT_BOOTSTRAP_MISMATCH",
          `Bootstrap content is missing for ${object.logicalKey}.`,
        );
      }
      const bytes = Buffer.from(supplied);
      if (bytes.length !== object.size || sha256Hex(bytes) !== object.sha256) {
        throw snapshotError(
          "AREA_SNAPSHOT_BOOTSTRAP_MISMATCH",
          `Bootstrap content does not match ${object.logicalKey}.`,
        );
      }
      await this.putContentIfAbsent(bytes, object.sha256);
    }
    await this.putManifestIfAbsent(verified);
    const identity = manifestIdentity(verified);
    const head = createHead(verified.moduleId, identity, false, 0, updatedAt);
    return this.database.withTransaction(async (transaction) => {
      const rows = await transaction.query<HeadRow[]>(`${headSelectSql()} FOR UPDATE`, [
        verified.moduleId,
      ]);
      if (rows[0]) {
        const existing = mapHeadRow(rows[0]);
        if (sameIdentity(existing, identity) && !existing.quarantined) {
          return existing;
        }
        throw snapshotError(
          "AREA_SNAPSHOT_HEAD_CONFLICT",
          "Module snapshot head already exists with another baseline.",
        );
      }
      const inserted = await transaction.query<ResultSetHeader>(
        `
          INSERT INTO module_snapshot_heads (
            module_id, schema_version, revision, manifest_key, manifest_sha256,
            quarantined, fencing_token, updated_at
          ) VALUES (?, ?, ?, ?, ?, 0, 0, ?)
        `,
        [
          head.moduleId,
          head.schemaVersion,
          head.revision,
          head.manifestKey,
          head.manifestSha256,
          toSqlDate(new Date(head.updatedAt)),
        ],
      );
      assertAffected(inserted, "AREA_SNAPSHOT_HEAD_CONFLICT");
      return head;
    });
  }

  async readHead(moduleId: string): Promise<ModuleSnapshotHead | null> {
    const rows = await this.database.query<HeadRow[]>(headSelectSql(), [moduleId]);
    return rows[0] ? mapHeadRow(rows[0]) : null;
  }

  async readManifest(manifestKey: string): Promise<ModuleSnapshotManifest | null> {
    const { blobStorage: settings } = await this.settingsRepository.get();
    const payload = await this.blobStorage.getModuleObject(
      settings,
      qualifyObjectKey(settings, manifestKey),
    );
    if (!payload) {
      return null;
    }
    let parsed: ModuleSnapshotManifest;
    try {
      parsed = JSON.parse(payload.bytes.toString("utf8")) as ModuleSnapshotManifest;
    } catch {
      throw snapshotError(
        "AREA_SNAPSHOT_MANIFEST_CONFLICT",
        "Stored snapshot manifest is not valid JSON.",
      );
    }
    let verified: ModuleSnapshotManifest;
    try {
      verified = validateModuleSnapshotManifest(parsed);
    } catch (error) {
      throw snapshotError(
        "AREA_SNAPSHOT_MANIFEST_CONFLICT",
        error instanceof Error ? error.message : "Stored snapshot manifest is invalid.",
      );
    }
    if (
      buildModuleSnapshotManifestKey(verified) !== manifestKey ||
      hashModuleSnapshotManifest(verified) !== sha256Hex(payload.bytes)
    ) {
      throw snapshotError(
        "AREA_SNAPSHOT_MANIFEST_CONFLICT",
        "Stored snapshot manifest does not match its immutable key or hash.",
      );
    }
    return verified;
  }

  async readContent(contentKey: string): Promise<ModuleSnapshotContentRecord | null> {
    const { blobStorage: settings } = await this.settingsRepository.get();
    const payload = await this.blobStorage.getModuleObject(
      settings,
      qualifyObjectKey(settings, contentKey),
    );
    if (!payload) {
      return null;
    }
    const bytes = Buffer.from(payload.bytes);
    const sha256 = sha256Hex(bytes);
    if (buildModuleSnapshotContentKey(sha256) !== contentKey) {
      throw snapshotError(
        "AREA_SNAPSHOT_CONTENT_CONFLICT",
        "Stored snapshot content does not match its immutable key.",
      );
    }
    return Object.freeze({ contentKey, size: bytes.length, sha256, bytes });
  }

  async putContentIfAbsent(
    bytes: Buffer,
    sha256: string,
  ): Promise<Omit<ModuleSnapshotContentRecord, "bytes">> {
    const candidate = Buffer.from(bytes);
    if (sha256Hex(candidate) !== sha256) {
      throw snapshotError(
        "AREA_SNAPSHOT_CONTENT_HASH_MISMATCH",
        "Content bytes do not match the declared SHA-256.",
      );
    }
    const contentKey = buildModuleSnapshotContentKey(sha256);
    const { blobStorage: settings } = await this.settingsRepository.get();
    await this.blobStorage.putImmutableModuleObject(
      settings,
      { fileName: contentKey, resourceType: 0, bytes: candidate },
      sha256,
    );
    return Object.freeze({ contentKey, size: candidate.length, sha256 });
  }

  async putManifestIfAbsent(
    manifest: ModuleSnapshotManifest,
  ): Promise<ModuleSnapshotManifest> {
    const verified = validateModuleSnapshotManifest(manifest);
    const manifestKey = buildModuleSnapshotManifestKey(verified);
    const bytes = Buffer.from(JSON.stringify(verified), "utf8");
    const sha256 = hashModuleSnapshotManifest(verified);
    const { blobStorage: settings } = await this.settingsRepository.get();
    await this.blobStorage.putImmutableModuleObject(
      settings,
      { fileName: manifestKey, resourceType: 0, bytes },
      sha256,
    );
    return verified;
  }

  async putStageIfAbsent(
    stage: AreaCreateSnapshotStageDescriptor,
  ): Promise<AreaCreateSnapshotStageDescriptor> {
    const existing = await this.readStage(stage.transactionId);
    if (existing) {
      if (!sameJson(existing, stage)) {
        throw snapshotError(
          "AREA_SNAPSHOT_STAGE_CONFLICT",
          "Area Create stage is already bound to a different snapshot transition.",
        );
      }
      return existing;
    }
    const verified = await this.validateStage(stage);
    try {
      await this.database.query<ResultSetHeader>(
        `
          INSERT INTO area_create_snapshot_stages (
            transaction_id, schema_version, module_id, lease_id, fencing_token,
            base_revision, base_manifest_key, base_manifest_sha256,
            successor_revision, successor_manifest_key, successor_manifest_sha256,
            candidate_logical_keys_json, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          verified.transactionId,
          verified.schemaVersion,
          verified.moduleId,
          verified.leaseId,
          verified.fencingToken,
          verified.base.revision,
          verified.base.manifestKey,
          verified.base.manifestSha256,
          verified.successor.revision,
          verified.successor.manifestKey,
          verified.successor.manifestSha256,
          JSON.stringify(verified.candidateLogicalKeys),
          toSqlDate(new Date(verified.createdAt)),
        ],
      );
      return verified;
    } catch (error) {
      if (!isDuplicateEntryError(error)) {
        throw error;
      }
      const raced = await this.readStage(stage.transactionId);
      if (raced && sameJson(raced, verified)) {
        return raced;
      }
      throw snapshotError(
        "AREA_SNAPSHOT_STAGE_CONFLICT",
        "Area Create stage was concurrently bound to another transition.",
      );
    }
  }

  async readStage(
    transactionId: string,
  ): Promise<AreaCreateSnapshotStageDescriptor | null> {
    const rows = await this.database.query<StageRow[]>(stageSelectSql(), [transactionId]);
    return rows[0] ? mapStageRow(rows[0]) : null;
  }

  async compareAndSetHead(
    transactionId: string,
    lease: AreaCreateModuleLease,
  ): Promise<ModuleSnapshotPublicationResult> {
    const prepared = await this.requireVerifiedStage(transactionId, "successor");
    return this.database.withTransaction(async (transaction) => {
      await assertCurrentLease(transaction, lease, this.now());
      const { stage, head } = await lockSnapshotTransition(
        transaction,
        transactionId,
        lease.moduleId,
      );
      assertSameStage(prepared, stage);
      assertPublishLease(stage, lease);
      if (head.quarantined) {
        throw snapshotError(
          "AREA_SNAPSHOT_MODULE_QUARANTINED",
          "Module snapshot is quarantined and cannot be published.",
        );
      }
      if (sameIdentity(head, stage.successor)) {
        return "already_published";
      }
      if (!sameIdentity(head, stage.base)) {
        throw snapshotError(
          "AREA_SNAPSHOT_HEAD_REVISION_CONFLICT",
          "Module snapshot head no longer matches the stage baseline.",
        );
      }
      const updated = await transaction.query<ResultSetHeader>(
        `
          UPDATE module_snapshot_heads
          SET schema_version = ?, revision = ?, manifest_key = ?,
              manifest_sha256 = ?, quarantined = 0, fencing_token = ?, updated_at = ?
          WHERE module_id = ? AND revision = ? AND manifest_key = ?
            AND manifest_sha256 = ? AND quarantined = 0
        `,
        [
          MODULE_SNAPSHOT_HEAD_SCHEMA_VERSION,
          stage.successor.revision,
          stage.successor.manifestKey,
          stage.successor.manifestSha256,
          lease.fencingToken,
          toSqlDate(this.now()),
          stage.moduleId,
          stage.base.revision,
          stage.base.manifestKey,
          stage.base.manifestSha256,
        ],
      );
      assertAffected(updated, "AREA_SNAPSHOT_HEAD_REVISION_CONFLICT");
      return "published";
    });
  }

  async restoreBaseline(
    transactionId: string,
    lease: AreaCreateModuleLease,
  ): Promise<ModuleSnapshotRestorationResult> {
    const prepared = await this.requireVerifiedStage(transactionId, "base");
    return this.database.withTransaction(async (transaction) => {
      await assertCurrentLease(transaction, lease, this.now());
      const { stage, head } = await lockSnapshotTransition(
        transaction,
        transactionId,
        lease.moduleId,
      );
      assertSameStage(prepared, stage);
      assertRecoveryLease(stage, lease);
      if (sameIdentity(head, stage.base)) {
        return "already_baseline";
      }
      if (!sameIdentity(head, stage.successor)) {
        throw snapshotError(
          "AREA_SNAPSHOT_HEAD_REVISION_CONFLICT",
          "Module snapshot head is neither the stage baseline nor successor.",
        );
      }
      const updated = await transaction.query<ResultSetHeader>(
        `
          UPDATE module_snapshot_heads
          SET schema_version = ?, revision = ?, manifest_key = ?,
              manifest_sha256 = ?, quarantined = 0, fencing_token = ?, updated_at = ?
          WHERE module_id = ? AND revision = ? AND manifest_key = ?
            AND manifest_sha256 = ?
        `,
        [
          MODULE_SNAPSHOT_HEAD_SCHEMA_VERSION,
          stage.base.revision,
          stage.base.manifestKey,
          stage.base.manifestSha256,
          lease.fencingToken,
          toSqlDate(this.now()),
          stage.moduleId,
          stage.successor.revision,
          stage.successor.manifestKey,
          stage.successor.manifestSha256,
        ],
      );
      assertAffected(updated, "AREA_SNAPSHOT_HEAD_REVISION_CONFLICT");
      return "restored";
    });
  }

  async quarantine(
    transactionId: string,
    lease: AreaCreateModuleLease,
    diagnostics: readonly string[],
  ): Promise<void> {
    const bounded = validateDiagnostics(diagnostics);
    await this.database.withTransaction(async (transaction) => {
      await assertCurrentLease(transaction, lease, this.now());
      const { stage, head } = await lockSnapshotTransition(
        transaction,
        transactionId,
        lease.moduleId,
      );
      assertRecoveryLease(stage, lease);
      const updated = await transaction.query<ResultSetHeader>(
        `
          UPDATE module_snapshot_heads
          SET quarantined = 1, fencing_token = ?, updated_at = ?
          WHERE module_id = ? AND revision = ? AND manifest_key = ?
            AND manifest_sha256 = ?
        `,
        [
          lease.fencingToken,
          toSqlDate(this.now()),
          stage.moduleId,
          head.revision,
          head.manifestKey,
          head.manifestSha256,
        ],
      );
      assertAffected(updated, "AREA_SNAPSHOT_HEAD_REVISION_CONFLICT");
      await transaction.query<ResultSetHeader>(
        `
          INSERT INTO module_snapshot_quarantines (
            module_id, transaction_id, diagnostics_json, updated_at
          ) VALUES (?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            transaction_id = VALUES(transaction_id),
            diagnostics_json = VALUES(diagnostics_json),
            updated_at = VALUES(updated_at)
        `,
        [stage.moduleId, transactionId, JSON.stringify(bounded), toSqlDate(this.now())],
      );
    });
  }

  async quarantineModule(
    moduleId: string,
    transactionId: string,
    lease: AreaCreateModuleLease,
    diagnostics: readonly string[],
  ): Promise<void> {
    const bounded = validateDiagnostics(diagnostics);
    if (
      lease.moduleId !== moduleId ||
      lease.ownerTransactionId !== transactionId
    ) {
      throw snapshotError(
        "AREA_SNAPSHOT_STAGE_IDENTITY_MISMATCH",
        "Recovery lease does not own the module quarantine operation.",
      );
    }
    await this.database.withTransaction(async (transaction) => {
      await assertCurrentLease(transaction, lease, this.now());
      const rows = await transaction.query<HeadRow[]>(
        `${headSelectSql()} FOR UPDATE`,
        [moduleId],
      );
      if (!rows[0]) {
        throw snapshotError(
          "AREA_SNAPSHOT_HEAD_MISSING",
          "Module snapshot head does not exist.",
        );
      }
      const head = mapHeadRow(rows[0]);
      const updated = await transaction.query<ResultSetHeader>(
        `
          UPDATE module_snapshot_heads
          SET quarantined = 1, fencing_token = ?, updated_at = ?
          WHERE module_id = ? AND revision = ? AND manifest_key = ?
            AND manifest_sha256 = ?
        `,
        [
          lease.fencingToken,
          toSqlDate(this.now()),
          moduleId,
          head.revision,
          head.manifestKey,
          head.manifestSha256,
        ],
      );
      assertAffected(updated, "AREA_SNAPSHOT_HEAD_REVISION_CONFLICT");
      await transaction.query<ResultSetHeader>(
        `
          INSERT INTO module_snapshot_quarantines (
            module_id, transaction_id, diagnostics_json, updated_at
          ) VALUES (?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            transaction_id = VALUES(transaction_id),
            diagnostics_json = VALUES(diagnostics_json),
            updated_at = VALUES(updated_at)
        `,
        [moduleId, transactionId, JSON.stringify(bounded), toSqlDate(this.now())],
      );
    });
  }

  private async requireVerifiedStage(
    transactionId: string,
    identity: "base" | "successor",
  ): Promise<AreaCreateSnapshotStageDescriptor> {
    const stage = await this.readStage(transactionId);
    if (!stage) {
      throw snapshotError(
        "AREA_SNAPSHOT_STAGE_MISSING",
        "Area Create snapshot stage does not exist.",
      );
    }
    await this.requireManifestIdentity(stage[identity]);
    return stage;
  }

  private async validateStage(
    stage: AreaCreateSnapshotStageDescriptor,
  ): Promise<AreaCreateSnapshotStageDescriptor> {
    if (
      stage.schemaVersion !== AREA_CREATE_SNAPSHOT_STAGE_SCHEMA_VERSION ||
      !SHORT_ID_PATTERN.test(stage.transactionId) ||
      !MODULE_ID_PATTERN.test(stage.moduleId) ||
      !SHORT_ID_PATTERN.test(stage.leaseId) ||
      !Number.isSafeInteger(stage.fencingToken) ||
      stage.fencingToken < 1 ||
      !isCanonicalIso(stage.createdAt)
    ) {
      throw snapshotError(
        "AREA_SNAPSHOT_STAGE_INVALID",
        "Area Create stage identity is invalid.",
      );
    }
    const base = await this.requireManifestIdentity(stage.base);
    const successor = await this.requireManifestIdentity(stage.successor);
    if (
      base.moduleId !== stage.moduleId ||
      successor.moduleId !== stage.moduleId ||
      successor.parentRevision !== base.revision
    ) {
      throw snapshotError(
        "AREA_SNAPSHOT_STAGE_INVALID",
        "Area Create stage manifest lineage is invalid.",
      );
    }
    const keys = normalizeCandidateKeys(stage.candidateLogicalKeys);
    const successorKeys = new Set(
      successor.objects.map((object) => object.logicalKey.toLowerCase()),
    );
    if (keys.some((key) => !successorKeys.has(key.toLowerCase()))) {
      throw snapshotError(
        "AREA_SNAPSHOT_STAGE_INVALID",
        "Area Create stage candidate key is absent from the successor manifest.",
      );
    }
    return freezeClone({ ...stage, candidateLogicalKeys: keys });
  }

  private async requireManifestIdentity(
    identity: ModuleSnapshotHeadIdentity,
  ): Promise<ModuleSnapshotManifest> {
    if (
      !SHA256_PATTERN.test(identity.revision) ||
      !SHA256_PATTERN.test(identity.manifestSha256)
    ) {
      throw snapshotError(
        "AREA_SNAPSHOT_MANIFEST_INVALID",
        "Snapshot manifest identity contains an invalid SHA-256.",
      );
    }
    const manifest = await this.readManifest(identity.manifestKey);
    if (!manifest) {
      throw snapshotError(
        "AREA_SNAPSHOT_MANIFEST_MISSING",
        "Snapshot manifest referenced by the stage is missing.",
      );
    }
    if (
      manifest.revision !== identity.revision ||
      hashModuleSnapshotManifest(manifest) !== identity.manifestSha256
    ) {
      throw snapshotError(
        "AREA_SNAPSHOT_MANIFEST_CONFLICT",
        "Snapshot manifest identity does not match its immutable artifact.",
      );
    }
    return manifest;
  }
}

async function lockSnapshotTransition(
  transaction: DatabaseTransaction,
  transactionId: string,
  moduleId: string,
): Promise<Readonly<{
  stage: AreaCreateSnapshotStageDescriptor;
  head: ModuleSnapshotHead;
}>> {
  const stageRows = await transaction.query<StageRow[]>(`${stageSelectSql()} FOR UPDATE`, [
    transactionId,
  ]);
  if (!stageRows[0]) {
    throw snapshotError(
      "AREA_SNAPSHOT_STAGE_MISSING",
      "Area Create snapshot stage does not exist.",
    );
  }
  const stage = mapStageRow(stageRows[0]);
  if (stage.moduleId !== moduleId) {
    throw snapshotError(
      "AREA_SNAPSHOT_STAGE_IDENTITY_MISMATCH",
      "Lease module does not match the staged transaction.",
    );
  }
  const headRows = await transaction.query<HeadRow[]>(`${headSelectSql()} FOR UPDATE`, [
    moduleId,
  ]);
  if (!headRows[0]) {
    throw snapshotError(
      "AREA_SNAPSHOT_HEAD_MISSING",
      "Module snapshot head does not exist.",
    );
  }
  return Object.freeze({ stage, head: mapHeadRow(headRows[0]) });
}

async function assertCurrentLease(
  transaction: DatabaseTransaction,
  lease: AreaCreateModuleLease,
  now: Date,
): Promise<void> {
  const rows = await transaction.query<LockRow[]>(
    `
      SELECT module_id, lease_id, owner_transaction_id, fencing_token, lease_expires_at
      FROM area_create_module_locks
      WHERE module_id = ?
      FOR UPDATE
    `,
    [lease.moduleId],
  );
  const row = rows[0];
  if (
    !row ||
    row.lease_id !== lease.leaseId ||
    row.owner_transaction_id !== lease.ownerTransactionId ||
    Number(row.fencing_token) !== lease.fencingToken ||
    !row.lease_expires_at ||
    new Date(toIso(row.lease_expires_at)).getTime() <= now.getTime()
  ) {
    throw snapshotError(
      "AREA_CREATE_CONTROL_FENCED",
      "Area Create module lease is missing, expired, or fenced.",
    );
  }
}

function stageSelectSql(): string {
  return `
    SELECT transaction_id, schema_version, module_id, lease_id, fencing_token,
           base_revision, base_manifest_key, base_manifest_sha256,
           successor_revision, successor_manifest_key, successor_manifest_sha256,
           candidate_logical_keys_json, created_at
    FROM area_create_snapshot_stages
    WHERE transaction_id = ?
    LIMIT 1
  `;
}

function headSelectSql(): string {
  return `
    SELECT module_id, schema_version, revision, manifest_key, manifest_sha256,
           quarantined, fencing_token, updated_at
    FROM module_snapshot_heads
    WHERE module_id = ?
    LIMIT 1
  `;
}

function mapHeadRow(row: HeadRow): ModuleSnapshotHead {
  if (
    row.schema_version !== MODULE_SNAPSHOT_HEAD_SCHEMA_VERSION ||
    !MODULE_ID_PATTERN.test(row.module_id) ||
    !SHA256_PATTERN.test(row.revision) ||
    !SHA256_PATTERN.test(row.manifest_sha256)
  ) {
    throw snapshotError(
      "AREA_SNAPSHOT_HEAD_INVALID",
      "Persisted module snapshot head is invalid.",
    );
  }
  return freezeClone({
    schemaVersion: MODULE_SNAPSHOT_HEAD_SCHEMA_VERSION,
    moduleId: row.module_id,
    revision: row.revision,
    manifestKey: row.manifest_key,
    manifestSha256: row.manifest_sha256,
    quarantined: Number(row.quarantined) === 1,
    fencingToken: Number(row.fencing_token),
    updatedAt: toIso(row.updated_at),
  });
}

function mapStageRow(row: StageRow): AreaCreateSnapshotStageDescriptor {
  return freezeClone({
    schemaVersion: row.schema_version as typeof AREA_CREATE_SNAPSHOT_STAGE_SCHEMA_VERSION,
    transactionId: row.transaction_id,
    moduleId: row.module_id,
    leaseId: row.lease_id,
    fencingToken: Number(row.fencing_token),
    base: {
      revision: row.base_revision,
      manifestKey: row.base_manifest_key,
      manifestSha256: row.base_manifest_sha256,
    },
    successor: {
      revision: row.successor_revision,
      manifestKey: row.successor_manifest_key,
      manifestSha256: row.successor_manifest_sha256,
    },
    candidateLogicalKeys: parseJson<readonly string[]>(row.candidate_logical_keys_json),
    createdAt: toIso(row.created_at),
  });
}

function normalizeCandidateKeys(values: readonly string[]): readonly string[] {
  if (!Array.isArray(values) || values.length === 0) {
    throw snapshotError(
      "AREA_SNAPSHOT_STAGE_INVALID",
      "Area Create stage candidate key list is empty.",
    );
  }
  const keys = values.map(normalizeModuleSnapshotLogicalKey);
  const sorted = [...keys].sort((left, right) =>
    left.toLowerCase().localeCompare(right.toLowerCase(), "en"),
  );
  if (
    new Set(keys.map((key) => key.toLowerCase())).size !== keys.length ||
    !sameJson(keys, sorted)
  ) {
    throw snapshotError(
      "AREA_SNAPSHOT_STAGE_INVALID",
      "Area Create stage candidate keys must be unique and sorted.",
    );
  }
  return Object.freeze(keys);
}

function assertPublishLease(
  stage: AreaCreateSnapshotStageDescriptor,
  lease: AreaCreateModuleLease,
): void {
  if (
    lease.moduleId !== stage.moduleId ||
    lease.ownerTransactionId !== stage.transactionId ||
    lease.leaseId !== stage.leaseId ||
    lease.fencingToken !== stage.fencingToken
  ) {
    throw snapshotError(
      "AREA_SNAPSHOT_STAGE_IDENTITY_MISMATCH",
      "Publication lease does not match the staged transaction.",
    );
  }
}

function assertRecoveryLease(
  stage: AreaCreateSnapshotStageDescriptor,
  lease: AreaCreateModuleLease,
): void {
  if (
    lease.moduleId !== stage.moduleId ||
    lease.ownerTransactionId !== stage.transactionId ||
    lease.fencingToken < stage.fencingToken
  ) {
    throw snapshotError(
      "AREA_SNAPSHOT_STAGE_IDENTITY_MISMATCH",
      "Recovery lease does not own the staged transaction.",
    );
  }
}

function assertSameStage(
  expected: AreaCreateSnapshotStageDescriptor,
  actual: AreaCreateSnapshotStageDescriptor,
): void {
  if (!sameJson(expected, actual)) {
    throw snapshotError(
      "AREA_SNAPSHOT_STAGE_CONFLICT",
      "Area Create stage changed between validation and head locking.",
    );
  }
}

function sameIdentity(
  head: ModuleSnapshotHead,
  identity: ModuleSnapshotHeadIdentity,
): boolean {
  return (
    head.revision === identity.revision &&
    head.manifestKey === identity.manifestKey &&
    head.manifestSha256 === identity.manifestSha256
  );
}

function manifestIdentity(manifest: ModuleSnapshotManifest): ModuleSnapshotHeadIdentity {
  return Object.freeze({
    revision: manifest.revision,
    manifestKey: buildModuleSnapshotManifestKey(manifest),
    manifestSha256: hashModuleSnapshotManifest(manifest),
  });
}

function createHead(
  moduleId: string,
  identity: ModuleSnapshotHeadIdentity,
  quarantined: boolean,
  fencingToken: number,
  updatedAt: string,
): ModuleSnapshotHead {
  return Object.freeze({
    schemaVersion: MODULE_SNAPSHOT_HEAD_SCHEMA_VERSION,
    moduleId,
    ...identity,
    quarantined,
    fencingToken,
    updatedAt,
  });
}

function validateDiagnostics(values: readonly string[]): readonly string[] {
  if (!Array.isArray(values) || values.length === 0 || values.length > MAX_DIAGNOSTICS) {
    throw snapshotError(
      "AREA_SNAPSHOT_QUARANTINE_INVALID",
      "Quarantine diagnostics must contain 1..100 entries.",
    );
  }
  for (const value of values) {
    if (
      typeof value !== "string" ||
      value.length === 0 ||
      Buffer.byteLength(value, "utf8") > MAX_DIAGNOSTIC_BYTES
    ) {
      throw snapshotError(
        "AREA_SNAPSHOT_QUARANTINE_INVALID",
        "Quarantine diagnostic is empty or exceeds 1,024 UTF-8 bytes.",
      );
    }
  }
  return Object.freeze([...values]);
}

function qualifyObjectKey(settings: BlobStorageSettings, internalKey: string): string {
  const prefix = settings.modulePrefix.trim().replace(/^\/+|\/+$/gu, "");
  return prefix ? `${prefix}/${internalKey}` : internalKey;
}

function parseJson<T>(value: string | T): T {
  return (typeof value === "string" ? JSON.parse(value) : value) as T;
}

function toSqlDate(value: Date): string {
  return value.toISOString().slice(0, 23).replace("T", " ");
}

function toIso(value: Date | string): string {
  if (value instanceof Date) {
    return value.toISOString();
  }
  const normalized = /(?:Z|[+-]\d\d:\d\d)$/u.test(value)
    ? value
    : `${value.replace(" ", "T")}Z`;
  return new Date(normalized).toISOString();
}

function isCanonicalIso(value: string): boolean {
  try {
    return new Date(value).toISOString() === value;
  } catch {
    return false;
  }
}

function isDuplicateEntryError(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === "object" &&
      (error as { code?: string }).code === "ER_DUP_ENTRY",
  );
}

function assertAffected(result: ResultSetHeader, code: string): void {
  if (result.affectedRows !== 1) {
    throw snapshotError(code, "Module snapshot compare-and-set failed.");
  }
}

function sha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function snapshotError(code: string, message: string): Error {
  return new Error(`${code}: ${message}`);
}

function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function freezeClone<T>(value: T): T {
  return deepFreeze(structuredClone(value));
}

function deepFreeze<T>(value: T): T {
  if (Object(value) !== value) {
    return value;
  }
  for (const child of Object.values(value as Record<string, unknown>)) {
    deepFreeze(child);
  }
  return Object.freeze(value);
}
