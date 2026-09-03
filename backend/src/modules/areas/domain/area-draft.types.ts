export const AREA_DRAFT_SCHEMA_VERSION = "area-draft.v1" as const;
export const AREA_DRAFT_OPEN_SCHEMA_VERSION = "area-draft-open.v1" as const;
export const PRODUCTION_AREA_DRAFT_PAYLOAD_SCHEMA_VERSION =
  "production-area-draft-payload.v1" as const;

export type AreaDraftSource =
  | Readonly<{ type: "new" }>
  | Readonly<{ type: "production_area"; areaId: string }>;

export interface AreaDraftDocument {
  readonly schemaVersion: typeof AREA_DRAFT_SCHEMA_VERSION;
  readonly title: string;
  readonly source: AreaDraftSource;
  readonly payload: unknown;
}

export interface ProductionAreaDraftOpenRequest {
  readonly schemaVersion: typeof AREA_DRAFT_OPEN_SCHEMA_VERSION;
  readonly draftTitle: string;
}

export interface ProductionAreaDraftPayload {
  readonly schemaVersion: typeof PRODUCTION_AREA_DRAFT_PAYLOAD_SCHEMA_VERSION;
  readonly sourceArea: unknown;
  readonly provenance: Readonly<{
    areaId: string;
    sourceUpdatedAt: string;
    processingCacheKey: string;
    sourceAreSha256?: string;
    sourceGitSha256?: string;
    sourceGicSha256?: string;
    sourceIfoSha256?: string;
  }>;
}

export interface AreaDraftSnapshot {
  readonly draftId: string;
  readonly title: string;
  readonly revision: number;
  readonly updatedAt: string;
  readonly normalizedSha256: string;
  readonly source: AreaDraftSource;
  readonly draft: AreaDraftDocument;
}

export interface AreaDraftSummary {
  readonly draftId: string;
  readonly title: string;
  readonly revision: number;
  readonly updatedAt: string;
  readonly source: AreaDraftSource;
}

export interface AreaDraftList {
  readonly items: readonly AreaDraftSummary[];
  readonly nextCursor: string | null;
}

export interface DeletedAreaDraft {
  readonly draftId: string;
  readonly deletedRevision: number;
  readonly deleted: true;
}

export type AreaDraftIdempotencyStatus = "created" | "replayed";

export interface AreaDraftSaveResult {
  readonly idempotency: AreaDraftIdempotencyStatus;
  readonly snapshot: AreaDraftSnapshot;
}

export interface AreaDraftDeleteResult {
  readonly idempotency: AreaDraftIdempotencyStatus;
  readonly result: DeletedAreaDraft;
}
