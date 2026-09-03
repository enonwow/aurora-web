export type AreaLifecycleOperation =
  | "list_local_drafts"
  | "open_local_draft"
  | "open_production_area_as_draft"
  | "save_local_draft"
  | "delete_local_draft"
  | "materialize_create"
  | "materialize_update"
  | "materialize_delete";

export type AreaLifecycleErrorCode =
  | "VALIDATION_FAILED"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "IDEMPOTENCY_CONFLICT"
  | "STALE_REVISION"
  | "PAYLOAD_TOO_LARGE"
  | "MATERIALIZATION_BLOCKED"
  | "PORT_FAILURE";

export type AreaLifecycleRecovery =
  | "none"
  | "retry"
  | "reauthenticate"
  | "reload_draft"
  | "choose_new_idempotency_key"
  | "resolve_materialization_blockers";

export interface AreaLifecycleErrorDetail {
  readonly path?: string;
  readonly reason: string;
  readonly expected?: string | number | boolean | null;
  readonly actual?: string | number | boolean | null;
}

export interface AreaLifecycleError {
  readonly code: AreaLifecycleErrorCode;
  readonly operation: AreaLifecycleOperation;
  readonly message: string;
  readonly retryable: boolean;
  readonly recovery: AreaLifecycleRecovery;
  readonly expectedRevision?: number;
  readonly actualRevision?: number;
  readonly details: readonly AreaLifecycleErrorDetail[];
}

export type AreaLifecycleProofStatus = "verified" | "failed" | "missing";

export interface AreaLifecycleProofMetadata {
  readonly status: AreaLifecycleProofStatus;
  readonly planId?: string;
  readonly artifactIds: readonly string[];
  readonly sourceHashes: Readonly<Record<string, string>>;
}

export interface AreaLifecycleMetadata {
  readonly contractVersion: string;
  readonly requestId: string;
  readonly schemaVersion?: string;
  readonly revision?: number;
  readonly etag?: string;
  readonly commandId?: string;
  readonly idempotencyKey?: string;
  readonly proof?: AreaLifecycleProofMetadata;
  readonly idempotencyStatus?: "created" | "replayed";
}

export interface AreaLifecycleSuccess<TValue> {
  readonly ok: true;
  readonly value: TValue;
  readonly metadata: AreaLifecycleMetadata;
}

export interface AreaLifecycleFailure {
  readonly ok: false;
  readonly error: AreaLifecycleError;
  readonly metadata?: AreaLifecycleMetadata;
}

export type AreaLifecycleResult<TValue> =
  | AreaLifecycleSuccess<TValue>
  | AreaLifecycleFailure;

export type AreaDraftSource =
  | { readonly type: "new" }
  | { readonly type: "production_area"; readonly areaId: string };

export interface AreaDraftDocument<TPayload = unknown> {
  readonly schemaVersion: "area-draft.v1";
  readonly title: string;
  readonly source: AreaDraftSource;
  readonly payload: TPayload;
}

export interface ProductionAreaDraftPayload<TArea = unknown, TEditableScene = unknown> {
  readonly schemaVersion: "production-area-draft-payload.v1";
  readonly sourceArea: TArea;
  readonly provenance: Readonly<{
    areaId: string;
    sourceUpdatedAt: string;
    processingCacheKey: string;
    sourceAreSha256?: string;
    sourceGitSha256?: string;
    sourceGicSha256?: string;
    sourceIfoSha256?: string;
  }>;
  readonly editableScene?: TEditableScene;
}

export interface AreaDraftSession {
  readonly draftId: string;
  readonly revision: number;
  readonly normalizedSha256?: string;
  readonly persistedSceneUpdatedAtUnixMs?: number;
  readonly productionSource?: ProductionAreaDraftPayload;
}

export interface AreaDraftSessionRegistry {
  current: Record<string, AreaDraftSession>;
}

export interface AreaDraftSummary {
  readonly draftId: string;
  readonly title: string;
  readonly revision: number;
  readonly updatedAt: string;
  readonly source: AreaDraftSource;
}

export interface AreaDraftListQuery {
  readonly cursor?: string;
  readonly pageSize?: number;
}

export interface AreaDraftList {
  readonly items: readonly AreaDraftSummary[];
  readonly nextCursor: string | null;
}

export interface OpenLocalAreaDraftQuery {
  readonly draftId: string;
  readonly revision: number;
}

export interface AreaDraftSnapshot<TDraft = unknown> {
  readonly draftId: string;
  readonly title: string;
  readonly revision: number;
  readonly updatedAt: string;
  readonly normalizedSha256: string;
  readonly draft: TDraft;
}

export interface SaveLocalAreaDraftCommand<TDraft = unknown> {
  readonly draftId: string;
  readonly expectedRevision: number;
  readonly idempotencyKey: string;
  readonly schemaVersion: string;
  readonly draft: TDraft;
}

export interface OpenProductionAreaAsDraftCommand {
  readonly schemaVersion: "area-draft-open.v1";
  readonly areaId: string;
  readonly draftTitle: string;
  readonly idempotencyKey: string;
}

export interface DeleteLocalAreaDraftCommand {
  readonly draftId: string;
  readonly expectedRevision: number;
  readonly idempotencyKey: string;
}

export interface DeletedLocalAreaDraft {
  readonly draftId: string;
  readonly deletedRevision: number;
  readonly deleted: true;
}

interface AreaMaterializationCommandBase {
  readonly targetModuleId: string;
  readonly expectedTargetRevision: string;
  readonly idempotencyKey: string;
}

export interface CreateAreaMaterializationCommand
  extends AreaMaterializationCommandBase {
  readonly action: "create";
  readonly draftId: string;
  readonly expectedDraftRevision: number;
}

export interface UpdateAreaMaterializationCommand
  extends AreaMaterializationCommandBase {
  readonly action: "update";
  readonly areaId: string;
  readonly draftId: string;
  readonly expectedDraftRevision: number;
}

export interface DeleteAreaMaterializationCommand
  extends AreaMaterializationCommandBase {
  readonly action: "delete";
  readonly areaId: string;
}

export type AreaMaterializationCommand =
  | CreateAreaMaterializationCommand
  | UpdateAreaMaterializationCommand
  | DeleteAreaMaterializationCommand;

export type AreaMaterializationStatus =
  | "accepted"
  | "running"
  | "succeeded";

export interface AreaMaterializationReceipt {
  readonly materializationId: string;
  readonly action: AreaMaterializationCommand["action"];
  readonly targetModuleId: string;
  readonly status: AreaMaterializationStatus;
}

export interface AreaLifecycleQueryPort<TDraft = unknown> {
  listLocalDrafts(query: AreaDraftListQuery): Promise<AreaLifecycleResult<AreaDraftList>>;
  openLocalDraft(
    query: OpenLocalAreaDraftQuery
  ): Promise<AreaLifecycleResult<AreaDraftSnapshot<TDraft>>>;
}

export interface AreaLifecycleCommandPort<TDraft = unknown> {
  openProductionAreaAsDraft(
    command: OpenProductionAreaAsDraftCommand
  ): Promise<AreaLifecycleResult<AreaDraftSnapshot<TDraft>>>;
  saveLocalDraft(
    command: SaveLocalAreaDraftCommand<TDraft>
  ): Promise<AreaLifecycleResult<AreaDraftSnapshot<TDraft>>>;
  deleteLocalDraft(
    command: DeleteLocalAreaDraftCommand
  ): Promise<AreaLifecycleResult<DeletedLocalAreaDraft>>;
  materializeArea(
    command: AreaMaterializationCommand
  ): Promise<AreaLifecycleResult<AreaMaterializationReceipt>>;
}
