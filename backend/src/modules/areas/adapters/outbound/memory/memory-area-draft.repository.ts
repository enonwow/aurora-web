import { Inject, Injectable, Optional } from "@nestjs/common";
import type { AreaDraftRepositoryPort } from "../../../application/ports/area-draft.repository.port";
import { AreaDraftRepositoryError } from "../../../application/ports/area-draft.repository.port";
import type { AreaDraftDeleteResult, AreaDraftDocument, AreaDraftList, AreaDraftSaveResult, AreaDraftSnapshot, DeletedAreaDraft } from "../../../domain/area-draft.types";
import { decodeAreaDraftCursor, encodeAreaDraftCursor, hashAreaDraftDocument, isAreaDraftAfterCursor } from "../../../domain/area-draft.validation";

interface StoredDraft { readonly actorId: string; readonly snapshot: AreaDraftSnapshot; }
export const AREA_DRAFT_CLOCK = Symbol("AREA_DRAFT_CLOCK");
export interface AreaDraftClock { nowIso(): string; }
type RetainedResult =
  | Readonly<{ operation: "save"; commandHash: string; result: AreaDraftSaveResult }>
  | Readonly<{ operation: "delete"; commandHash: string; result: AreaDraftDeleteResult }>;

@Injectable()
export class MemoryAreaDraftRepository implements AreaDraftRepositoryPort {
  private readonly drafts = new Map<string, StoredDraft>();
  private readonly idempotency = new Map<string, RetainedResult>();

  private readonly clock: AreaDraftClock;

  constructor(
    @Optional() @Inject(AREA_DRAFT_CLOCK) clock?: AreaDraftClock,
  ) {
    this.clock = clock ?? { nowIso: () => new Date().toISOString() };
  }

  async list(input: Readonly<{ actorId: string; pageSize: number; cursor?: string }>): Promise<AreaDraftList> {
    const cursor = input.cursor ? decodeAreaDraftCursor(input.cursor) : null;
    const visible = [...this.drafts.values()]
      .filter((record) => record.actorId === input.actorId)
      .map((record) => record.snapshot)
      .sort(compareSnapshots)
      .filter((snapshot) => !cursor || isAreaDraftAfterCursor(snapshot, cursor));
    const page = visible.slice(0, input.pageSize);
    return freezeClone({
      items: page.map((snapshot) => ({ draftId: snapshot.draftId, title: snapshot.title, revision: snapshot.revision, updatedAt: snapshot.updatedAt, source: snapshot.source })),
      nextCursor: visible.length > page.length && page.length > 0 ? encodeAreaDraftCursor(page[page.length - 1]) : null,
    });
  }

  async read(input: Readonly<{ actorId: string; draftId: string; revision: number }>): Promise<AreaDraftSnapshot> {
    const record = this.drafts.get(scope(input.actorId, input.draftId));
    if (!record) throw notFound();
    if (record.snapshot.revision !== input.revision) throw revisionConflict(input.revision, record.snapshot.revision);
    return freezeClone(record.snapshot);
  }

  async findRetainedSaveResult(input: Readonly<{ actorId: string; draftId: string; idempotencyKey: string; commandHash: string }>): Promise<AreaDraftSaveResult | null> {
    const retained = this.idempotency.get(
      idemScope(input.actorId, input.draftId, input.idempotencyKey),
    );
    return retained ? replaySave(retained, input.commandHash) : null;
  }

  async save(input: Readonly<{ actorId: string; draftId: string; expectedRevision: number; idempotencyKey: string; commandHash: string; document: AreaDraftDocument }>): Promise<AreaDraftSaveResult> {
    const idempotencyKey = idemScope(input.actorId, input.draftId, input.idempotencyKey);
    const retained = this.idempotency.get(idempotencyKey);
    if (retained) return replaySave(retained, input.commandHash);
    const key = scope(input.actorId, input.draftId);
    const current = this.drafts.get(key)?.snapshot ?? null;
    if (!current && input.expectedRevision !== 0) throw notFound();
    if (current && current.revision !== input.expectedRevision) throw revisionConflict(input.expectedRevision, current.revision);
    const snapshot = freezeClone({
      draftId: input.draftId,
      title: input.document.title,
      revision: (current?.revision ?? 0) + 1,
      updatedAt: this.clock.nowIso(),
      normalizedSha256: hashAreaDraftDocument(input.document),
      source: input.document.source,
      draft: input.document,
    });
    const result = freezeClone<AreaDraftSaveResult>({ idempotency: "created", snapshot });
    this.drafts.set(key, { actorId: input.actorId, snapshot });
    this.idempotency.set(idempotencyKey, { operation: "save", commandHash: input.commandHash, result });
    return result;
  }

  async delete(input: Readonly<{ actorId: string; draftId: string; expectedRevision: number; idempotencyKey: string; commandHash: string }>): Promise<AreaDraftDeleteResult> {
    const idempotencyKey = idemScope(input.actorId, input.draftId, input.idempotencyKey);
    const retained = this.idempotency.get(idempotencyKey);
    if (retained) return replayDelete(retained, input.commandHash);
    const key = scope(input.actorId, input.draftId);
    const current = this.drafts.get(key)?.snapshot ?? null;
    if (!current) throw notFound();
    if (current.revision !== input.expectedRevision) throw revisionConflict(input.expectedRevision, current.revision);
    const deleted: DeletedAreaDraft = Object.freeze({ draftId: input.draftId, deletedRevision: current.revision, deleted: true });
    const result = freezeClone<AreaDraftDeleteResult>({ idempotency: "created", result: deleted });
    this.drafts.delete(key);
    this.idempotency.set(idempotencyKey, { operation: "delete", commandHash: input.commandHash, result });
    return result;
  }
}

function replaySave(retained: RetainedResult, commandHash: string): AreaDraftSaveResult {
  if (retained.commandHash !== commandHash || retained.operation !== "save") throw idempotencyConflict();
  return freezeClone({ ...retained.result, idempotency: "replayed" });
}
function replayDelete(retained: RetainedResult, commandHash: string): AreaDraftDeleteResult {
  if (retained.commandHash !== commandHash || retained.operation !== "delete") throw idempotencyConflict();
  return freezeClone({ ...retained.result, idempotency: "replayed" });
}
function scope(actorId: string, draftId: string): string { return `${actorId}\u0000${draftId}`; }
function idemScope(actorId: string, draftId: string, key: string): string { return `${scope(actorId, draftId)}\u0000${key}`; }
function compareSnapshots(left: AreaDraftSnapshot, right: AreaDraftSnapshot): number { return right.updatedAt.localeCompare(left.updatedAt) || left.draftId.localeCompare(right.draftId); }
function notFound(): AreaDraftRepositoryError { return new AreaDraftRepositoryError("AREA_DRAFT_NOT_FOUND", "Area draft was not found."); }
function revisionConflict(expected: number, actual: number): AreaDraftRepositoryError { return new AreaDraftRepositoryError("AREA_DRAFT_REVISION_CONFLICT", "Area draft revision precondition failed.", expected, actual); }
function idempotencyConflict(): AreaDraftRepositoryError { return new AreaDraftRepositoryError("AREA_DRAFT_IDEMPOTENCY_CONFLICT", "Idempotency key is bound to another command."); }
function freezeClone<T>(value: T): T { return deepFreeze(structuredClone(value)); }
function deepFreeze<T>(value: T): T { if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value; for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child); return Object.freeze(value); }
