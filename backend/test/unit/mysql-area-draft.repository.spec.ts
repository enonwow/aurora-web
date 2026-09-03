import { MySqlAreaDraftRepository } from "../../src/modules/areas/adapters/outbound/mysql/mysql-area-draft.repository";
import type { DatabaseService, DatabaseTransaction } from "../../src/database/database.service";
import type { AreaDraftDocument } from "../../src/modules/areas/domain/area-draft.types";

describe("MySqlAreaDraftRepository", () => {
  const document: AreaDraftDocument = { schemaVersion: "area-draft.v1", title: "Draft", source: { type: "new" }, payload: { preserved: true } };

  it("atomically creates a revision and retains the idempotency result", async () => {
    const statements: string[] = [];
    const transaction = tx(async (sql) => {
      statements.push(sql);
      if (sql.includes("FROM area_draft_idempotency")) return [];
      if (sql.includes("FROM area_drafts")) return [];
      return { affectedRows: 1 };
    });
    const repository = new MySqlAreaDraftRepository(database(transaction));
    const result = await repository.save({ actorId: "actor-a", draftId: "draft_01", expectedRevision: 0, idempotencyKey: "idem-save-01", commandHash: "a".repeat(64), document });
    expect(result).toMatchObject({ idempotency: "created", snapshot: { revision: 1, draftId: "draft_01" } });
    expect(statements.some((sql) => sql.includes("INSERT INTO area_drafts"))).toBe(true);
    expect(statements.some((sql) => sql.includes("INSERT INTO area_draft_idempotency"))).toBe(true);
  });

  it("returns a retained replay before reading a deleted/current draft", async () => {
    const retained = { idempotency: "created", result: { draftId: "draft_01", deletedRevision: 3, deleted: true } };
    const transaction = tx(async (sql) => {
      if (sql.includes("FROM area_draft_idempotency")) return [{ actor_id: "actor-a", draft_id: "draft_01", idempotency_key: "idem-delete-01", operation: "delete", command_hash: "b".repeat(64), result_json: JSON.stringify(retained), created_at: "2026-08-07 10:00:00.000" }];
      throw new Error("draft row must not be read on replay");
    });
    const result = await new MySqlAreaDraftRepository(database(transaction)).delete({ actorId: "actor-a", draftId: "draft_01", expectedRevision: 3, idempotencyKey: "idem-delete-01", commandHash: "b".repeat(64) });
    expect(result).toEqual({ ...retained, idempotency: "replayed" });
  });

  it("rejects stale CAS and idempotency rebinding", async () => {
    const staleTx = tx(async (sql) => {
      if (sql.includes("FROM area_draft_idempotency")) return [];
      if (sql.includes("FROM area_drafts")) return [row(2)];
      return { affectedRows: 1 };
    });
    await expect(new MySqlAreaDraftRepository(database(staleTx)).save({ actorId: "actor-a", draftId: "draft_01", expectedRevision: 1, idempotencyKey: "idem-stale-01", commandHash: "c".repeat(64), document })).rejects.toMatchObject({ code: "AREA_DRAFT_REVISION_CONFLICT", expectedRevision: 1, actualRevision: 2 });

    const conflictTx = tx(async (sql) => sql.includes("FROM area_draft_idempotency") ? [{ actor_id: "actor-a", draft_id: "draft_01", idempotency_key: "idem-conflict", operation: "save", command_hash: "d".repeat(64), result_json: JSON.stringify({ idempotency: "created", snapshot: snapshot(1) }), created_at: "2026-08-07 10:00:00.000" }] : []);
    await expect(new MySqlAreaDraftRepository(database(conflictTx)).save({ actorId: "actor-a", draftId: "draft_01", expectedRevision: 1, idempotencyKey: "idem-conflict", commandHash: "e".repeat(64), document })).rejects.toMatchObject({ code: "AREA_DRAFT_IDEMPOTENCY_CONFLICT" });
  });

  it("lists only the actor scope with one extra row for cursor generation", async () => {
    const query = jest.fn(async () => [row(3, "draft_c"), row(2, "draft_b"), row(1, "draft_a")]);
    const repository = new MySqlAreaDraftRepository({ query } as unknown as DatabaseService);
    const result = await repository.list({ actorId: "actor-a", pageSize: 2 });
    expect(query).toHaveBeenCalledWith(expect.stringContaining("WHERE actor_id = ?"), ["actor-a", 3]);
    expect(result.items.map((item) => item.draftId)).toEqual(["draft_c", "draft_b"]);
    expect(result.nextCursor).toEqual(expect.any(String));
  });
});

function database(transaction: DatabaseTransaction): DatabaseService { return { withTransaction: async (operation: (tx: DatabaseTransaction) => Promise<unknown>) => operation(transaction) } as unknown as DatabaseService; }
function tx(query: (statement: string, params?: unknown[]) => Promise<unknown>): DatabaseTransaction { return { query } as DatabaseTransaction; }
function snapshot(revision: number) { return { draftId: "draft_01", title: "Draft", revision, updatedAt: "2026-08-07T10:00:00.000Z", normalizedSha256: "f".repeat(64), source: { type: "new" }, draft: documentValue() }; }
function row(revision: number, draftId = "draft_01") { return { actor_id: "actor-a", draft_id: draftId, title: draftId, revision, updated_at: `2026-08-07 10:00:0${revision}.000`, normalized_sha256: "f".repeat(64), source_json: JSON.stringify({ type: "new" }), document_json: JSON.stringify(documentValue()) }; }
function documentValue() { return { schemaVersion: "area-draft.v1", title: "Draft", source: { type: "new" }, payload: { preserved: true } }; }
