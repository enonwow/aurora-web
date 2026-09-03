import { describe, expect, it, vi } from "vitest";
import { HttpAreaLifecyclePort } from "../../../../src/modules/areas/adapters/httpAreaLifecyclePort";

const envelope = (data: unknown) => ({ contractVersion: "1.1.0", requestId: "req-draft-01", data });
const draft = { schemaVersion: "area-draft.v1", title: "Draft", source: { type: "new" }, payload: { tiles: [12] } };
const snapshot = { draftId: "draft_01", title: "Draft", revision: 3, updatedAt: "2026-08-07T10:00:00.000Z", normalizedSha256: "a".repeat(64), source: { type: "new" }, draft };

describe("HttpAreaLifecyclePort", () => {
  it("opens one production Area as an idempotent draft without a revision precondition", async () => {
    const copiedDraft = {
      schemaVersion: "area-draft.v1",
      title: "Crypt copy",
      source: { type: "production_area", areaId: "area_crypt01" },
      payload: {
        schemaVersion: "production-area-draft-payload.v1",
        sourceArea: { areaId: "area_crypt01", name: "Crypt 01" },
        provenance: {
          areaId: "area_crypt01",
          sourceUpdatedAt: "2026-08-07T09:59:00.000Z",
          processingCacheKey: "processed-area-cache-01",
          sourceAreSha256: "a".repeat(64),
          sourceGitSha256: "b".repeat(64),
          sourceGicSha256: "c".repeat(64)
        }
      }
    };
    const copiedSnapshot = {
      ...snapshot,
      draftId: "draft_abcdef0123456789abcdef0123456789",
      revision: 1,
      source: copiedDraft.source,
      draft: copiedDraft
    };
    const fetchFn = vi.fn().mockResolvedValueOnce(
      response(
        envelope({ idempotency: "created", snapshot: copiedSnapshot }),
        { etag: '"1"' },
        201
      )
    );
    const port = new HttpAreaLifecyclePort<typeof copiedDraft>(
      fetchFn,
      "/api/v1",
      () => "token-01"
    );

    const result = await port.openProductionAreaAsDraft({
      areaId: "area_crypt01",
      draftTitle: "Crypt copy",
      idempotencyKey: "open-copy-01",
      schemaVersion: "area-draft-open.v1"
    });

    expect(result).toMatchObject({
      ok: true,
      value: {
        draftId: copiedSnapshot.draftId,
        revision: 1,
        draft: {
          payload: {
            provenance: { sourceGicSha256: "c".repeat(64) }
          }
        }
      },
      metadata: { etag: '"1"', idempotencyStatus: "created" }
    });
    expect(fetchFn).toHaveBeenCalledWith(
      "/api/v1/areas/production/area_crypt01/open-as-draft",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer token-01",
          "Idempotency-Key": "open-copy-01",
          "Content-Type": "application/json; charset=utf-8"
        }),
        body: JSON.stringify({
          schemaVersion: "area-draft-open.v1",
          draftTitle: "Crypt copy"
        })
      })
    );
    const headers = new Headers((fetchFn.mock.calls[0]?.[1] as RequestInit).headers);
    expect(headers.has("if-match")).toBe(false);
  });

  it("lists and opens owner-scoped drafts through strict response contracts", async () => {
    const fetchFn = vi.fn()
      .mockResolvedValueOnce(response(envelope({ items: [{ draftId: "draft_01", title: "Draft", revision: 3, updatedAt: snapshot.updatedAt, source: { type: "new" } }], nextCursor: null })))
      .mockResolvedValueOnce(response(envelope(snapshot), { etag: '"3"' }));
    const port = new HttpAreaLifecyclePort(fetchFn, "/api/v1", () => "token-01");
    const listed = await port.listLocalDrafts({ pageSize: 25 });
    expect(listed).toMatchObject({ ok: true, value: { items: [{ draftId: "draft_01" }] } });
    const opened = await port.openLocalDraft({ draftId: "draft_01", revision: 3 });
    expect(opened).toMatchObject({
      ok: true,
      value: { revision: 3, normalizedSha256: "a".repeat(64) },
      metadata: { etag: '"3"' }
    });
    expect(fetchFn).toHaveBeenNthCalledWith(1, "/api/v1/area-drafts?pageSize=25", expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Bearer token-01" }) }));
    expect(fetchFn).toHaveBeenNthCalledWith(2, "/api/v1/area-drafts/draft_01?revision=3", expect.any(Object));
  });

  it("saves and deletes with exact precondition/idempotency headers and projects replay metadata", async () => {
    const fetchFn = vi.fn()
      .mockResolvedValueOnce(response(envelope({ idempotency: "replayed", snapshot }), { etag: '"3"' }))
      .mockResolvedValueOnce(response(envelope({ idempotency: "created", result: { draftId: "draft_01", deletedRevision: 3, deleted: true } }), { etag: '"3"' }));
    const port = new HttpAreaLifecyclePort<typeof draft>(fetchFn, "/api/v1", () => "token-01");
    const saved = await port.saveLocalDraft({ draftId: "draft_01", expectedRevision: 2, idempotencyKey: "idem-save-01", schemaVersion: "area-draft.v1", draft });
    expect(saved).toMatchObject({
      ok: true,
      value: { revision: 3, normalizedSha256: "a".repeat(64) },
      metadata: { revision: 3, idempotencyStatus: "replayed" }
    });
    expect(fetchFn).toHaveBeenNthCalledWith(1, "/api/v1/area-drafts/draft_01", expect.objectContaining({ method: "PUT", headers: expect.objectContaining({ "If-Match": '"2"', "Idempotency-Key": "idem-save-01" }), body: JSON.stringify(draft) }));
    const deleted = await port.deleteLocalDraft({ draftId: "draft_01", expectedRevision: 3, idempotencyKey: "idem-delete-01" });
    expect(deleted).toMatchObject({ ok: true, value: { deleted: true }, metadata: { idempotencyStatus: "created" } });
    expect(fetchFn).toHaveBeenNthCalledWith(2, "/api/v1/area-drafts/draft_01", expect.objectContaining({ method: "DELETE", headers: expect.objectContaining({ "If-Match": '"3"' }) }));
    const deleteInit = fetchFn.mock.calls[1]?.[1] as RequestInit;
    expect(new Headers(deleteInit.headers).has("content-type")).toBe(false);
    expect(deleteInit.body).toBeUndefined();
  });

  it("fails closed for module materialization without issuing a request", async () => {
    const fetchFn = vi.fn();
    const port = new HttpAreaLifecyclePort(fetchFn, "/api/v1", () => "token-01");
    const result = await port.materializeArea({ action: "delete", areaId: "area_01", targetModuleId: "module_01", expectedTargetRevision: "revision-01", idempotencyKey: "idem-materialize-01" });
    expect(result).toMatchObject({ ok: false, error: { code: "MATERIALIZATION_BLOCKED", operation: "materialize_delete", retryable: false, recovery: "resolve_materialization_blockers" } });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("rejects malformed success payloads and maps backend errors without leaking transport exceptions", async () => {
    const fetchFn = vi.fn()
      .mockResolvedValueOnce(response(envelope({ idempotency: "created", snapshot: { ...snapshot, revision: "3" } }), { etag: '"3"' }))
      .mockResolvedValueOnce(response({ contractVersion: "1.1.0", requestId: "req-error", error: { code: "AREA_DRAFT_REVISION_CONFLICT", message: "stale", details: [{ path: "revision", reason: "expected=2;actual=3" }], retryable: false } }, {}, 412))
      .mockRejectedValueOnce(new Error("secret network path"));
    const port = new HttpAreaLifecyclePort<typeof draft>(fetchFn, "/api/v1", () => "token-01");
    expect(await port.saveLocalDraft({ draftId: "draft_01", expectedRevision: 2, idempotencyKey: "idem-invalid-01", schemaVersion: "area-draft.v1", draft })).toMatchObject({ ok: false, error: { code: "PORT_FAILURE" } });
    expect(await port.deleteLocalDraft({ draftId: "draft_01", expectedRevision: 2, idempotencyKey: "idem-stale-01" })).toMatchObject({ ok: false, error: { code: "STALE_REVISION", expectedRevision: 2, actualRevision: 3 } });
    const transport = await port.listLocalDrafts({ pageSize: 25 });
    expect(transport).toMatchObject({ ok: false, error: { code: "PORT_FAILURE", retryable: true } });
    expect(JSON.stringify(transport)).not.toContain("secret");
  });
});

function response(payload: unknown, headers: Record<string, string> = {}, status = 200): Response {
  return new Response(JSON.stringify(payload), { status, headers: { "Content-Type": "application/json", ...headers } });
}
