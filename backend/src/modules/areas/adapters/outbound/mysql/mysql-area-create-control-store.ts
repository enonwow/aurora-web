import { randomUUID } from "node:crypto";
import { Injectable } from "@nestjs/common";
import type { ResultSetHeader } from "mysql2";
import {
  DatabaseService,
  type DatabaseTransaction,
} from "../../../../../database/database.service";
import type {
  AreaCreateIdempotencyEntry,
} from "../../../domain/area-create-idempotency";
import {
  createAreaCreateIdempotencyEntry,
} from "../../../domain/area-create-idempotency";
import {
  canTransitionAreaCreateJournal,
  createAreaCreateCandidateManifest,
  isAreaCreateJournalBlocking,
} from "../../../domain/area-create-journal-policy";
import type {
  AreaCreateIdempotencyRepositoryPort,
  AreaCreateModuleLease,
  AreaCreateModuleLockPort,
  AreaCreateTransactionJournalPort,
} from "../../../application/ports/area-create-transaction.port";
import type {
  AreaCreateCandidateManifest,
  AreaCreateJournalRecord,
  AreaCreateJournalState,
  AreaCreatePersistedJournalRecord,
  AreaCreateReceipt,
} from "../../../domain/area-create-transaction.types";
import { sameAreaTileProductionAdmissionBinding } from "../../../domain/area-tile-production-admission";

const LEASE_DURATION_MS = 30_000;
const IDEMPOTENCY_RETENTION_MS = 24 * 60 * 60 * 1_000;
const MAX_MANIFEST_BYTES = 1_048_576;

interface LockRow {
  module_id: string;
  lease_id: string | null;
  owner_transaction_id: string | null;
  fencing_token: number | string;
  lease_expires_at: Date | string | null;
  updated_at: Date | string;
}

interface BlockingJournalRow {
  transaction_id: string;
  state: AreaCreateJournalState;
  operation: "create" | "lifecycle";
}

interface JournalRow {
  transaction_id: string;
  module_id: string;
  actor_id: string;
  idempotency_key: string;
  command_hash: string;
  expected_module_revision: string;
  profile_id: string;
  profile_fingerprint_sha256: string;
  set_fingerprint_sha256: string;
  draft_revision: number | string;
  draft_normalized_sha256: string;
  lease_id: string;
  fencing_token: number | string;
  state: AreaCreateJournalState;
  candidate_manifest_json: string | AreaCreateCandidateManifest;
  receipt_json: string | AreaCreateReceipt | null;
  diagnostics_json: string | readonly string[];
  created_at: Date | string;
  updated_at: Date | string;
}

interface IdempotencyRow {
  module_id: string;
  idempotency_key: string;
  command_hash: string;
  transaction_id: string;
  result_json: string | AreaCreateReceipt;
  created_at: Date | string;
}

@Injectable()
export class MySqlAreaCreateControlStore
  implements
    AreaCreateModuleLockPort,
    AreaCreateIdempotencyRepositoryPort,
    AreaCreateTransactionJournalPort
{
  constructor(private readonly database: DatabaseService) {}

  async acquire(
    moduleId: string,
    transactionId: string,
    options: Readonly<{ recoveryOfTransactionId?: string }> = {},
  ): Promise<AreaCreateModuleLease | null> {
    return this.database.withTransaction(async (transaction) => {
      const now = new Date();
      const lock = await selectLock(transaction, moduleId);
      if (lock?.lease_id && isFuture(lock.lease_expires_at, now)) {
        return null;
      }

      const blocking = await selectBlockingJournals(transaction, moduleId);
      const recoveryOf = options.recoveryOfTransactionId;
      if (blocking.length > 0) {
        if (
          !recoveryOf ||
          blocking.length !== 1 ||
          blocking[0].transaction_id !== recoveryOf ||
          blocking[0].state === "quarantine_required"
        ) {
          return null;
        }
      } else if (recoveryOf) {
        return null;
      }

      const leaseId = randomUUID();
      const ownerTransactionId = recoveryOf ?? transactionId;
      const fencingToken = Number(lock?.fencing_token ?? 0) + 1;
      const expiresAt = new Date(now.getTime() + LEASE_DURATION_MS);
      if (lock) {
        const updated = await transaction.query<ResultSetHeader>(
          `
            UPDATE area_create_module_locks
            SET lease_id = ?, owner_transaction_id = ?, fencing_token = ?,
                lease_expires_at = ?, updated_at = ?
            WHERE module_id = ? AND fencing_token = ?
          `,
          [
            leaseId,
            ownerTransactionId,
            fencingToken,
            toSqlDate(expiresAt),
            toSqlDate(now),
            moduleId,
            Number(lock.fencing_token),
          ],
        );
        assertAffected(updated, "AREA_CREATE_CONTROL_FENCED");
      } else {
        await transaction.query<ResultSetHeader>(
          `
            INSERT INTO area_create_module_locks (
              module_id, lease_id, owner_transaction_id, fencing_token,
              lease_expires_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?)
          `,
          [
            moduleId,
            leaseId,
            ownerTransactionId,
            fencingToken,
            toSqlDate(expiresAt),
            toSqlDate(now),
          ],
        );
      }

      if (recoveryOf) {
        const owner = blocking[0];
        const updated = owner.operation === "create"
          ? await transaction.query<ResultSetHeader>(
              `
                UPDATE area_create_transactions
                SET lease_id = ?, fencing_token = ?, updated_at = ?
                WHERE transaction_id = ? AND module_id = ?
                  AND state NOT IN ('complete', 'compensated', 'quarantine_required')
              `,
              [leaseId, fencingToken, toSqlDate(now), recoveryOf, moduleId],
            )
          : await transaction.query<ResultSetHeader>(
              `
                UPDATE area_lifecycle_mutation_transactions
                SET lease_id = ?, fencing_token = ?, updated_at = ?
                WHERE transaction_id = ? AND module_id = ?
                  AND state NOT IN ('complete', 'compensated', 'quarantine_required')
              `,
              [leaseId, fencingToken, toSqlDate(now), recoveryOf, moduleId],
            );
        assertAffected(updated, "AREA_CREATE_CONTROL_FENCED");
      }

      return freezeClone({
        moduleId,
        leaseId,
        ownerTransactionId,
        fencingToken,
        expiresAt: expiresAt.toISOString(),
      });
    });
  }

  async release(lease: AreaCreateModuleLease): Promise<boolean> {
    const result = await this.database.query<ResultSetHeader>(
      `
        UPDATE area_create_module_locks
        SET lease_id = NULL, owner_transaction_id = NULL,
            lease_expires_at = NULL, updated_at = UTC_TIMESTAMP(3)
        WHERE module_id = ? AND lease_id = ? AND owner_transaction_id = ?
          AND fencing_token = ? AND lease_expires_at > UTC_TIMESTAMP(3)
      `,
      [
        lease.moduleId,
        lease.leaseId,
        lease.ownerTransactionId,
        lease.fencingToken,
      ],
    );
    return result.affectedRows === 1;
  }

  async read(
    moduleId: string,
    key: string,
  ): Promise<AreaCreateIdempotencyEntry<AreaCreateReceipt> | null> {
    const rows = await this.database.query<IdempotencyRow[]>(
      `
        SELECT module_id, idempotency_key, command_hash, transaction_id,
               result_json, created_at
        FROM area_create_idempotency
        WHERE module_id = ? AND idempotency_key = ?
        LIMIT 1
      `,
      [moduleId, key],
    );
    return rows[0] ? mapIdempotencyRow(rows[0]) : null;
  }

  async begin(record: AreaCreateJournalRecord): Promise<void> {
    const manifest = createAreaCreateCandidateManifest(record);
    const serializedManifest = JSON.stringify(manifest);
    if (Buffer.byteLength(serializedManifest, "utf8") > MAX_MANIFEST_BYTES) {
      throw controlError(
        "AREA_CREATE_JOURNAL_MANIFEST_TOO_LARGE",
        "Area Create candidate manifest exceeds the durable control-store budget.",
      );
    }

    await this.database.withTransaction(async (transaction) => {
      const lease = leaseFromRecord(record);
      await assertOwnedLease(transaction, lease);
      if (record.transactionId !== lease.ownerTransactionId) {
        throw controlError(
          "AREA_CREATE_CONTROL_FENCED",
          "Journal transaction does not own the module lease.",
        );
      }
      const existingRows = await selectJournal(transaction, record.transactionId);
      if (existingRows[0]) {
        const existing = mapJournalRow(existingRows[0]);
        if (
          existing.moduleId === record.moduleId &&
          existing.commandHash === record.commandHash &&
          existing.idempotencyKey === record.idempotencyKey
        ) {
          return;
        }
        throw controlError(
          "AREA_CREATE_JOURNAL_CONFLICT",
          "Transaction ID is already bound to a different Area Create command.",
        );
      }

      const now = new Date();
      await transaction.query<ResultSetHeader>(
        `
          INSERT INTO area_create_transactions (
            transaction_id, module_id, actor_id, idempotency_key, command_hash,
            expected_module_revision, profile_id, profile_fingerprint_sha256,
            set_fingerprint_sha256, draft_revision, draft_normalized_sha256,
            lease_id, fencing_token, state, candidate_manifest_json,
            diagnostics_json, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'prepared', ?, ?, ?, ?)
        `,
        [
          record.transactionId,
          record.moduleId,
          record.actorId,
          record.idempotencyKey,
          record.commandHash,
          record.expectedModuleRevision,
          record.profileId,
          record.profileFingerprintSha256,
          record.setFingerprintSha256,
          record.draftRevision,
          record.draftNormalizedSha256,
          record.leaseId,
          record.fencingToken,
          serializedManifest,
          JSON.stringify([]),
          toSqlDate(new Date(record.createdAt)),
          toSqlDate(now),
        ],
      );
    });
  }

  async transition(
    transactionId: string,
    state: AreaCreateJournalState,
    lease: AreaCreateModuleLease,
  ): Promise<void> {
    await this.database.withTransaction(async (transaction) => {
      await assertOwnedLease(transaction, lease);
      const rows = await selectJournal(transaction, transactionId);
      const row = rows[0];
      if (!row) {
        throw controlError(
          "AREA_CREATE_JOURNAL_MISSING",
          "Area Create journal does not exist.",
        );
      }
      assertJournalLease(row, lease);
      if (row.state === state) {
        return;
      }
      if (!canTransitionAreaCreateJournal(row.state, state)) {
        throw controlError(
          "AREA_CREATE_JOURNAL_TRANSITION_INVALID",
          `Area Create journal cannot transition from ${row.state} to ${state}.`,
        );
      }
      const updated = await transaction.query<ResultSetHeader>(
        `
          UPDATE area_create_transactions
          SET state = ?, updated_at = UTC_TIMESTAMP(3)
          WHERE transaction_id = ? AND module_id = ? AND state = ?
            AND lease_id = ? AND fencing_token = ?
        `,
        [
          state,
          transactionId,
          lease.moduleId,
          row.state,
          lease.leaseId,
          lease.fencingToken,
        ],
      );
      assertAffected(updated, "AREA_CREATE_CONTROL_FENCED");
    });
  }

  async recordReadback(
    transactionId: string,
    lease: AreaCreateModuleLease,
    receipt: AreaCreateReceipt,
  ): Promise<void> {
    await this.database.withTransaction(async (transaction) => {
      await assertOwnedLease(transaction, lease);
      const rows = await selectJournal(transaction, transactionId);
      const row = rows[0];
      if (!row) {
        throw controlError(
          "AREA_CREATE_JOURNAL_MISSING",
          "Area Create journal does not exist.",
        );
      }
      assertJournalLease(row, lease);
      if (row.state === "readback_verified") {
        const existingReceipt = row.receipt_json
          ? parseJson<AreaCreateReceipt>(row.receipt_json)
          : null;
        if (existingReceipt && JSON.stringify(existingReceipt) === JSON.stringify(receipt)) {
          return;
        }
        throw controlError(
          "AREA_CREATE_READBACK_CONFLICT",
          "Readback receipt differs from the one already retained in the journal.",
        );
      }
      if (row.state !== "ifo_committed") {
        throw controlError(
          "AREA_CREATE_JOURNAL_TRANSITION_INVALID",
          "Readback can be recorded only after IFO commit.",
        );
      }
      assertReceiptIdentity(row, receipt);
      const updated = await transaction.query<ResultSetHeader>(
        `
          UPDATE area_create_transactions
          SET state = 'readback_verified', receipt_json = ?,
              updated_at = UTC_TIMESTAMP(3)
          WHERE transaction_id = ? AND module_id = ? AND state = 'ifo_committed'
            AND lease_id = ? AND fencing_token = ?
        `,
        [
          JSON.stringify(receipt),
          transactionId,
          lease.moduleId,
          lease.leaseId,
          lease.fencingToken,
        ],
      );
      assertAffected(updated, "AREA_CREATE_CONTROL_FENCED");
    });
  }

  async finalize(
    transactionId: string,
    lease: AreaCreateModuleLease,
    entry: AreaCreateIdempotencyEntry<AreaCreateReceipt>,
  ): Promise<void> {
    await this.database.withTransaction(async (transaction) => {
      await assertOwnedLease(transaction, lease);
      const journalRows = await selectJournal(transaction, transactionId);
      const journalRow = journalRows[0];
      if (!journalRow) {
        throw controlError(
          "AREA_CREATE_JOURNAL_MISSING",
          "Area Create journal does not exist.",
        );
      }
      assertJournalLease(journalRow, lease);
      const idempotencyRows = await selectIdempotency(
        transaction,
        entry.moduleId,
        entry.key,
      );
      const existing = idempotencyRows[0]
        ? mapIdempotencyRow(idempotencyRows[0])
        : null;

      if (journalRow.state === "complete") {
        if (existing && sameIdempotencyEntry(existing, entry)) {
          return;
        }
        throw idempotencyConflict();
      }
      if (journalRow.state !== "readback_verified") {
        throw controlError(
          "AREA_CREATE_JOURNAL_TRANSITION_INVALID",
          "Only a readback-verified Area Create transaction can be finalized.",
        );
      }
      const durableReceipt = journalRow.receipt_json
        ? parseJson<AreaCreateReceipt>(journalRow.receipt_json)
        : null;
      if (!durableReceipt || JSON.stringify(durableReceipt) !== JSON.stringify(entry.result)) {
        throw idempotencyConflict();
      }
      if (
        entry.moduleId !== journalRow.module_id ||
        entry.key !== journalRow.idempotency_key ||
        entry.commandHash !== journalRow.command_hash ||
        entry.result.transactionId !== journalRow.transaction_id
      ) {
        throw idempotencyConflict();
      }
      if (existing && !sameIdempotencyEntry(existing, entry)) {
        throw idempotencyConflict();
      }

      if (!existing) {
        const createdAt = new Date(entry.createdAt);
        await transaction.query<ResultSetHeader>(
          `
            INSERT INTO area_create_idempotency (
              module_id, idempotency_key, command_hash, transaction_id,
              result_json, created_at, expires_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
          `,
          [
            entry.moduleId,
            entry.key,
            entry.commandHash,
            entry.result.transactionId,
            JSON.stringify(entry.result),
            toSqlDate(createdAt),
            toSqlDate(new Date(createdAt.getTime() + IDEMPOTENCY_RETENTION_MS)),
          ],
        );
      }

      const completed = await transaction.query<ResultSetHeader>(
        `
          UPDATE area_create_transactions
          SET state = 'complete', updated_at = UTC_TIMESTAMP(3)
          WHERE transaction_id = ? AND module_id = ? AND state = 'readback_verified'
            AND lease_id = ? AND fencing_token = ?
        `,
        [transactionId, lease.moduleId, lease.leaseId, lease.fencingToken],
      );
      assertAffected(completed, "AREA_CREATE_CONTROL_FENCED");
    });
  }

  async readJournal(
    transactionId: string,
  ): Promise<AreaCreatePersistedJournalRecord | null> {
    const rows = await this.database.query<JournalRow[]>(
      `${journalSelectSql()} WHERE transaction_id = ? LIMIT 1`,
      [transactionId],
    );
    return rows[0] ? mapJournalRow(rows[0]) : null;
  }

  async listRecoverable(
    limit: number,
  ): Promise<readonly AreaCreatePersistedJournalRecord[]> {
    const normalizedLimit = Math.min(Math.max(Math.trunc(limit), 1), 1_000);
    const rows = await this.database.query<JournalRow[]>(
      `
        ${journalSelectSql("t")}
        LEFT JOIN area_create_module_locks l ON l.module_id = t.module_id
        WHERE t.state IN (
          'prepared', 'staged', 'resources_committed', 'ifo_committed',
          'readback_verified', 'compensation_pending'
        )
          AND (l.lease_id IS NULL OR l.lease_expires_at <= UTC_TIMESTAMP(3))
        ORDER BY t.created_at ASC, t.transaction_id ASC
        LIMIT ?
      `,
      [normalizedLimit],
    );
    return Object.freeze(rows.map((row) => mapJournalRow(row)));
  }
}

async function selectLock(
  transaction: DatabaseTransaction,
  moduleId: string,
): Promise<LockRow | null> {
  const rows = await transaction.query<LockRow[]>(
    `
      SELECT module_id, lease_id, owner_transaction_id, fencing_token,
             lease_expires_at, updated_at
      FROM area_create_module_locks
      WHERE module_id = ?
      LIMIT 1
      FOR UPDATE
    `,
    [moduleId],
  );
  return rows[0] ?? null;
}

async function selectBlockingJournals(
  transaction: DatabaseTransaction,
  moduleId: string,
): Promise<BlockingJournalRow[]> {
  const createRows = await transaction.query<Array<Omit<BlockingJournalRow, "operation">>>(
    `
      SELECT transaction_id, state
      FROM area_create_transactions
      WHERE module_id = ? AND state NOT IN ('complete', 'compensated')
      ORDER BY created_at ASC, transaction_id ASC
      FOR UPDATE
    `,
    [moduleId],
  );
  const lifecycleRows = await transaction.query<Array<Omit<BlockingJournalRow, "operation">>>(
    `
      SELECT transaction_id, state
      FROM area_lifecycle_mutation_transactions
      WHERE module_id = ? AND state NOT IN ('complete', 'compensated')
      ORDER BY created_at ASC, transaction_id ASC
      FOR UPDATE
    `,
    [moduleId],
  );
  return [
    ...createRows.map((row) => ({ ...row, operation: "create" as const })),
    ...lifecycleRows.map((row) => ({ ...row, operation: "lifecycle" as const })),
  ]
    .filter((row) => isAreaCreateJournalBlocking(row.state))
    .sort((left, right) => left.transaction_id.localeCompare(right.transaction_id));
}

async function selectJournal(
  transaction: DatabaseTransaction,
  transactionId: string,
): Promise<JournalRow[]> {
  return transaction.query<JournalRow[]>(
    `${journalSelectSql()} WHERE transaction_id = ? LIMIT 1 FOR UPDATE`,
    [transactionId],
  );
}

async function selectIdempotency(
  transaction: DatabaseTransaction,
  moduleId: string,
  key: string,
): Promise<IdempotencyRow[]> {
  return transaction.query<IdempotencyRow[]>(
    `
      SELECT module_id, idempotency_key, command_hash, transaction_id,
             result_json, created_at
      FROM area_create_idempotency
      WHERE module_id = ? AND idempotency_key = ?
      LIMIT 1
      FOR UPDATE
    `,
    [moduleId, key],
  );
}

async function assertOwnedLease(
  transaction: DatabaseTransaction,
  lease: AreaCreateModuleLease,
): Promise<void> {
  const row = await selectLock(transaction, lease.moduleId);
  if (
    !row ||
    row.lease_id !== lease.leaseId ||
    row.owner_transaction_id !== lease.ownerTransactionId ||
    Number(row.fencing_token) !== lease.fencingToken ||
    !isFuture(row.lease_expires_at, new Date())
  ) {
    throw controlError(
      "AREA_CREATE_CONTROL_FENCED",
      "Area Create module lease is missing, expired, or superseded.",
    );
  }
}

function assertJournalLease(row: JournalRow, lease: AreaCreateModuleLease): void {
  if (
    row.module_id !== lease.moduleId ||
    row.lease_id !== lease.leaseId ||
    Number(row.fencing_token) !== lease.fencingToken ||
    row.transaction_id !== lease.ownerTransactionId
  ) {
    throw controlError(
      "AREA_CREATE_CONTROL_FENCED",
      "Area Create journal is owned by another fencing lease.",
    );
  }
}

function assertReceiptIdentity(row: JournalRow, receipt: AreaCreateReceipt): void {
  const candidateManifest = parseJson<AreaCreateCandidateManifest>(
    row.candidate_manifest_json,
  );
  if (
    receipt.transactionId !== row.transaction_id ||
    receipt.moduleId !== row.module_id ||
    receipt.commandHash !== row.command_hash ||
    receipt.profileId !== row.profile_id ||
    receipt.profileFingerprintSha256 !== row.profile_fingerprint_sha256 ||
    receipt.setFingerprintSha256 !== row.set_fingerprint_sha256 ||
    !sameAreaTileProductionAdmissionBinding(
      receipt.tileProductionAdmission,
      candidateManifest.tileProductionAdmission,
    ) ||
    receipt.draftNormalizedSha256 !== row.draft_normalized_sha256 ||
    receipt.readbackStatus !== "verified"
  ) {
    throw controlError(
      "AREA_CREATE_READBACK_CONFLICT",
      "Readback receipt is outside the durable journal identity scope.",
    );
  }
}

function leaseFromRecord(record: AreaCreateJournalRecord): AreaCreateModuleLease {
  return {
    moduleId: record.moduleId,
    leaseId: record.leaseId,
    ownerTransactionId: record.transactionId,
    fencingToken: record.fencingToken,
    expiresAt: record.createdAt,
  };
}

function mapIdempotencyRow(
  row: IdempotencyRow,
): AreaCreateIdempotencyEntry<AreaCreateReceipt> {
  return createAreaCreateIdempotencyEntry({
    moduleId: row.module_id,
    key: row.idempotency_key,
    commandHash: row.command_hash,
    createdAt: toIso(row.created_at),
    result: parseJson<AreaCreateReceipt>(row.result_json),
  });
}

function mapJournalRow(row: JournalRow): AreaCreatePersistedJournalRecord {
  return freezeClone({
    transactionId: row.transaction_id,
    moduleId: row.module_id,
    actorId: row.actor_id,
    idempotencyKey: row.idempotency_key,
    commandHash: row.command_hash,
    expectedModuleRevision: row.expected_module_revision,
    profileId: row.profile_id,
    profileFingerprintSha256: row.profile_fingerprint_sha256,
    setFingerprintSha256: row.set_fingerprint_sha256,
    draftRevision: Number(row.draft_revision),
    draftNormalizedSha256: row.draft_normalized_sha256,
    leaseId: row.lease_id,
    fencingToken: Number(row.fencing_token),
    state: row.state,
    candidateManifest: parseJson<AreaCreateCandidateManifest>(row.candidate_manifest_json),
    ...(row.receipt_json === null
      ? {}
      : { receipt: parseJson<AreaCreateReceipt>(row.receipt_json) }),
    diagnostics: parseJson<readonly string[]>(row.diagnostics_json),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  });
}

function journalSelectSql(alias?: string): string {
  const prefix = alias ? `${alias}.` : "";
  return `
    SELECT
      ${prefix}transaction_id, ${prefix}module_id, ${prefix}actor_id,
      ${prefix}idempotency_key, ${prefix}command_hash,
      ${prefix}expected_module_revision, ${prefix}profile_id,
      ${prefix}profile_fingerprint_sha256, ${prefix}set_fingerprint_sha256,
      ${prefix}draft_revision, ${prefix}draft_normalized_sha256,
      ${prefix}lease_id, ${prefix}fencing_token, ${prefix}state,
      ${prefix}candidate_manifest_json, ${prefix}receipt_json, ${prefix}diagnostics_json,
      ${prefix}created_at, ${prefix}updated_at
    FROM area_create_transactions${alias ? ` ${alias}` : ""}
  `;
}

function isFuture(value: Date | string | null, now: Date): boolean {
  return value !== null && new Date(toIso(value)).getTime() > now.getTime();
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

function parseJson<T>(value: string | T): T {
  return (typeof value === "string" ? JSON.parse(value) : value) as T;
}

function assertAffected(result: ResultSetHeader, code: string): void {
  if (result.affectedRows !== 1) {
    throw controlError(code, "Area Create control-store compare-and-set failed.");
  }
}

function sameIdempotencyEntry(
  left: AreaCreateIdempotencyEntry<AreaCreateReceipt>,
  right: AreaCreateIdempotencyEntry<AreaCreateReceipt>,
): boolean {
  return (
    left.moduleId === right.moduleId &&
    left.key === right.key &&
    left.commandHash === right.commandHash &&
    left.createdAt === right.createdAt &&
    JSON.stringify(left.result) === JSON.stringify(right.result)
  );
}

function idempotencyConflict(): Error {
  return controlError(
    "AREA_CREATE_IDEMPOTENCY_CONFLICT",
    "Idempotency key is already retained for another Area Create result.",
  );
}

function controlError(code: string, message: string): Error {
  return new Error(`${code}: ${message}`);
}

function freezeClone<T>(value: T): T {
  return deepFreeze(structuredClone(value));
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) {
    return value;
  }
  for (const child of Object.values(value as Record<string, unknown>)) {
    deepFreeze(child);
  }
  return Object.freeze(value);
}
