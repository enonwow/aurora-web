import { Injectable } from "@nestjs/common";
import type { ResultSetHeader } from "mysql2";
import {
  DatabaseService,
  type DatabaseTransaction,
} from "../../../../../database/database.service";
import type { AreaCreateIdempotencyEntry } from "../../../domain/area-create-idempotency";
import { createAreaCreateIdempotencyEntry } from "../../../domain/area-create-idempotency";
import { canTransitionAreaCreateJournal } from "../../../domain/area-create-journal-policy";
import {
  createAreaEventScriptPublicationCandidateManifest,
  type AreaEventScriptPublicationCandidateManifest,
  type AreaEventScriptPublicationJournalRecord,
  type AreaEventScriptPublicationPersistedJournalRecord,
  type AreaEventScriptPublicationReceipt,
} from "../../../domain/area-event-script-publication.types";
import type {
  AreaEventScriptPublicationIdempotencyPort,
  AreaEventScriptPublicationJournalPort,
} from "../../../application/ports/area-event-script-publication.port";
import type { AreaCreateModuleLease } from "../../../application/ports/area-create-transaction.port";
import type { AreaCreateJournalState } from "../../../domain/area-create-transaction.types";

const OPERATION = "area_script_publish" as const;
const IDEMPOTENCY_RETENTION_MS = 24 * 60 * 60 * 1_000;
const MAX_MANIFEST_BYTES = 1_048_576;
const MAX_RECEIPT_BYTES = 262_144;

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
  state: AreaCreateJournalState;
  operation_metadata_json: string | Record<string, never>;
  candidate_manifest_json: string | AreaEventScriptPublicationCandidateManifest;
  receipt_json: string | AreaEventScriptPublicationReceipt | null;
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
  result_json: string | AreaEventScriptPublicationReceipt;
  created_at: Date | string;
}

@Injectable()
export class MySqlAreaEventScriptPublicationControlStore
  implements
    AreaEventScriptPublicationIdempotencyPort,
    AreaEventScriptPublicationJournalPort
{
  constructor(private readonly database: DatabaseService) {}

  async read(
    moduleId: string,
    key: string,
  ): Promise<AreaCreateIdempotencyEntry<AreaEventScriptPublicationReceipt> | null> {
    const rows = await this.database.query<IdempotencyRow[]>(
      `
        SELECT operation, module_id, idempotency_key, command_hash,
               transaction_id, result_json, created_at
        FROM area_lifecycle_mutation_idempotency
        WHERE operation = 'area_script_publish' AND module_id = ? AND idempotency_key = ?
        LIMIT 1
      `,
      [moduleId, key],
    );
    return rows[0] ? mapIdempotency(rows[0]) : null;
  }

  async begin(record: AreaEventScriptPublicationJournalRecord): Promise<void> {
    const manifest = createAreaEventScriptPublicationCandidateManifest(record.candidate);
    const serializedManifest = JSON.stringify(manifest);
    if (Buffer.byteLength(serializedManifest, "utf8") > MAX_MANIFEST_BYTES) {
      throw controlError(
        "AREA_EVENT_SCRIPT_JOURNAL_TOO_LARGE",
        "Script publication journal manifest exceeds its durable budget.",
      );
    }
    await this.database.withTransaction(async (transaction) => {
      const lease = leaseFromRecord(record);
      await assertOwnedLease(transaction, lease);
      if (record.transactionId !== lease.ownerTransactionId) {
        throw controlError(
          "AREA_EVENT_SCRIPT_CONTROL_FENCED",
          "Script publication transaction does not own the module lease.",
        );
      }
      const existingRow = (await selectJournal(transaction, record.transactionId))[0];
      if (existingRow) {
        const existing = mapJournal(existingRow);
        if (
          existing.moduleId === record.moduleId &&
          existing.targetResRef === record.targetResRef &&
          existing.commandHash === record.commandHash &&
          existing.idempotencyKey === record.idempotencyKey
        ) return;
        throw controlError(
          "AREA_EVENT_SCRIPT_JOURNAL_CONFLICT",
          "Transaction ID is already bound to another lifecycle mutation.",
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
          record.targetResRef,
          record.actorId,
          record.idempotencyKey,
          record.commandHash,
          record.expectedModuleRevision,
          record.leaseId,
          record.fencingToken,
          JSON.stringify({}),
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
      const row = (await selectJournal(transaction, transactionId))[0];
      if (!row) throw journalMissing();
      assertJournalLease(row, lease);
      if (row.state === state) return;
      if (!canTransitionAreaCreateJournal(row.state, state)) {
        throw controlError(
          "AREA_EVENT_SCRIPT_JOURNAL_TRANSITION_INVALID",
          `Script publication journal cannot transition from ${row.state} to ${state}.`,
        );
      }
      const result = await transaction.query<ResultSetHeader>(
        `
          UPDATE area_lifecycle_mutation_transactions
          SET state = ?, updated_at = UTC_TIMESTAMP(3)
          WHERE transaction_id = ? AND operation = 'area_script_publish'
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
    receipt: AreaEventScriptPublicationReceipt,
  ): Promise<void> {
    const serialized = JSON.stringify(receipt);
    if (Buffer.byteLength(serialized, "utf8") > MAX_RECEIPT_BYTES) {
      throw controlError(
        "AREA_EVENT_SCRIPT_JOURNAL_TOO_LARGE",
        "Script publication receipt exceeds its durable budget.",
      );
    }
    await this.database.withTransaction(async (transaction) => {
      await assertOwnedLease(transaction, lease);
      const row = (await selectJournal(transaction, transactionId))[0];
      if (!row) throw journalMissing();
      assertJournalLease(row, lease);
      if (row.state === "readback_verified") {
        const existing = row.receipt_json
          ? parseJson<AreaEventScriptPublicationReceipt>(row.receipt_json)
          : null;
        if (existing && sameJson(existing, receipt)) return;
        throw readbackConflict("Readback receipt differs from the retained receipt.");
      }
      if (row.state !== "ifo_committed") {
        throw controlError(
          "AREA_EVENT_SCRIPT_JOURNAL_TRANSITION_INVALID",
          "Readback can be recorded only after module-head publication.",
        );
      }
      assertReceiptIdentity(row, receipt);
      const result = await transaction.query<ResultSetHeader>(
        `
          UPDATE area_lifecycle_mutation_transactions
          SET state = 'readback_verified', receipt_json = ?, updated_at = UTC_TIMESTAMP(3)
          WHERE transaction_id = ? AND operation = 'area_script_publish'
            AND module_id = ? AND state = 'ifo_committed'
            AND lease_id = ? AND fencing_token = ?
        `,
        [serialized, transactionId, lease.moduleId, lease.leaseId, lease.fencingToken],
      );
      assertAffected(result);
    });
  }

  async finalize(
    transactionId: string,
    lease: AreaCreateModuleLease,
    entry: AreaCreateIdempotencyEntry<AreaEventScriptPublicationReceipt>,
  ): Promise<void> {
    await this.database.withTransaction(async (transaction) => {
      await assertOwnedLease(transaction, lease);
      const row = (await selectJournal(transaction, transactionId))[0];
      if (!row) throw journalMissing();
      assertJournalLease(row, lease);
      const existingRow = (await selectIdempotency(
        transaction,
        entry.moduleId,
        entry.key,
      ))[0];
      const existing = existingRow ? mapIdempotency(existingRow) : null;
      if (row.state === "complete") {
        if (existing && sameIdempotency(existing, entry)) return;
        throw idempotencyConflict("Completed journal differs from retained result.");
      }
      if (row.state !== "readback_verified") {
        throw controlError(
          "AREA_EVENT_SCRIPT_JOURNAL_TRANSITION_INVALID",
          "Only a readback-verified script publication can be finalized.",
        );
      }
      const durable = row.receipt_json
        ? parseJson<AreaEventScriptPublicationReceipt>(row.receipt_json)
        : null;
      if (!durable || !sameJson(durable, entry.result)) {
        throw idempotencyConflict("Finalization differs from the durable receipt.");
      }
      if (
        entry.moduleId !== row.module_id ||
        entry.key !== row.idempotency_key ||
        entry.commandHash !== row.command_hash ||
        entry.result.transactionId !== row.transaction_id
      ) {
        throw idempotencyConflict("Finalization is outside the journal scope.");
      }
      if (existing && !sameIdempotency(existing, entry)) {
        throw idempotencyConflict("Idempotency key is retained for another publication.");
      }
      if (!existing) {
        const createdAt = new Date(entry.createdAt);
        await transaction.query<ResultSetHeader>(
          `
            INSERT INTO area_lifecycle_mutation_idempotency (
              operation, module_id, idempotency_key, command_hash,
              transaction_id, result_json, created_at, expires_at
            ) VALUES ('area_script_publish', ?, ?, ?, ?, ?, ?, ?)
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
          WHERE transaction_id = ? AND operation = 'area_script_publish'
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
  ): Promise<AreaEventScriptPublicationPersistedJournalRecord | null> {
    const rows = await this.database.query<JournalRow[]>(
      `${journalSelectSql()} WHERE operation = 'area_script_publish' AND transaction_id = ? LIMIT 1`,
      [transactionId],
    );
    return rows[0] ? mapJournal(rows[0]) : null;
  }

  async listRecoverable(
    limit: number,
  ): Promise<readonly AreaEventScriptPublicationPersistedJournalRecord[]> {
    const normalizedLimit = Math.min(Math.max(Math.trunc(limit), 1), 1_000);
    const rows = await this.database.query<JournalRow[]>(
      `
        ${journalSelectSql("t")}
        LEFT JOIN area_create_module_locks l ON l.module_id = t.module_id
        WHERE t.operation = 'area_script_publish'
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
    `${journalSelectSql()} WHERE operation = 'area_script_publish' AND transaction_id = ? LIMIT 1 FOR UPDATE`,
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
      WHERE operation = 'area_script_publish' AND module_id = ? AND idempotency_key = ?
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
      SELECT module_id, lease_id, owner_transaction_id, fencing_token,
             lease_expires_at
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
      "AREA_EVENT_SCRIPT_CONTROL_FENCED",
      "Script publication module lease is missing, expired, or superseded.",
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
      "AREA_EVENT_SCRIPT_CONTROL_FENCED",
      "Script publication journal is owned by another fencing lease.",
    );
  }
}

function assertReceiptIdentity(
  row: JournalRow,
  receipt: AreaEventScriptPublicationReceipt,
): void {
  const manifest = parseJson<AreaEventScriptPublicationCandidateManifest>(
    row.candidate_manifest_json,
  );
  if (
    receipt.transactionId !== row.transaction_id ||
    receipt.moduleId !== row.module_id ||
    receipt.targetResRef !== row.area_resref ||
    receipt.commandHash !== row.command_hash ||
    receipt.previousModuleRevision !== row.expected_module_revision ||
    receipt.sourceSha256 !== manifest.sourceSha256 ||
    receipt.includeSetSha256 !== manifest.includeSetSha256 ||
    receipt.executionProfileSha256 !== manifest.executionProfileSha256 ||
    receipt.compilerReceiptSha256 !== manifest.compilerReceiptSha256 ||
    !sameJson(receipt.provider, manifest.provider) ||
    !sameJson(receipt.resources, manifest.resources) ||
    receipt.readbackStatus !== "verified"
  ) {
    throw readbackConflict(
      "Readback receipt is outside the durable script publication identity.",
    );
  }
}

function mapJournal(row: JournalRow): AreaEventScriptPublicationPersistedJournalRecord {
  if (row.operation !== OPERATION) {
    throw controlError(
      "AREA_EVENT_SCRIPT_JOURNAL_CONFLICT",
      "Journal operation is not script publication.",
    );
  }
  return freezeClone({
    transactionId: row.transaction_id,
    moduleId: row.module_id,
    targetResRef: row.area_resref,
    actorId: row.actor_id,
    idempotencyKey: row.idempotency_key,
    commandHash: row.command_hash,
    expectedModuleRevision: row.expected_module_revision,
    leaseId: row.lease_id,
    fencingToken: Number(row.fencing_token),
    state: row.state,
    candidateManifest: parseJson<AreaEventScriptPublicationCandidateManifest>(
      row.candidate_manifest_json,
    ),
    ...(row.receipt_json === null
      ? {}
      : { receipt: parseJson<AreaEventScriptPublicationReceipt>(row.receipt_json) }),
    diagnostics: parseJson<readonly string[]>(row.diagnostics_json),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  });
}

function mapIdempotency(
  row: IdempotencyRow,
): AreaCreateIdempotencyEntry<AreaEventScriptPublicationReceipt> {
  if (row.operation !== OPERATION) {
    throw idempotencyConflict("Retained idempotency has another operation scope.");
  }
  return createAreaCreateIdempotencyEntry({
    moduleId: row.module_id,
    key: row.idempotency_key,
    commandHash: row.command_hash,
    createdAt: toIso(row.created_at),
    result: parseJson<AreaEventScriptPublicationReceipt>(row.result_json),
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

function leaseFromRecord(
  record: AreaEventScriptPublicationJournalRecord,
): AreaCreateModuleLease {
  return {
    moduleId: record.moduleId,
    leaseId: record.leaseId,
    ownerTransactionId: record.transactionId,
    fencingToken: record.fencingToken,
    expiresAt: record.createdAt,
  };
}

function sameIdempotency(
  left: AreaCreateIdempotencyEntry<AreaEventScriptPublicationReceipt>,
  right: AreaCreateIdempotencyEntry<AreaEventScriptPublicationReceipt>,
): boolean {
  return left.moduleId === right.moduleId &&
    left.key === right.key &&
    left.commandHash === right.commandHash &&
    left.createdAt === right.createdAt &&
    sameJson(left.result, right.result);
}

function parseJson<T>(value: string | T): T {
  return (typeof value === "string" ? JSON.parse(value) : value) as T;
}

function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function assertAffected(result: ResultSetHeader): void {
  if (result.affectedRows !== 1) {
    throw controlError(
      "AREA_EVENT_SCRIPT_CONTROL_FENCED",
      "Script publication control-store compare-and-set failed.",
    );
  }
}

function journalMissing(): Error {
  return controlError("AREA_EVENT_SCRIPT_JOURNAL_MISSING", "Journal does not exist.");
}

function readbackConflict(message: string): Error {
  return controlError("AREA_EVENT_SCRIPT_READBACK_CONFLICT", message);
}

function idempotencyConflict(message: string): Error {
  return controlError("AREA_EVENT_SCRIPT_IDEMPOTENCY_CONFLICT", message);
}

function controlError(code: string, message: string): Error {
  return new Error(`${code}: ${message}`);
}

function isFuture(value: Date | string | null, now: Date): boolean {
  return value !== null && new Date(toIso(value)).getTime() > now.getTime();
}

function toSqlDate(value: Date): string {
  return value.toISOString().slice(0, 23).replace("T", " ");
}

function toIso(value: Date | string): string {
  if (value instanceof Date) return value.toISOString();
  const normalized = /(?:Z|[+-]\d\d:\d\d)$/u.test(value)
    ? value
    : `${value.replace(" ", "T")}Z`;
  return new Date(normalized).toISOString();
}

function freezeClone<T>(value: T): T {
  return deepFreeze(structuredClone(value));
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  return Object.freeze(value);
}
