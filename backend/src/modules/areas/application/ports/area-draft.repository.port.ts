import type {
  AreaDraftDeleteResult,
  AreaDraftDocument,
  AreaDraftList,
  AreaDraftSaveResult,
  AreaDraftSnapshot,
} from "../../domain/area-draft.types";

export const AREA_DRAFT_REPOSITORY = Symbol("AREA_DRAFT_REPOSITORY");

export type AreaDraftRepositoryErrorCode =
  | "AREA_DRAFT_NOT_FOUND"
  | "AREA_DRAFT_REVISION_CONFLICT"
  | "AREA_DRAFT_IDEMPOTENCY_CONFLICT"
  | "AREA_DRAFT_STORAGE_UNAVAILABLE";

export class AreaDraftRepositoryError extends Error {
  constructor(
    readonly code: AreaDraftRepositoryErrorCode,
    message: string,
    readonly expectedRevision?: number,
    readonly actualRevision?: number,
  ) {
    super(`${code}: ${message}`);
    this.name = "AreaDraftRepositoryError";
  }
}

export interface AreaDraftRepositoryPort {
  list(input: Readonly<{ actorId: string; pageSize: number; cursor?: string }>): Promise<AreaDraftList>;
  read(input: Readonly<{ actorId: string; draftId: string; revision: number }>): Promise<AreaDraftSnapshot>;
  findRetainedSaveResult(input: Readonly<{ actorId: string; draftId: string; idempotencyKey: string; commandHash: string }>): Promise<AreaDraftSaveResult | null>;
  save(input: Readonly<{ actorId: string; draftId: string; expectedRevision: number; idempotencyKey: string; commandHash: string; document: AreaDraftDocument }>): Promise<AreaDraftSaveResult>;
  delete(input: Readonly<{ actorId: string; draftId: string; expectedRevision: number; idempotencyKey: string; commandHash: string }>): Promise<AreaDraftDeleteResult>;
}
