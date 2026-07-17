# Processing API Shape Spec R63 (Agent O1)

Data: 2026-05-24
Status: Draft (target backend contract)
Zakres: docelowy kontrakt HTTP dla processing endpoints `placeable`, `creature`, `area`:
- request/response shape,
- idempotency keys,
- job ids,
- status polling,
- error contract.

## 1. Cel

Zdefiniowac jeden spojny kontrakt API dla `POST/GET/DELETE /processing/*`, zgodny z:
1. aktualna architektura backendu (`/api/v1`, `SuccessEnvelope/ErrorEnvelope`, RBAC),
2. reverse-first wymaganiami (`expectedRevision`, source-locked processing, manifest-first, restart-safe jobs),
3. taksonomia bledow `PIPELINE_*`.

## 2. Evidence base

### 2.1 Reverse evidence (`C:\Projects\nwn-last-city\Aurora\reverse`)
1. `docs\Core\WEB_AURORA_TECH_STRATEGY.md:207,215,264,1337,4451,4461,4513,5666,5937,8050`
- revision-gated write commands (`expectedRevision`), typed save/apply metadata, no-op/backup/writeBlockedReason.
2. `docs\Areas3D-Audits\AREAS3D_RE_AREA_TILESET_PIPELINE_AUDYT_2026-05-18.md:32,110`
- source-locked resolution i parity diagnostics jako first-class pipeline concerns.

### 2.2 Backend architecture evidence
1. `backend/src/main.ts`
- global prefix `api/v1`.
2. `backend/src/common/http/contract.ts`
- `SuccessEnvelope` i `ErrorEnvelope` (`contractVersion`, `requestId`, `data|error`).
3. `backend/src/common/http/request-context.interceptor.ts`
- `x-request-id` in/out.
4. `backend/docs/architecture/processing-authorization-matrix-agent-r10.md`
- endpoint families i role/permission matrix dla `processing/placeable|creature|area`.
5. `backend/docs/standards/processing-pipeline-errors-and-validation.md`
- canonical error envelope i `PIPELINE_*` semantics.
6. `backend/docs/standards/processing-pipeline-observability-slo-agent-r15.md`
- lifecycle statusy (`completed`, `failed`, `completed_with_drift`), retry/lock semantics.
7. `backend/docs/aurora-reverse/hex-processing-ports-spec-r63.md`
- stage model: `ingest -> parser -> enrichment -> publish` + `apply` write boundary.
8. `backend/docs/aurora-reverse/blob-ingest-pipeline-spec-r63.md`
- deterministic `job_key`, CAS/idempotency, resume/retry model.
9. `backend/docs/aurora-reverse/asset-id-strategy-spec-r63.md`
- `instanceAddressId` + `expectedRevision` jako write-path authority.

## 3. Global API conventions

1. Base path: `/api/v1`.
2. Auth: `Authorization: Bearer <token>` zgodnie z AccessGuard.
3. Request correlation:
- inbound: `x-request-id` (optional),
- outbound: `x-request-id` zawsze zwrocone.
4. Response envelope:

```ts
interface SuccessEnvelope<T> {
  contractVersion: string;
  requestId: string;
  data: T;
}

interface ErrorEnvelope {
  contractVersion: string;
  requestId: string;
  error: {
    code: string;
    message: string;
    details: Array<{ path: string; reason: string }>;
    retryable: boolean;
  };
}
```

5. Datetime: ISO-8601 UTC (`2026-05-24T12:00:00.000Z`).
6. Version tokeny i ID fields sa case-sensitive.

## 4. Resource model

## 4.1 Pipeline type
- `placeable`
- `creature`
- `area`

## 4.2 Identifiers

1. `jobId` (public API id):
- format: `prc_<ulid>`
- przyklad: `prc_01JY0Q4T8X4A9J6M1C7D2F3G4H`

2. `jobKey` (deterministic processing identity, internal/public-read):
- format: `sha256(canonicalStartRequest + pipelineType + sourceFingerprint + policyRev + toolchainRev)`
- stable dla tego samego logic input.

3. `idempotencyKey` (client supplied):
- HTTP header `Idempotency-Key`
- max 128 chars, ASCII visible, case-sensitive.

## 4.3 Job status model

`job.status` enum:
- `queued`
- `running`
- `retrying`
- `completed`
- `completed_with_drift`
- `failed`
- `cancelled`

`job.currentStage` enum:
- `ingest`
- `parser`
- `enrichment`
- `publish`
- `apply`

Terminal statuses:
- `completed`
- `completed_with_drift`
- `failed`
- `cancelled`

## 5. Idempotency contract

## 5.1 Routes requiring `Idempotency-Key`
1. `POST /api/v1/processing/placeable`
2. `POST /api/v1/processing/creature`
3. `POST /api/v1/processing/area`
4. `POST /api/v1/processing/{type}/{jobId}/apply`

## 5.2 Idempotency storage key

Canonical uniqueness scope:
- `actorId` (session user),
- `routeTemplate`,
- `pipelineType`,
- `idempotencyKey`.

Stored fields:
- `requestFingerprint` (sha256 canonical JSON body),
- `responseSnapshot` (status + envelope payload),
- `jobId`,
- `expiresAt`.

## 5.3 Behavior

1. Same `Idempotency-Key` + same `requestFingerprint`:
- return previously created response snapshot,
- add response header `x-idempotency-replayed: true`.

2. Same `Idempotency-Key` + different `requestFingerprint`:
- `409 PIPELINE_IDEMPOTENCY_KEY_REUSED`, `retryable=false`.

3. Missing key on required route:
- `422 PIPELINE_IDEMPOTENCY_KEY_REQUIRED`, `retryable=false`.

4. Recommended retention TTL:
- `>= 24h` (recommended `72h` for async jobs).

## 6. Endpoint contract

## 6.1 POST `/api/v1/processing/{type}` (start job)

Auth (R10 baseline):
1. `placeable`: role `builder|admin`, permission `scene.edit`.
2. `creature`: role `dm|admin`, permission `dm.spawn_creature`.
3. `area`: role `builder|admin`, permission `scene.edit`.

Common request body:

```ts
interface StartProcessingRequestBase {
  sourceContext: {
    areaResref: string;
    moduleSourceFingerprint?: string;
    sourcePolicy?: "DECOMPILED_PRIMARY" | "DECOMPILED_ONLY" | "PACKED_SYNC_REQUIRED";
    runtimeProfile?: "xoreos-nwn" | "xoreos-nwn2";
  };
  execution: {
    validationMode?: "warn" | "strict";
    dryRun?: boolean;
    timeoutMs?: number;
    priority?: "interactive" | "batch";
  };
  expectedRevision?: string;
}
```

Type-specific `target`:

```ts
interface StartPlaceableProcessingRequest extends StartProcessingRequestBase {
  target: {
    instanceAddressId?: string; // np. placeable/Placeable List/17
    templateResRef?: string;
    transformDraft?: { x: number; y: number; z: number; bearing: number };
  };
}

interface StartCreatureProcessingRequest extends StartProcessingRequestBase {
  target: {
    gitIndex?: number;
    templateResRef?: string;
    spawnDraft?: { x: number; y: number; z: number; xOrientation: number; yOrientation: number };
  };
}

interface StartAreaProcessingRequest extends StartProcessingRequestBase {
  target: {
    includeLanes?: {
      tiles?: boolean;
      placeables?: boolean;
      doors?: boolean;
      creatures?: boolean;
      triggers?: boolean;
      waypoints?: boolean;
      sounds?: boolean;
      encounters?: boolean;
      stores?: boolean;
      environment?: boolean;
    };
    migrateLegacyObjects?: boolean;
  };
}
```

Start response (`202 Accepted` for fresh async run):

```ts
interface StartProcessingResponse {
  jobId: string;
  jobKey: string;
  pipelineType: "placeable" | "creature" | "area";
  status: "queued" | "running";
  polling: {
    statusUrl: string;
    previewUrl: string;
    applyUrl: string;
    recommendedPollAfterMs: number;
  };
  idempotency: {
    key: string;
    replayed: boolean;
  };
  createdAt: string;
}
```

Replay response:
1. Same key/fingerprint i job non-terminal: `202` + ten sam payload (`replayed=true`).
2. Same key/fingerprint i job terminal: `200` + final snapshot (`replayed=true`).

## 6.2 GET `/api/v1/processing/{type}` (list jobs)

Auth:
- role `viewer|builder|dm|admin`, permission `scene.read`.

Query:
- `status?`
- `areaResref?`
- `createdBy?`
- `limit` (1..100, default 20)
- `offset` (>=0, default 0)

Response:

```ts
interface ProcessingJobListItem {
  jobId: string;
  pipelineType: "placeable" | "creature" | "area";
  status: string;
  currentStage: string | null;
  areaResref: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface ProcessingJobListResponse {
  items: ProcessingJobListItem[];
  total: number;
  limit: number;
  offset: number;
}
```

## 6.3 GET `/api/v1/processing/{type}/{jobId}` (status)

Auth:
- role `viewer|builder|dm|admin`, permission `scene.read`.

Query:
- `include=summary|result|diagnostics|all` (default `summary`)
- `waitMs` (0..30000, default 0) for long-poll.

HTTP caching/polling headers:
1. Response header `ETag: W/"<jobVersion>"`.
2. Optional request header `If-None-Match`:
- if unchanged and `waitMs=0` -> `304`.
- if unchanged and `waitMs>0` -> server czeka do `waitMs` na update; jesli brak update -> `304`.

Response (`200`):

```ts
interface ProcessingJobStatusResponse {
  jobId: string;
  jobKey: string;
  pipelineType: "placeable" | "creature" | "area";
  status: "queued" | "running" | "retrying" | "completed" | "completed_with_drift" | "failed" | "cancelled";
  currentStage: "ingest" | "parser" | "enrichment" | "publish" | "apply" | null;
  progressPct: number; // 0..100
  attempt: number;
  maxAttempts: number;
  stageTimingsMs?: Partial<Record<"ingest" | "parser" | "enrichment" | "publish" | "apply", number>>;
  deterministic: {
    inputHash?: string;
    outputHash?: string;
    drift: boolean;
  };
  lock?: {
    scope: "source" | "module" | "area" | "template";
    waitMs: number;
    conflict: boolean;
  };
  result?: Record<string, unknown>;
  diagnostics?: Array<{ code: string; severity: "ERROR" | "WARN" | "INFO"; path?: string; message: string }>;
  error?: {
    code: string;
    message: string;
    details: Array<{ path: string; reason: string }>;
    retryable: boolean;
  };
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  jobVersion: number;
}
```

## 6.4 GET `/api/v1/processing/{type}/{jobId}/preview`

Auth:
- role `viewer|builder|dm|admin`, permission `asset.preview`.

Behavior:
1. Jesli preview gotowy -> `200`.
2. Jesli job nie dostarczyl preview lane -> `409 PIPELINE_PREVIEW_NOT_READY`.

Response:

```ts
interface ProcessingPreviewResponse {
  jobId: string;
  pipelineType: "placeable" | "creature" | "area";
  preview: {
    manifestUrl?: string;
    sceneUrl?: string;
    expiresAt?: string;
  };
  diagnosticsSummary: { ERROR: number; WARN: number; INFO: number };
}
```

## 6.5 POST `/api/v1/processing/{type}/{jobId}/apply`

Auth:
1. `placeable`: role `builder|admin`, permission `asset.place`.
2. `creature`: role `dm|admin`, permission `dm.spawn_creature`.
3. `area`: role `builder|admin`, permission `asset.place`.

Headers:
- `Idempotency-Key` required.

Request:

```ts
interface ApplyProcessingResultRequest {
  expectedRevision: string;
  dryRun?: boolean;
  writePolicy?: {
    requireBackup?: boolean;
    allowNoOp?: boolean;
  };
}
```

Response (`200` or `202` when async apply is configured):

```ts
interface ApplyProcessingResultResponse {
  jobId: string;
  apply: {
    saveOutcome: "applied" | "no_change" | "blocked";
    revisionBefore: string;
    revisionAfter: string;
    revisionUnchanged: boolean;
    backupCreated: boolean;
    backupId?: string;
    changedBytes?: number;
    writeBlockedReason?: "missing_revision" | "stale_revision" | "validation_error";
  };
  diagnostics: Array<{ code: string; severity: "ERROR" | "WARN" | "INFO"; message: string }>;
  idempotency: { key: string; replayed: boolean };
}
```

## 6.6 DELETE `/api/v1/processing/{type}/{jobId}`

Auth:
1. `placeable|area`: role `builder|admin`, permission `asset.delete`.
2. `creature`: role `dm|admin`, permission `dm.spawn_creature` (current R10 gap policy).

Query:
- `mode=cancel|delete` (default `cancel`).

Behavior:
1. `cancel`: request cancellation for non-terminal jobs.
2. `delete`: remove stored job/result metadata when allowed by retention policy.

Response:

```ts
interface DeleteOrCancelProcessingJobResponse {
  jobId: string;
  mode: "cancel" | "delete";
  status: "cancelled" | "deleted" | "already_terminal";
}
```

## 7. Status polling contract

1. Recommended client loop:
- first poll after `recommendedPollAfterMs` from start response,
- then dynamic backoff: `1s -> 2s -> 3s` (cap 5s),
- stop on terminal status.

2. Server hint header:
- `Retry-After` optional on `202`/`409 PIPELINE_PREVIEW_NOT_READY`/`429`.

3. Terminal-state guarantee:
- once terminal, `status` is immutable,
- `completedAt` must be present,
- `error` must be present for `failed`.

4. `jobVersion` monotonic:
- each status mutation increments `jobVersion` by 1,
- supports `ETag`/`If-None-Match` polling.

## 8. Error contract and codes

## 8.1 Mandatory envelope
Kazdy non-2xx response zwraca `ErrorEnvelope` zgodny z `AppException`.

## 8.2 Canonical codes for processing API

| Code | HTTP | retryable | Notes |
|---|---:|---:|---|
| `VALIDATION_FAILED` | 422 | false | HTTP schema/DTO parse error. |
| `UNAUTHORIZED` | 401 | false | Missing/invalid bearer token. |
| `INVALID_SESSION` | 401 | false | Expired/invalid session. |
| `FORBIDDEN_ROLE` | 403 | false | Role denied. |
| `FORBIDDEN_PERMISSION` | 403 | false | Permission denied. |
| `PIPELINE_IDEMPOTENCY_KEY_REQUIRED` | 422 | false | Missing `Idempotency-Key` on required route. |
| `PIPELINE_IDEMPOTENCY_KEY_REUSED` | 409 | false | Same key, different payload fingerprint. |
| `PIPELINE_JOB_NOT_FOUND` | 404 | false | Unknown `jobId`. |
| `PIPELINE_JOB_STATE_CONFLICT` | 409 | false | Illegal transition (`apply` before completion, cancel after terminal, etc.). |
| `PIPELINE_PREVIEW_NOT_READY` | 409 | false | Preview lane unavailable yet. |
| `PIPELINE_APPLY_REVISION_CONFLICT` | 409 | false | `expectedRevision` stale/mismatch. |
| `PIPELINE_PARSE_STRICT_BLOCKED` | 422 | false | Strict parse gate blocked job. |
| `PIPELINE_VALIDATION_PARITY_FAILED` | 422 | false | Strict parity gate failed. |
| `PIPELINE_SOURCE_LOCK_CONFLICT` | 409 | true | Lock held by another actor/job. |
| `PIPELINE_LOCK_TIMEOUT` | 504 | true | Lock wait timeout. |
| `PIPELINE_DEPENDENCY_UNAVAILABLE` | 503 | true | Transient upstream/storage failure. |
| `PIPELINE_DEPENDENCY_TIMEOUT` | 504 | true | Upstream timeout. |
| `PIPELINE_RATE_LIMITED` | 429 | true | Backpressure/rate limiting. |
| `PIPELINE_RETRY_EXHAUSTED` | 503 | false | Worker exhausted retries for this request. |
| `PIPELINE_DETERMINISM_DRIFT` | 500 | false | Completed output drifted from baseline. |

## 8.3 `details.path` conventions

1. Start request validation:
- `sourceContext.areaResref`, `execution.validationMode`, `target.instanceAddressId`.

2. Job lifecycle:
- `jobId`, `job.status`, `job.currentStage`.

3. Revision gate:
- `expectedRevision`, `actualRevision`.

4. Parser/validation domains:
- `parse.<list>[<index>]`, `validation.tileListCardinality`, `validation.parity`.

## 9. Backward compatibility and migration notes

1. Contract does not change existing envelope shape (`contractVersion`, `requestId`, `data|error`).
2. Processing endpoints are additive (`/api/v1/processing/*`) and do not break current `areas/catalog/runtime-settings` contracts.
3. `expectedRevision` remains mandatory on mutating apply paths (reverse parity requirement).
4. `instanceAddressId` remains canonical write target bridge for object-level apply operations.

## 10. Minimal acceptance matrix (R63)

1. `POST /processing/{type}` with same `Idempotency-Key` and same body returns same `jobId`.
2. `POST /processing/{type}` with same key but different body returns `409 PIPELINE_IDEMPOTENCY_KEY_REUSED`.
3. `GET /processing/{type}/{jobId}` supports polling with `ETag/If-None-Match` and stable terminal state.
4. `POST /processing/{type}/{jobId}/apply` enforces `expectedRevision` and returns typed revision metadata.
5. `DELETE /processing/{type}/{jobId}?mode=cancel` transitions non-terminal jobs to `cancelled` or returns lifecycle conflict.
6. Error responses always conform to `ErrorEnvelope` with deterministic `code/status/retryable` mapping.
7. Auth for each endpoint matches processing authorization matrix R10.

## 11. Decision summary

1. One shared processing API shape for all three families (`placeable/creature/area`) with family-specific `target` payloads.
2. Public `jobId` + deterministic `jobKey` + required `Idempotency-Key` on mutating POST routes.
3. Polling-first async contract (`GET status`) with `ETag` support and explicit terminal statuses.
4. `apply` remains revision-gated (`expectedRevision`) and returns writeback metadata required by reverse-first workflow.
5. Error taxonomy stays inside existing backend `ErrorEnvelope` with canonical `PIPELINE_*` codes.
