import { MemoryAreaDraftRepository } from "../../src/modules/areas/adapters/outbound/memory/memory-area-draft.repository";
import type { AreaDraftDocument } from "../../src/modules/areas/domain/area-draft.types";

describe("Memory Area draft repository", () => {
  const document = (title: string): AreaDraftDocument => ({
    schemaVersion: "area-draft.v1",
    title,
    source: { type: "new" },
    payload: { title, unknownNativeFields: { retained: true } },
  });

  it("creates, CAS-updates, and replays without advancing the revision", async () => {
    const repository = new MemoryAreaDraftRepository(clock());
    const created = await repository.save({ actorId: "actor-a", draftId: "draft_01", expectedRevision: 0, idempotencyKey: "idem-create-01", commandHash: "a".repeat(64), document: document("One") });
    expect(created.idempotency).toBe("created");
    expect(created.snapshot.revision).toBe(1);
    const replay = await repository.save({ actorId: "actor-a", draftId: "draft_01", expectedRevision: 0, idempotencyKey: "idem-create-01", commandHash: "a".repeat(64), document: document("One") });
    expect(replay).toEqual({ ...created, idempotency: "replayed" });
    const updated = await repository.save({ actorId: "actor-a", draftId: "draft_01", expectedRevision: 1, idempotencyKey: "idem-update-01", commandHash: "b".repeat(64), document: document("Two") });
    expect(updated.snapshot).toMatchObject({ revision: 2, title: "Two" });
    await expect(repository.save({ actorId: "actor-a", draftId: "draft_01", expectedRevision: 1, idempotencyKey: "idem-stale-01", commandHash: "c".repeat(64), document: document("Stale") })).rejects.toMatchObject({ code: "AREA_DRAFT_REVISION_CONFLICT", expectedRevision: 1, actualRevision: 2 });
  });

  it("scopes all reads and mutations to the owner", async () => {
    const repository = new MemoryAreaDraftRepository(clock());
    await repository.save({ actorId: "actor-a", draftId: "private_01", expectedRevision: 0, idempotencyKey: "idem-private-01", commandHash: "a".repeat(64), document: document("Private") });
    await expect(repository.read({ actorId: "actor-b", draftId: "private_01", revision: 1 })).rejects.toMatchObject({ code: "AREA_DRAFT_NOT_FOUND" });
    await expect(repository.delete({ actorId: "actor-b", draftId: "private_01", expectedRevision: 1, idempotencyKey: "idem-delete-b", commandHash: "b".repeat(64) })).rejects.toMatchObject({ code: "AREA_DRAFT_NOT_FOUND" });
    expect((await repository.list({ actorId: "actor-b", pageSize: 25 })).items).toEqual([]);
  });

  it("retains delete replay after the draft is gone and rejects key rebinding", async () => {
    const repository = new MemoryAreaDraftRepository(clock());
    await repository.save({ actorId: "actor-a", draftId: "draft_delete", expectedRevision: 0, idempotencyKey: "idem-create-delete", commandHash: "a".repeat(64), document: document("Delete") });
    const deleted = await repository.delete({ actorId: "actor-a", draftId: "draft_delete", expectedRevision: 1, idempotencyKey: "idem-delete-01", commandHash: "b".repeat(64) });
    expect(deleted.result).toEqual({ draftId: "draft_delete", deletedRevision: 1, deleted: true });
    expect((await repository.delete({ actorId: "actor-a", draftId: "draft_delete", expectedRevision: 1, idempotencyKey: "idem-delete-01", commandHash: "b".repeat(64) })).idempotency).toBe("replayed");
    await expect(repository.delete({ actorId: "actor-a", draftId: "draft_delete", expectedRevision: 1, idempotencyKey: "idem-delete-01", commandHash: "c".repeat(64) })).rejects.toMatchObject({ code: "AREA_DRAFT_IDEMPOTENCY_CONFLICT" });
  });

  it("paginates newest-first with an opaque stable cursor", async () => {
    const repository = new MemoryAreaDraftRepository(clock());
    for (const [index, id] of ["draft_a", "draft_b", "draft_c"].entries()) {
      await repository.save({ actorId: "actor-a", draftId: id, expectedRevision: 0, idempotencyKey: `idem-page-${index}`, commandHash: String(index).repeat(64), document: document(id) });
    }
    const first = await repository.list({ actorId: "actor-a", pageSize: 2 });
    expect(first.items.map((item) => item.draftId)).toEqual(["draft_c", "draft_b"]);
    expect(first.nextCursor).toEqual(expect.any(String));
    const second = await repository.list({ actorId: "actor-a", pageSize: 2, cursor: first.nextCursor! });
    expect(second.items.map((item) => item.draftId)).toEqual(["draft_a"]);
    expect(second.nextCursor).toBeNull();
  });
});

function clock() {
  let tick = 0;
  return { nowIso: () => new Date(Date.UTC(2026, 7, 7, 10, 0, tick++)).toISOString() };
}
