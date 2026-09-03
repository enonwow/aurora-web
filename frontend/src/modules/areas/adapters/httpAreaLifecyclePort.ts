import { z } from "zod";

import type {
  AreaDraftList,
  AreaDraftSnapshot,
  AreaLifecycleCommandPort,
  AreaLifecycleErrorCode,
  AreaLifecycleMetadata,
  AreaLifecycleOperation,
  AreaLifecycleQueryPort,
  AreaLifecycleRecovery,
  AreaLifecycleResult,
  AreaMaterializationCommand,
  AreaMaterializationReceipt,
  DeleteLocalAreaDraftCommand,
  DeletedLocalAreaDraft,
  OpenLocalAreaDraftQuery,
  OpenProductionAreaAsDraftCommand,
  SaveLocalAreaDraftCommand
} from "../ports/areaLifecyclePort";

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

const CONTRACT_VERSION_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u;
const SHA256_PATTERN = /^[a-f0-9]{64}$/u;

const nonBlankSchema = z.string().min(1);
const sourceSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("new") }).strict(),
  z.object({ type: z.literal("production_area"), areaId: nonBlankSchema }).strict()
]);
const documentSchema = z
  .object({
    schemaVersion: z.literal("area-draft.v1"),
    title: nonBlankSchema,
    source: sourceSchema,
    payload: z.unknown()
  })
  .strict();
const summarySchema = z
  .object({
    draftId: nonBlankSchema,
    title: nonBlankSchema,
    revision: z.number().int().positive(),
    updatedAt: z.string().datetime(),
    source: sourceSchema
  })
  .strict();
const snapshotSchema = z
  .object({
    draftId: nonBlankSchema,
    title: nonBlankSchema,
    revision: z.number().int().positive(),
    updatedAt: z.string().datetime(),
    normalizedSha256: z.string().regex(SHA256_PATTERN),
    source: sourceSchema,
    draft: documentSchema
  })
  .strict();
const listSchema = z
  .object({
    items: z.array(summarySchema),
    nextCursor: z.string().min(1).nullable()
  })
  .strict();
const deletedSchema = z
  .object({
    draftId: nonBlankSchema,
    deletedRevision: z.number().int().positive(),
    deleted: z.literal(true)
  })
  .strict();
const idempotencySchema = z.enum(["created", "replayed"]);

function successEnvelopeSchema<TSchema extends z.ZodTypeAny>(data: TSchema) {
  return z
    .object({
      contractVersion: z.string().regex(CONTRACT_VERSION_PATTERN),
      requestId: nonBlankSchema,
      data
    })
    .strict();
}

const listEnvelopeSchema = successEnvelopeSchema(listSchema);
const snapshotEnvelopeSchema = successEnvelopeSchema(snapshotSchema);
const saveEnvelopeSchema = successEnvelopeSchema(
  z.object({ idempotency: idempotencySchema, snapshot: snapshotSchema }).strict()
);
const deleteEnvelopeSchema = successEnvelopeSchema(
  z.object({ idempotency: idempotencySchema, result: deletedSchema }).strict()
);
const errorEnvelopeSchema = z
  .object({
    contractVersion: z.string().regex(CONTRACT_VERSION_PATTERN),
    requestId: nonBlankSchema,
    error: z
      .object({
        code: nonBlankSchema,
        message: nonBlankSchema,
        details: z.array(
          z.object({ path: z.string(), reason: nonBlankSchema }).strict()
        ),
        retryable: z.boolean()
      })
      .strict()
  })
  .strict();

interface SuccessProjection<TValue> {
  readonly value: TValue;
  readonly metadata: AreaLifecycleMetadata;
}

export class HttpAreaLifecyclePort<TDraft = unknown>
  implements AreaLifecycleQueryPort<TDraft>, AreaLifecycleCommandPort<TDraft>
{
  private readonly baseUrl: string;

  constructor(
    private readonly fetchFn: FetchLike = fetch.bind(globalThis),
    baseUrl = resolveBaseUrl(),
    private readonly accessToken: () => string | null | undefined = () => null
  ) {
    this.baseUrl = baseUrl.replace(/\/+$/u, "");
  }

  listLocalDrafts(query: {
    readonly cursor?: string;
    readonly pageSize?: number;
  }): Promise<AreaLifecycleResult<AreaDraftList>> {
    const parameters = new URLSearchParams();
    if (query.cursor !== undefined) parameters.set("cursor", query.cursor);
    if (query.pageSize !== undefined) parameters.set("pageSize", String(query.pageSize));
    const suffix = parameters.size > 0 ? `?${parameters.toString()}` : "";
    return this.request(
      "list_local_drafts",
      `${this.baseUrl}/area-drafts${suffix}`,
      { method: "GET", headers: this.authorizationHeaders() },
      listEnvelopeSchema,
      (parsed) => ({
        value: parsed.data,
        metadata: envelopeMetadata(parsed)
      })
    );
  }

  openLocalDraft(
    query: OpenLocalAreaDraftQuery
  ): Promise<AreaLifecycleResult<AreaDraftSnapshot<TDraft>>> {
    const path = `${this.baseUrl}/area-drafts/${encodeURIComponent(query.draftId)}?revision=${encodeURIComponent(String(query.revision))}`;
    return this.request(
      "open_local_draft",
      path,
      { method: "GET", headers: this.authorizationHeaders() },
      snapshotEnvelopeSchema,
      (parsed, response) => {
        const etag = assertRevisionEtag(response, parsed.data.revision);
        return {
          value: projectSnapshot<TDraft>(parsed.data),
          metadata: {
            ...envelopeMetadata(parsed),
            schemaVersion: parsed.data.draft.schemaVersion,
            revision: parsed.data.revision,
            etag
          }
        };
      }
    );
  }

  openProductionAreaAsDraft(
    command: OpenProductionAreaAsDraftCommand
  ): Promise<AreaLifecycleResult<AreaDraftSnapshot<TDraft>>> {
    return this.request(
      "open_production_area_as_draft",
      `${this.baseUrl}/areas/production/${encodeURIComponent(command.areaId)}/open-as-draft`,
      {
        method: "POST",
        headers: this.jsonIdempotentMutationHeaders(command.idempotencyKey),
        body: JSON.stringify({
          schemaVersion: command.schemaVersion,
          draftTitle: command.draftTitle
        })
      },
      saveEnvelopeSchema,
      (parsed, response) => {
        const etag = assertRevisionEtag(response, parsed.data.snapshot.revision);
        return {
          value: projectSnapshot<TDraft>(parsed.data.snapshot),
          metadata: {
            ...envelopeMetadata(parsed),
            schemaVersion: parsed.data.snapshot.draft.schemaVersion,
            revision: parsed.data.snapshot.revision,
            etag,
            idempotencyKey: command.idempotencyKey,
            idempotencyStatus: parsed.data.idempotency
          }
        };
      }
    );
  }

  saveLocalDraft(
    command: SaveLocalAreaDraftCommand<TDraft>
  ): Promise<AreaLifecycleResult<AreaDraftSnapshot<TDraft>>> {
    return this.request(
      "save_local_draft",
      `${this.baseUrl}/area-drafts/${encodeURIComponent(command.draftId)}`,
      {
        method: "PUT",
        headers: this.jsonMutationHeaders(command.expectedRevision, command.idempotencyKey),
        body: JSON.stringify(command.draft)
      },
      saveEnvelopeSchema,
      (parsed, response) => {
        const etag = assertRevisionEtag(response, parsed.data.snapshot.revision);
        return {
          value: projectSnapshot<TDraft>(parsed.data.snapshot),
          metadata: {
            ...envelopeMetadata(parsed),
            schemaVersion: parsed.data.snapshot.draft.schemaVersion,
            revision: parsed.data.snapshot.revision,
            etag,
            idempotencyKey: command.idempotencyKey,
            idempotencyStatus: parsed.data.idempotency
          }
        };
      }
    );
  }

  deleteLocalDraft(
    command: DeleteLocalAreaDraftCommand
  ): Promise<AreaLifecycleResult<DeletedLocalAreaDraft>> {
    return this.request(
      "delete_local_draft",
      `${this.baseUrl}/area-drafts/${encodeURIComponent(command.draftId)}`,
      {
        method: "DELETE",
        headers: this.mutationHeaders(command.expectedRevision, command.idempotencyKey)
      },
      deleteEnvelopeSchema,
      (parsed, response) => {
        const etag = assertRevisionEtag(response, parsed.data.result.deletedRevision);
        return {
          value: parsed.data.result,
          metadata: {
            ...envelopeMetadata(parsed),
            revision: parsed.data.result.deletedRevision,
            etag,
            idempotencyKey: command.idempotencyKey,
            idempotencyStatus: parsed.data.idempotency
          }
        };
      }
    );
  }

  async materializeArea(
    command: AreaMaterializationCommand
  ): Promise<AreaLifecycleResult<AreaMaterializationReceipt>> {
    return {
      ok: false,
      error: {
        code: "MATERIALIZATION_BLOCKED",
        operation: materializationOperation(command),
        message: "Native module Area materialization is blocked until its Aurora certification gates pass.",
        retryable: false,
        recovery: "resolve_materialization_blockers",
        details: []
      }
    };
  }

  private authorizationHeaders(): Record<string, string> {
    const token = this.accessToken()?.trim();
    return {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
  }

  private jsonMutationHeaders(
    expectedRevision: number,
    idempotencyKey: string
  ): Record<string, string> {
    return {
      ...this.mutationHeaders(expectedRevision, idempotencyKey),
      "Content-Type": "application/json; charset=utf-8",
    };
  }

  private jsonIdempotentMutationHeaders(
    idempotencyKey: string
  ): Record<string, string> {
    return {
      ...this.authorizationHeaders(),
      "Content-Type": "application/json; charset=utf-8",
      "Idempotency-Key": idempotencyKey
    };
  }

  private mutationHeaders(
    expectedRevision: number,
    idempotencyKey: string
  ): Record<string, string> {
    return {
      ...this.authorizationHeaders(),
      "If-Match": `"${expectedRevision}"`,
      "Idempotency-Key": idempotencyKey
    };
  }

  private async request<TSchema extends z.ZodTypeAny, TValue>(
    operation: AreaLifecycleOperation,
    url: string,
    init: RequestInit,
    schema: TSchema,
    project: (parsed: z.infer<TSchema>, response: Response) => SuccessProjection<TValue>
  ): Promise<AreaLifecycleResult<TValue>> {
    let response: Response;
    try {
      response = await this.fetchFn(url, init);
    } catch {
      return portFailure(operation, true, "The Area lifecycle request could not be completed.");
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      return portFailure(operation, response.status >= 500, "The Area lifecycle API returned invalid JSON.");
    }

    if (!response.ok) return backendFailure(operation, response, payload);

    try {
      const projected = project(schema.parse(payload), response);
      return { ok: true, value: projected.value, metadata: projected.metadata };
    } catch {
      return portFailure(operation, response.status >= 500, "The Area lifecycle API returned a response outside the v1 contract.");
    }
  }
}

export function createHttpAreaLifecyclePort<TDraft = unknown>(
  fetchFn: FetchLike = fetch.bind(globalThis),
  baseUrl = resolveBaseUrl(),
  accessToken: () => string | null | undefined = () => null
): HttpAreaLifecyclePort<TDraft> {
  return new HttpAreaLifecyclePort<TDraft>(fetchFn, baseUrl, accessToken);
}

function resolveBaseUrl(): string {
  const configured = (import.meta.env.VITE_BACKEND_API_BASE_URL as string | undefined)?.trim();
  if (configured) return configured.replace(/\/+$/u, "");
  return import.meta.env.DEV ? "/_aurora/v1" : "/api/v1";
}

function projectSnapshot<TDraft>(snapshot: z.infer<typeof snapshotSchema>): AreaDraftSnapshot<TDraft> {
  return {
    draftId: snapshot.draftId,
    title: snapshot.title,
    revision: snapshot.revision,
    updatedAt: snapshot.updatedAt,
    normalizedSha256: snapshot.normalizedSha256,
    draft: snapshot.draft as TDraft
  };
}

function envelopeMetadata(envelope: {
  readonly contractVersion: string;
  readonly requestId: string;
}): AreaLifecycleMetadata {
  return {
    contractVersion: envelope.contractVersion,
    requestId: envelope.requestId
  };
}

function assertRevisionEtag(response: Response, revision: number): string {
  const etag = response.headers.get("etag");
  if (etag !== `"${revision}"`) throw new Error("revision_etag_mismatch");
  return etag;
}

function materializationOperation(command: AreaMaterializationCommand): AreaLifecycleOperation {
  return `materialize_${command.action}`;
}

function portFailure<TValue>(
  operation: AreaLifecycleOperation,
  retryable: boolean,
  message: string
): AreaLifecycleResult<TValue> {
  return {
    ok: false,
    error: {
      code: "PORT_FAILURE",
      operation,
      message,
      retryable,
      recovery: retryable ? "retry" : "none",
      details: []
    }
  };
}

function backendFailure<TValue>(
  operation: AreaLifecycleOperation,
  response: Response,
  payload: unknown
): AreaLifecycleResult<TValue> {
  const parsed = errorEnvelopeSchema.safeParse(payload);
  if (!parsed.success) {
    return portFailure(operation, response.status >= 500, "The Area lifecycle API returned a malformed error response.");
  }
  const mapping = mapBackendError(parsed.data.error.code, response.status);
  const revision = readRevisionConflict(parsed.data.error.details);
  return {
    ok: false,
    error: {
      code: mapping.code,
      operation,
      message: parsed.data.error.message,
      retryable: parsed.data.error.retryable,
      recovery: mapping.recovery,
      ...(revision.expectedRevision === undefined
        ? {}
        : {
            expectedRevision: revision.expectedRevision,
            actualRevision: revision.actualRevision
          }),
      details: parsed.data.error.details
    },
    metadata: envelopeMetadata(parsed.data)
  };
}

function mapBackendError(
  code: string,
  status: number
): { readonly code: AreaLifecycleErrorCode; readonly recovery: AreaLifecycleRecovery } {
  if (status === 401 || code === "AREA_DRAFT_UNAUTHORIZED" || code === "UNAUTHORIZED") {
    return { code: "UNAUTHORIZED", recovery: "reauthenticate" };
  }
  if (status === 403 || code === "FORBIDDEN") return { code: "FORBIDDEN", recovery: "none" };
  if (status === 404 || code === "AREA_DRAFT_NOT_FOUND") return { code: "NOT_FOUND", recovery: "none" };
  if (code === "AREA_DRAFT_IDEMPOTENCY_CONFLICT") {
    return { code: "IDEMPOTENCY_CONFLICT", recovery: "choose_new_idempotency_key" };
  }
  if (status === 412 || code === "AREA_DRAFT_REVISION_CONFLICT") {
    return { code: "STALE_REVISION", recovery: "reload_draft" };
  }
  if (status === 413 || code === "AREA_DRAFT_PAYLOAD_TOO_LARGE") {
    return { code: "PAYLOAD_TOO_LARGE", recovery: "none" };
  }
  if (status === 400 || status === 422 || code.startsWith("AREA_DRAFT_INVALID_")) {
    return { code: "VALIDATION_FAILED", recovery: "none" };
  }
  return { code: "PORT_FAILURE", recovery: parsedRetryRecovery(status) };
}

function parsedRetryRecovery(status: number): AreaLifecycleRecovery {
  return status >= 500 ? "retry" : "none";
}

function readRevisionConflict(
  details: readonly { readonly reason: string }[]
): { readonly expectedRevision?: number; readonly actualRevision?: number } {
  for (const detail of details) {
    const match = /^expected=(\d+);actual=(\d+)$/u.exec(detail.reason);
    if (match) {
      return {
        expectedRevision: Number(match[1]),
        actualRevision: Number(match[2])
      };
    }
  }
  return {};
}
