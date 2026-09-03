import { Injectable } from "@nestjs/common";
import type { ResultSetHeader } from "mysql2";
import { DatabaseService, type DatabaseTransaction } from "../../../../../database/database.service";
import type { AreaDraftRepositoryPort } from "../../../application/ports/area-draft.repository.port";
import { AreaDraftRepositoryError } from "../../../application/ports/area-draft.repository.port";
import type { AreaDraftDeleteResult, AreaDraftDocument, AreaDraftList, AreaDraftSaveResult, AreaDraftSnapshot, AreaDraftSource, DeletedAreaDraft } from "../../../domain/area-draft.types";
import { decodeAreaDraftCursor, encodeAreaDraftCursor, hashAreaDraftDocument } from "../../../domain/area-draft.validation";

interface DraftRow {
  actor_id: string;
  draft_id: string;
  title: string;
  revision: number | string;
  updated_at: Date | string;
  normalized_sha256: string;
  source_json: string | AreaDraftSource;
  document_json: string | AreaDraftDocument;
}

interface IdempotencyRow {
  actor_id: string;
  draft_id: string;
  idempotency_key: string;
  operation: "save" | "delete";
  command_hash: string;
  result_json: string | AreaDraftSaveResult | AreaDraftDeleteResult;
  created_at: Date | string;
}

@Injectable()
export class MySqlAreaDraftRepository implements AreaDraftRepositoryPort {
  constructor(private readonly database: DatabaseService) {}

  async list(input: Readonly<{ actorId: string; pageSize: number; cursor?: string }>): Promise<AreaDraftList> {
    const cursor = input.cursor ? decodeAreaDraftCursor(input.cursor) : null;
    const params: unknown[] = [input.actorId];
    let cursorClause = "";
    if (cursor) {
      cursorClause = "AND (updated_at < ? OR (updated_at = ? AND draft_id > ?))";
      const time = toSqlDate(new Date(cursor.updatedAt));
      params.push(time, time, cursor.draftId);
    }
    params.push(input.pageSize + 1);
    const rows = await this.database.query<DraftRow[]>(`
      SELECT actor_id, draft_id, title, revision, updated_at,
             normalized_sha256, source_json, document_json
      FROM area_drafts
      WHERE actor_id = ? ${cursorClause}
      ORDER BY updated_at DESC, draft_id ASC
      LIMIT ?
    `, params);
    const hasMore = rows.length > input.pageSize;
    const page = rows.slice(0, input.pageSize).map(mapDraftRow);
    return freezeClone({
      items: page.map((snapshot) => ({ draftId: snapshot.draftId, title: snapshot.title, revision: snapshot.revision, updatedAt: snapshot.updatedAt, source: snapshot.source })),
      nextCursor: hasMore && page.length > 0 ? encodeAreaDraftCursor(page[page.length - 1]) : null,
    });
  }

  async read(input: Readonly<{ actorId: string; draftId: string; revision: number }>): Promise<AreaDraftSnapshot> {
    const rows = await this.database.query<DraftRow[]>(`${draftSelect()} WHERE actor_id = ? AND draft_id = ? LIMIT 1`, [input.actorId, input.draftId]);
    if (!rows[0]) throw notFound();
    const snapshot = mapDraftRow(rows[0]);
    if (snapshot.revision !== input.revision) throw revisionConflict(input.revision, snapshot.revision);
    return freezeClone(snapshot);
  }

  async findRetainedSaveResult(input: Readonly<{ actorId: string; draftId: string; idempotencyKey: string; commandHash: string }>): Promise<AreaDraftSaveResult | null> {
    const rows = await this.database.query<IdempotencyRow[]>(`
      SELECT actor_id, draft_id, idempotency_key, operation, command_hash,
             result_json, created_at
      FROM area_draft_idempotency
      WHERE actor_id = ? AND draft_id = ? AND idempotency_key = ?
      LIMIT 1
    `, [input.actorId, input.draftId, input.idempotencyKey]);
    return rows[0] ? replaySave(rows[0], input.commandHash) : null;
  }

  async save(input: Readonly<{ actorId: string; draftId: string; expectedRevision: number; idempotencyKey: string; commandHash: string; document: AreaDraftDocument }>): Promise<AreaDraftSaveResult> {
    return this.database.withTransaction(async (transaction) => {
      const retained = await selectIdempotency(transaction, input.actorId, input.draftId, input.idempotencyKey);
      if (retained) return replaySave(retained, input.commandHash);
      const currentRow = await selectDraft(transaction, input.actorId, input.draftId);
      const current = currentRow ? mapDraftRow(currentRow) : null;
      if (!current && input.expectedRevision !== 0) throw notFound();
      if (current && current.revision !== input.expectedRevision) throw revisionConflict(input.expectedRevision, current.revision);
      const revision = (current?.revision ?? 0) + 1;
      const updatedAt = new Date().toISOString();
      const snapshot = freezeClone({ draftId: input.draftId, title: input.document.title, revision, updatedAt, normalizedSha256: hashAreaDraftDocument(input.document), source: input.document.source, draft: input.document });
      if (!current) {
        await transaction.query<ResultSetHeader>(`
          INSERT INTO area_drafts (
            actor_id, draft_id, title, revision, updated_at,
            normalized_sha256, source_json, document_json
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [input.actorId, input.draftId, snapshot.title, revision, toSqlDate(new Date(updatedAt)), snapshot.normalizedSha256, JSON.stringify(snapshot.source), JSON.stringify(snapshot.draft)]);
      } else {
        const updated = await transaction.query<ResultSetHeader>(`
          UPDATE area_drafts
          SET title = ?, revision = ?, updated_at = ?, normalized_sha256 = ?,
              source_json = ?, document_json = ?
          WHERE actor_id = ? AND draft_id = ? AND revision = ?
        `, [snapshot.title, revision, toSqlDate(new Date(updatedAt)), snapshot.normalizedSha256, JSON.stringify(snapshot.source), JSON.stringify(snapshot.draft), input.actorId, input.draftId, input.expectedRevision]);
        assertAffected(updated);
      }
      const result = freezeClone<AreaDraftSaveResult>({ idempotency: "created", snapshot });
      await retainIdempotency(transaction, input, "save", result, updatedAt);
      return result;
    });
  }

  async delete(input: Readonly<{ actorId: string; draftId: string; expectedRevision: number; idempotencyKey: string; commandHash: string }>): Promise<AreaDraftDeleteResult> {
    return this.database.withTransaction(async (transaction) => {
      const retained = await selectIdempotency(transaction, input.actorId, input.draftId, input.idempotencyKey);
      if (retained) return replayDelete(retained, input.commandHash);
      const row = await selectDraft(transaction, input.actorId, input.draftId);
      if (!row) throw notFound();
      const snapshot = mapDraftRow(row);
      if (snapshot.revision !== input.expectedRevision) throw revisionConflict(input.expectedRevision, snapshot.revision);
      const deleted = await transaction.query<ResultSetHeader>("DELETE FROM area_drafts WHERE actor_id = ? AND draft_id = ? AND revision = ?", [input.actorId, input.draftId, input.expectedRevision]);
      assertAffected(deleted);
      const deletedResult: DeletedAreaDraft = Object.freeze({ draftId: input.draftId, deletedRevision: snapshot.revision, deleted: true });
      const result = freezeClone<AreaDraftDeleteResult>({ idempotency: "created", result: deletedResult });
      await retainIdempotency(transaction, input, "delete", result, new Date().toISOString());
      return result;
    });
  }
}

async function selectDraft(transaction: DatabaseTransaction, actorId: string, draftId: string): Promise<DraftRow | null> {
  const rows = await transaction.query<DraftRow[]>(`${draftSelect()} WHERE actor_id = ? AND draft_id = ? LIMIT 1 FOR UPDATE`, [actorId, draftId]);
  return rows[0] ?? null;
}
async function selectIdempotency(transaction: DatabaseTransaction, actorId: string, draftId: string, key: string): Promise<IdempotencyRow | null> {
  const rows = await transaction.query<IdempotencyRow[]>(`
    SELECT actor_id, draft_id, idempotency_key, operation, command_hash,
           result_json, created_at
    FROM area_draft_idempotency
    WHERE actor_id = ? AND draft_id = ? AND idempotency_key = ?
    LIMIT 1 FOR UPDATE
  `, [actorId, draftId, key]);
  return rows[0] ?? null;
}
async function retainIdempotency(transaction: DatabaseTransaction, input: { actorId: string; draftId: string; idempotencyKey: string; commandHash: string }, operation: "save" | "delete", result: AreaDraftSaveResult | AreaDraftDeleteResult, createdAt: string): Promise<void> {
  await transaction.query<ResultSetHeader>(`
    INSERT INTO area_draft_idempotency (
      actor_id, draft_id, idempotency_key, operation, command_hash,
      result_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [input.actorId, input.draftId, input.idempotencyKey, operation, input.commandHash, JSON.stringify(result), toSqlDate(new Date(createdAt))]);
}
function replaySave(row: IdempotencyRow, commandHash: string): AreaDraftSaveResult {
  if (row.operation !== "save" || row.command_hash !== commandHash) throw idempotencyConflict();
  const result = parseJson<AreaDraftSaveResult>(row.result_json);
  return freezeClone({ ...result, idempotency: "replayed" });
}
function replayDelete(row: IdempotencyRow, commandHash: string): AreaDraftDeleteResult {
  if (row.operation !== "delete" || row.command_hash !== commandHash) throw idempotencyConflict();
  const result = parseJson<AreaDraftDeleteResult>(row.result_json);
  return freezeClone({ ...result, idempotency: "replayed" });
}
function mapDraftRow(row: DraftRow): AreaDraftSnapshot {
  return freezeClone({ draftId: row.draft_id, title: row.title, revision: Number(row.revision), updatedAt: toIso(row.updated_at), normalizedSha256: row.normalized_sha256, source: parseJson<AreaDraftSource>(row.source_json), draft: parseJson<AreaDraftDocument>(row.document_json) });
}
function draftSelect(): string { return "SELECT actor_id, draft_id, title, revision, updated_at, normalized_sha256, source_json, document_json FROM area_drafts"; }
function parseJson<T>(value: unknown): T { return (typeof value === "string" ? JSON.parse(value) : value) as T; }
function toSqlDate(value: Date): string { return value.toISOString().slice(0, 23).replace("T", " "); }
function toIso(value: Date | string): string { if (value instanceof Date) return value.toISOString(); const normalized = /(?:Z|[+-]\d\d:\d\d)$/u.test(value) ? value : `${value.replace(" ", "T")}Z`; return new Date(normalized).toISOString(); }
function assertAffected(result: ResultSetHeader): void { if (result.affectedRows !== 1) throw new AreaDraftRepositoryError("AREA_DRAFT_STORAGE_UNAVAILABLE", "Area draft compare-and-set did not affect one row."); }
function notFound(): AreaDraftRepositoryError { return new AreaDraftRepositoryError("AREA_DRAFT_NOT_FOUND", "Area draft was not found."); }
function revisionConflict(expected: number, actual: number): AreaDraftRepositoryError { return new AreaDraftRepositoryError("AREA_DRAFT_REVISION_CONFLICT", "Area draft revision precondition failed.", expected, actual); }
function idempotencyConflict(): AreaDraftRepositoryError { return new AreaDraftRepositoryError("AREA_DRAFT_IDEMPOTENCY_CONFLICT", "Idempotency key is bound to another command."); }
function freezeClone<T>(value: T): T { return deepFreeze(structuredClone(value)); }
function deepFreeze<T>(value: T): T { if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value; for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child); return Object.freeze(value); }
