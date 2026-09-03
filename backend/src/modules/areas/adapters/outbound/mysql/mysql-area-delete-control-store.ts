import { Injectable } from "@nestjs/common";
import type { ResultSetHeader } from "mysql2";
import {
  DatabaseService,
  type DatabaseTransaction,
} from "../../../../../database/database.service";
import type { AreaCreateIdempotencyEntry } from "../../../domain/area-create-idempotency";
import { createAreaCreateIdempotencyEntry } from "../../../domain/area-create-idempotency";
import { canTransitionAreaCreateJournal } from "../../../domain/area-create-journal-policy";
import { createAreaDeleteCandidateManifest } from "../../../domain/area-delete-journal-policy";
import type {
  AreaDeleteCandidateManifest,
  AreaDeleteJournalRecord,
  AreaDeleteJournalState,
  AreaDeletePersistedJournalRecord,
  AreaDeleteReceipt,
} from "../../../domain/area-delete-transaction.types";
import type {
  AreaDeleteIdempotencyRepositoryPort,
  AreaDeleteTransactionJournalPort,
} from "../../../application/ports/area-delete-transaction.port";
import type { AreaCreateModuleLease } from "../../../application/ports/area-create-transaction.port";

const OPERATION = "area_delete" as const;
const IDEMPOTENCY_RETENTION_MS = 24 * 60 * 60 * 1_000;
const MAX_MANIFEST_BYTES = 1_048_576;
const MAX_METADATA_BYTES = 4_096;

interface OperationMetadata {
  readonly previewSha256: string;
}

interface LockRow {
  module_id: string;
  lease_id: string | null;
  owner_transaction_id: string | null;
  fencing_token: number | string;
  lease_expires_at: Date | string | null;
}

interface JournalRow {
  transaction_id: string;
  operation: string;
  module_id: string;
  area_resref: string;
  actor_id: string;
  idempotency_key: string;
  command_hash: string;
  expected_module_revision: string;
  draft_revision: number | string | null;
  draft_normalized_sha256: string | null;
  lease_id: string;
  fencing_token: number | string;
  state: AreaDeleteJournalState;
  operation_metadata_json: string | OperationMetadata;
  candidate_manifest_json: string | AreaDeleteCandidateManifest;
  receipt_json: string | AreaDeleteReceipt | null;
  diagnostics_json: string | readonly string[];
  created_at: Date | string;
  updated_at: Date | string;
}

interface IdempotencyRow {
  operation: string;
  module_id: string;
  idempotency_key: string;
  command_hash: string;
  transaction_id: string;
  result_json: string | AreaDeleteReceipt;
  created_at: Date | string;
}

@Injectable()
export class MySqlAreaDeleteControlStore
  implements AreaDeleteIdempotencyRepositoryPort, AreaDeleteTransactionJournalPort
{
  constructor(private readonly database: DatabaseService) {}

  async read(
    moduleId: string,
    key: string,
  ): Promise<AreaCreateIdempotencyEntry<AreaDeleteReceipt> | null> {
    const rows = await this.database.query<IdempotencyRow[]>(
      `
        SELECT operation, module_id, idempotency_key, command_hash,
               transaction_id, result_json, created_at
        FROM area_lifecycle_mutation_idempotency
        WHERE operation = 'area_delete' AND module_id = ? AND idempotency_key = ?
        LIMIT 1
      `,
      [moduleId, key],
    );
    return rows[0] ? mapIdempotency(rows[0]) : null;
  }

  async begin(record: AreaDeleteJournalRecord): Promise<void> {
    const metadata: OperationMetadata = Object.freeze({
      previewSha256: record.previewSha256,
    });
    const manifest = createAreaDeleteCandidateManifest(record);
    const serializedMetadata = JSON.stringify(metadata);
    const serializedManifest = JSON.stringify(manifest);
    if (
      Buffer.byteLength(serializedMetadata, "utf8") > MAX_METADATA_BYTES ||
      Buffer.byteLength(serializedManifest, "utf8") > MAX_MANIFEST_BYTES
    ) {
      throw controlError(
        "AREA_DELETE_JOURNAL_TOO_LARGE",
        "Area Delete recovery metadata exceeds its durable budget.",
      );
    }
    await this.database.withTransaction(async (transaction) => {
      const lease = leaseFromRecord(record);
      await assertOwnedLease(transaction, lease);
      const existingRow = (await selectJournal(transaction, record.transactionId))[0];
      if (existingRow) {
        const existing = mapJournal(existingRow);
        if (
          existing.moduleId === record.moduleId &&
          existing.areaResRef === record.areaResRef &&
          existing.commandHash === record.commandHash &&
          existing.idempotencyKey === record.idempotencyKey &&
          existing.previewSha256 === record.previewSha256
        ) return;
        throw controlError(
          "AREA_DELETE_JOURNAL_CONFLICT",
          "Transaction ID is already bound to another Area Delete command.",
        );
      }
      const now = new Date();
      await transaction.query<ResultSetHeader>(
        `
          INSERT INTO area_lifecycle_mutation_transactions (
            transaction_id, operation, module_id, area_resref, actor_id,
            idempotency_key, command_hash, expected_module_revision,
            draft_revision, draft_normalized_sha256, lease_id, fencing_token,
            state, operation_metadata_json, candidate_manifest_json,
            diagnostics_json, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?, 'prepared', ?, ?, ?, ?, ?)
        `,
        [
          record.transactionId,
          OPERATION,
          record.moduleId,
          record.areaResRef,
          record.actorId,
          record.idempotencyKey,
          record.commandHash,
          record.expectedModuleRevision,
          record.leaseId,
          record.fencingToken,
          serializedMetadata,
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
    state: AreaDeleteJournalState,
    lease: AreaCreateModuleLease,
  ): Promise<void> {
    await this.database.withTransaction(async (transaction) => {
      await assertOwnedLease(transaction, lease);
      const row = (await selectJournal(transaction, transactionId))[0];
      if (!row) throw journalMissing();
      assertJournalLease(row, lease);
      if (row.state === state) return;
      if (!canTransitionAreaCreateJournal(row.state, state)) {
        throw controlError(
          "AREA_DELETE_JOURNAL_TRANSITION_INVALID",
          `Area Delete journal cannot transition from ${row.state} to ${state}.`,
        );
      }
      const result = await transaction.query<ResultSetHeader>(
        `
          UPDATE area_lifecycle_mutation_transactions
          SET state = ?, updated_at = UTC_TIMESTAMP(3)
          WHERE transaction_id = ? AND operation = 'area_delete'
            AND module_id = ? AND state = ? AND lease_id = ? AND fencing_token = ?
        `,
        [state, transactionId, lease.moduleId, row.state, lease.leaseId, lease.fencingToken],
      );
      assertAffected(result);
    });
  }

  async recordReadback(
    transactionId: string,
    lease: AreaCreateModuleLease,
    receipt: AreaDeleteReceipt,
  ): Promise<void> {
    await this.database.withTransaction(async (transaction) => {
      await assertOwnedLease(transaction, lease);
      const row = (await selectJournal(transaction, transactionId))[0];
      if (!row) throw journalMissing();
      assertJournalLease(row, lease);
      if (row.state === "readback_verified") {
        const existing = row.receipt_json
          ? parseJson<AreaDeleteReceipt>(row.receipt_json)
          : null;
        if (existing && sameJson(existing, receipt)) return;
        throw readbackConflict("Readback receipt differs from the retained receipt.");
      }
      if (row.state !== "ifo_committed") {
        throw controlError(
          "AREA_DELETE_JOURNAL_TRANSITION_INVALID",
          "Delete readback can be recorded only after module-head publication.",
        );
      }
      assertReceiptIdentity(row, receipt);
      const result = await transaction.query<ResultSetHeader>(
        `
          UPDATE area_lifecycle_mutation_transactions
          SET state = 'readback_verified', receipt_json = ?, updated_at = UTC_TIMESTAMP(3)
          WHERE transaction_id = ? AND operation = 'area_delete'
            AND module_id = ? AND state = 'ifo_committed'
            AND lease_id = ? AND fencing_token = ?
        `,
        [JSON.stringify(receipt), transactionId, lease.moduleId, lease.leaseId, lease.fencingToken],
      );
      assertAffected(result);
    });
  }

  async finalize(
    transactionId: string,
    lease: AreaCreateModuleLease,
    entry: AreaCreateIdempotencyEntry<AreaDeleteReceipt>,
  ): Promise<void> {
    await this.database.withTransaction(async (transaction) => {
      await assertOwnedLease(transaction, lease);
      const row = (await selectJournal(transaction, transactionId))[0];
      if (!row) throw journalMissing();
      assertJournalLease(row, lease);
      const retainedRow = (await selectIdempotency(
        transaction,
        entry.moduleId,
        entry.key,
      ))[0];
      const retained = retainedRow ? mapIdempotency(retainedRow) : null;
      if (row.state === "complete") {
        if (retained && sameIdempotency(retained, entry)) return;
        throw idempotencyConflict("Completed Delete differs from its retained result.");
      }
      if (row.state !== "readback_verified") {
        throw controlError(
          "AREA_DELETE_JOURNAL_TRANSITION_INVALID",
          "Only a readback-verified Area Delete can be finalized.",
        );
      }
      const durable = row.receipt_json
        ? parseJson<AreaDeleteReceipt>(row.receipt_json)
        : null;
      if (!durable || !sameJson(durable, entry.result)) {
        throw idempotencyConflict(
          "Finalization result differs from the durable Area Delete receipt.",
        );
      }
      if (
        entry.moduleId !== row.module_id ||
        entry.key !== row.idempotency_key ||
        entry.commandHash !== row.command_hash ||
        entry.result.transactionId !== row.transaction_id
      ) {
        throw idempotencyConflict("Finalization is outside the Area Delete scope.");
      }
      if (retained && !sameIdempotency(retained, entry)) {
        throw idempotencyConflict("Idempotency key is retained for another Delete result.");
      }
      if (!retained) {
        const createdAt = new Date(entry.createdAt);
        await transaction.query<ResultSetHeader>(
          `
            INSERT INTO area_lifecycle_mutation_idempotency (
              operation, module_id, idempotency_key, command_hash,
              transaction_id, result_json, created_at, expires_at
            ) VALUES ('area_delete', ?, ?, ?, ?, ?, ?, ?)
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
      const result = await transaction.query<ResultSetHeader>(
        `
          UPDATE area_lifecycle_mutation_transactions
          SET state = 'complete', updated_at = UTC_TIMESTAMP(3)
          WHERE transaction_id = ? AND operation = 'area_delete'
            AND module_id = ? AND state = 'readback_verified'
            AND lease_id = ? AND fencing_token = ?
        `,
        [transactionId, lease.moduleId, lease.leaseId, lease.fencingToken],
      );
      assertAffected(result);
    });
  }

  async readJournal(
    transactionId: string,
  ): Promise<AreaDeletePersistedJournalRecord | null> {
    const rows = await this.database.query<JournalRow[]>(
      `${journalSelectSql()} WHERE operation = 'area_delete' AND transaction_id = ? LIMIT 1`,
      [transactionId],
    );
    return rows[0] ? mapJournal(rows[0]) : null;
  }

  async listRecoverable(
    limit: number,
  ): Promise<readonly AreaDeletePersistedJournalRecord[]> {
    const normalizedLimit = Math.min(Math.max(Math.trunc(limit), 1), 1_000);
    const rows = await this.database.query<JournalRow[]>(
      `
        ${journalSelectSql("t")}
        LEFT JOIN area_create_module_locks l ON l.module_id = t.module_id
        WHERE t.operation = 'area_delete'
          AND t.state IN (
            'prepared', 'staged', 'resources_committed', 'ifo_committed',
            'readback_verified', 'compensation_pending'
          )
          AND (l.lease_id IS NULL OR l.lease_expires_at <= UTC_TIMESTAMP(3))
        ORDER BY t.created_at ASC, t.transaction_id ASC
        LIMIT ?
      `,
      [normalizedLimit],
    );
    return Object.freeze(rows.map(mapJournal));
  }
}

async function selectJournal(
  transaction: DatabaseTransaction,
  transactionId: string,
): Promise<JournalRow[]> {
  return transaction.query<JournalRow[]>(
    `${journalSelectSql()} WHERE operation = 'area_delete' AND transaction_id = ? LIMIT 1 FOR UPDATE`,
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
      SELECT operation, module_id, idempotency_key, command_hash,
             transaction_id, result_json, created_at
      FROM area_lifecycle_mutation_idempotency
      WHERE operation = 'area_delete' AND module_id = ? AND idempotency_key = ?
      LIMIT 1 FOR UPDATE
    `,
    [moduleId, key],
  );
}

async function assertOwnedLease(
  transaction: DatabaseTransaction,
  lease: AreaCreateModuleLease,
): Promise<void> {
  const rows = await transaction.query<LockRow[]>(
    `
      SELECT module_id, lease_id, owner_transaction_id, fencing_token, lease_expires_at
      FROM area_create_module_locks
      WHERE module_id = ?
      LIMIT 1
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
    !isFuture(row.lease_expires_at, new Date())
  ) {
    throw controlError(
      "AREA_DELETE_CONTROL_FENCED",
      "Area Delete module lease is missing, expired, or superseded.",
    );
  }
}

function assertJournalLease(row: JournalRow, lease: AreaCreateModuleLease): void {
  if (
    row.operation !== OPERATION ||
    row.module_id !== lease.moduleId ||
    row.lease_id !== lease.leaseId ||
    Number(row.fencing_token) !== lease.fencingToken ||
    row.transaction_id !== lease.ownerTransactionId
  ) {
    throw controlError(
      "AREA_DELETE_CONTROL_FENCED",
      "Area Delete journal is owned by another fencing lease.",
    );
  }
}

function assertReceiptIdentity(row: JournalRow, receipt: AreaDeleteReceipt): void {
  const metadata = parseJson<OperationMetadata>(row.operation_metadata_json);
  const manifest = parseJson<AreaDeleteCandidateManifest>(row.candidate_manifest_json);
  if (
    receipt.transactionId !== row.transaction_id ||
    receipt.moduleId !== row.module_id ||
    receipt.areaResRef !== row.area_resref ||
    receipt.commandHash !== row.command_hash ||
    receipt.previousModuleRevision !== row.expected_module_revision ||
    receipt.previewSha256 !== metadata.previewSha256 ||
    receipt.previewSha256 !== manifest.previewSha256 ||
    receipt.scanVersion !== "area-delete-impact-scan.v1" ||
    receipt.survivorCount !== manifest.survivorCount ||
    receipt.blockerCount !== 0 ||
    receipt.readbackStatus !== "verified"
  ) {
    throw readbackConflict(
      "Readback receipt is outside the durable Area Delete journal identity.",
    );
  }
}

function mapJournal(row: JournalRow): AreaDeletePersistedJournalRecord {
  if (row.operation !== OPERATION) {
    throw controlError("AREA_DELETE_JOURNAL_CONFLICT", "Journal operation is not Area Delete.");
  }
  const metadata = parseJson<OperationMetadata>(row.operation_metadata_json);
  return freezeClone({
    transactionId: row.transaction_id,
    moduleId: row.module_id,
    areaResRef: row.area_resref,
    actorId: row.actor_id,
    idempotencyKey: row.idempotency_key,
    commandHash: row.command_hash,
    expectedModuleRevision: row.expected_module_revision,
    previewSha256: metadata.previewSha256,
    leaseId: row.lease_id,
    fencingToken: Number(row.fencing_token),
    state: row.state,
    candidateManifest: parseJson<AreaDeleteCandidateManifest>(row.candidate_manifest_json),
    ...(row.receipt_json
      ? { receipt: parseJson<AreaDeleteReceipt>(row.receipt_json) }
      : {}),
    diagnostics: parseJson<readonly string[]>(row.diagnostics_json),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  });
}

function mapIdempotency(
  row: IdempotencyRow,
): AreaCreateIdempotencyEntry<AreaDeleteReceipt> {
  if (row.operation !== OPERATION) {
    throw idempotencyConflict("Retained idempotency result has another operation scope.");
  }
  return createAreaCreateIdempotencyEntry({
    moduleId: row.module_id,
    key: row.idempotency_key,
    commandHash: row.command_hash,
    createdAt: toIso(row.created_at),
    result: parseJson<AreaDeleteReceipt>(row.result_json),
  });
}

function journalSelectSql(alias?: string): string {
  const prefix = alias ? `${alias}.` : "";
  return `
    SELECT
      ${prefix}transaction_id, ${prefix}operation, ${prefix}module_id,
      ${prefix}area_resref, ${prefix}actor_id, ${prefix}idempotency_key,
      ${prefix}command_hash, ${prefix}expected_module_revision,
      ${prefix}draft_revision, ${prefix}draft_normalized_sha256,
      ${prefix}lease_id, ${prefix}fencing_token, ${prefix}state,
      ${prefix}operation_metadata_json, ${prefix}candidate_manifest_json,
      ${prefix}receipt_json, ${prefix}diagnostics_json,
      ${prefix}created_at, ${prefix}updated_at
    FROM area_lifecycle_mutation_transactions${alias ? ` ${alias}` : ""}
  `;
}

function leaseFromRecord(record: AreaDeleteJournalRecord): AreaCreateModuleLease {
  return {
    moduleId: record.moduleId,
    leaseId: record.leaseId,
    ownerTransactionId: record.transactionId,
    fencingToken: record.fencingToken,
    expiresAt: record.createdAt,
  };
}

function sameIdempotency(
  left: AreaCreateIdempotencyEntry<AreaDeleteReceipt>,
  right: AreaCreateIdempotencyEntry<AreaDeleteReceipt>,
): boolean {
  return left.moduleId === right.moduleId &&
    left.key === right.key &&
    left.commandHash === right.commandHash &&
    left.createdAt === right.createdAt &&
    sameJson(left.result, right.result);
}

function isFuture(value: Date | string | null, now: Date): boolean {
  return value !== null && new Date(toIso(value)).getTime() > now.getTime();
}

function assertAffected(result: ResultSetHeader): void {
  if (Number(result.affectedRows) !== 1) {
    throw controlError(
      "AREA_DELETE_CONTROL_FENCED",
      "Area Delete fenced compare-and-set did not update exactly one row.",
    );
  }
}

function parseJson<T>(value: string | T): T {
  return (typeof value === "string" ? JSON.parse(value) : value) as T;
}

function toSqlDate(value: Date): string {
  return value.toISOString().slice(0, 23).replace("T", " ");
}

function toIso(value: Date | string): string {
  if (value instanceof Date) return value.toISOString();
  const normalized = value.includes("T") ? value : `${value.replace(" ", "T")}Z`;
  return new Date(normalized).toISOString();
}

function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function journalMissing(): Error {
  return controlError("AREA_DELETE_JOURNAL_MISSING", "Area Delete journal is missing.");
}

function readbackConflict(message: string): Error {
  return controlError("AREA_DELETE_READBACK_CONFLICT", message);
}

function idempotencyConflict(message: string): Error {
  return controlError("AREA_DELETE_IDEMPOTENCY_CONFLICT", message);
}

function controlError(code: string, message: string): Error {
  return new Error(`${code}: ${message}`);
}

function freezeClone<T>(value: T): T {
  return deepFreeze(structuredClone(value));
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  return Object.freeze(value);
}
