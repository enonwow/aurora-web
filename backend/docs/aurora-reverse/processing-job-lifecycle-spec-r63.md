# Processing Job Lifecycle Spec R63 (Agent R1)

Data: 2026-05-24  
Status: Draft for backend processing contract  
Zakres: lifecycle jobow processingu (`enqueue/start/progress/complete/fail/cancel/retry`) oraz kontrakt statusow API dla Aurora Reverse (`placeable`, `creature`, `area`, `blob-ingest`).

## 1. Cel

Zdefiniowac jeden, deterministyczny lifecycle joba processingu, ktory:
1. Jest zgodny z patternami reverse (`manifest-first`, `revision gate`, `source lock`, `preserve-first`).
2. Rozdziela status top-level joba od statusu etapu (phase), aby pokryc zarowno pipeline area/creature/placeable, jak i blob ingest.
3. Zachowuje istniejacy kontrakt API bledow (`AppException/ErrorEnvelope`) i semantyke `retryable`.
4. Wspiera operacyjne use-case: cancel podczas pracy, retry automatyczny/manualny, restart-safe resume, conflict handling.

## 2. Evidence i use-cases (Aurora Reverse)

Bazowe zrodla:
1. `C:\Projects\aurora-web-backend\backend\docs\aurora-reverse\blob-ingest-pipeline-spec-r63.md`
2. `C:\Projects\aurora-web-backend\backend\docs\aurora-reverse\processing-error-taxonomy-spec-r63.md`
3. `C:\Projects\aurora-web-backend\backend\docs\aurora-reverse\area-composition-spec-r63.md`
4. `C:\Projects\aurora-web-backend\backend\docs\aurora-reverse\are-git-validation-spec-r63.md`
5. `C:\Projects\aurora-web-backend\backend\docs\aurora-reverse\source-lists-2da-tlk-spec-r63.md`
6. `C:\Projects\aurora-web-backend\backend\docs\aurora-reverse\hak-resolution-spec-r63.md`
7. `C:\Projects\aurora-web-backend\backend\docs\standards\processing-pipeline-errors-and-validation.md`
8. `C:\Projects\aurora-web-backend\backend\docs\standards\processing-pipeline-observability-slo-agent-r15.md`

Kluczowe use-cases, ktore lifecycle musi pokryc:
1. Deterministyczny enqueue/replay po `job_key` (idempotencja).
2. Resume po restarcie workera z checkpointu i lease takeover.
3. Policy-aware walidacja `strict|warn|audit` (to samo naruszenie -> inny final status).
4. Rozroznienie hard-fail (`P0/required`) vs preserve-first degrade (`P1/P2/optional`).
5. Revision conflict (`expected_revision` vs `actual_revision`) i kontrolowany `rebase-and-retry`.
6. Source-lock conflicts i timeouty jako retryable.
7. Determinism drift jako odrebny final outcome (`completed_with_drift`).

## 3. Canonical model joba

## 3.1 Identity i idempotencja

1. `jobId`: techniczny identyfikator (UUID/ULID) pojedynczego runu.
2. `jobKey`: identyfikator logiczny (idempotency key), np. `sha256(source_fingerprint + profile + toolchain_rev + policy_rev)`.
3. Regula:
- ten sam `jobKey` + ten sam payload semantyczny nie tworzy nowego logicznego joba,
- replay zwraca istniejacy job albo nowy `attempt` tego samego joba (zaleznie od stanu).

## 3.2 Top-level status API

Dozwolone `status`:
1. `queued`
2. `running`
3. `cancelling`
4. `completed`
5. `completed_with_drift`
6. `failed`
7. `cancelled`

Terminalne:
1. `completed`
2. `completed_with_drift`
3. `failed`
4. `cancelled`

Nieterminalne:
1. `queued`
2. `running`
3. `cancelling`

## 3.3 Phase (etap pipeline)

`phase` jest granularnym postepem wewnatrz `running/cancelling`:
1. `enqueue`
2. `acquire_lease`
3. `resolve_sources`
4. `decompile`
5. `parse`
6. `validate`
7. `transform`
8. `stage_manifest`
9. `sync`
10. `publish`
11. `finalize`

Uwagi:
1. Nie kazdy pipeline uzywa wszystkich faz.
2. Dla kompatybilnosci z ingest mozna dodatkowo emitowac `legacyPhaseStatus` (`queued|running|staged|syncing|committed|failed|aborted`).

## 4. Lifecycle state machine

## 4.1 Przejscia kanoniczne

| Event | From | To | Warunek | Uwagi |
|---|---|---|---|---|
| `enqueue` | brak joba | `queued` | payload poprawny | Tworzy attempt=1. |
| `start` | `queued` | `running` | worker CAS + lease acquired | Ustawia `startedAt`, `leaseOwner`. |
| `progress` | `running` | `running` | lease valid | Aktualizuje `phase`, heartbeat, progress. |
| `complete` | `running` lub `cancelling` | `completed` | brak driftu i brak hard fail | Moze zawierac WARN diagnostics. |
| `complete_with_drift` | `running` | `completed_with_drift` | drift detected | Semantyka failure user-visible (SLO). |
| `fail_non_retryable` | `running` | `failed` | `retryable=false` | Error canonical z taxonomy. |
| `fail_retryable_schedule` | `running` | `queued` | `retryable=true` i `attempt < maxAttempts` | Retry auto z backoff+jitter. |
| `fail_retry_exhausted` | `running` | `failed` | `retryable=true` i limit osiagniety | `code=PIPELINE_RETRY_EXHAUSTED`. |
| `cancel_request_queued` | `queued` | `cancelled` | cancel accepted | Cancel natychmiastowy. |
| `cancel_request_running` | `running` | `cancelling` | cancel accepted | Cooperative cancel (checkpoint-safe). |
| `cancel_ack` | `cancelling` | `cancelled` | worker zatrzymal flow | Ustawia `cancelledAt`. |
| `retry_manual` | `failed` lub `cancelled` | `queued` | retry endpoint accepted | Tworzy nowy attempt. |

## 4.2 Przejscia niedozwolone

1. `start` dla statusu != `queued` -> `409 PIPELINE_JOB_STATE_CONFLICT`.
2. `progress/complete/fail` bez aktywnego lease owner -> `409 PIPELINE_SOURCE_LOCK_CONFLICT` lub `409 PIPELINE_JOB_STATE_CONFLICT`.
3. `cancel` dla `completed/completed_with_drift/failed` -> `409 PIPELINE_JOB_STATE_CONFLICT`.
4. `retry` dla `queued/running/cancelling` -> `409 PIPELINE_JOB_STATE_CONFLICT`.

## 5. Semantyka retry/cancel

## 5.1 Retry automatyczny

1. Retry uruchamiac tylko dla `error.retryable=true`.
2. Domyslny backoff: `1s, 2s, 4s, 8s ...`, max delay `60s`, z jitter.
3. Retry liczyc per `attempt` joba i per `phase` (dla telemetry/diagnostics).
4. Po wyczerpaniu limitu: `failed` + `PIPELINE_RETRY_EXHAUSTED`.

## 5.2 Retry manualny

1. Endpoint retry moze wznowic tylko job terminalny (`failed`, opcjonalnie `cancelled`).
2. Retry manualny tworzy nowy attempt tego samego `jobId` lub nowy `jobId` z `parentJobId` (implementacyjnie do wyboru), ale zachowuje wspolny `jobKey`.
3. Dla revision conflict dopuszczony wariant `rebase-and-retry` (nowe `expectedRevision`, ten sam logical workload).

## 5.3 Cancel

1. Cancel jest cooperative i checkpoint-aware.
2. Jesli job jest przed punktem nieodwracalnym zapisu: worker musi zatrzymac flow i przejsc do `cancelled`.
3. Jesli job jest w krotkiej sekcji nieprzerywalnej, moze zakonczyc sie `completed`/`failed`; API musi to jawnie raportowac (`cancelRequested=true`, `cancelHonored=false`).

## 6. Kontrakt statusow API

## 6.1 Error envelope (bez zmian)

```json
{
  "error": {
    "code": "PIPELINE_JOB_STATE_CONFLICT",
    "message": "Cannot retry a running job.",
    "details": [
      { "path": "job.status", "reason": "expected terminal status, got running" }
    ],
    "retryable": false
  }
}
```

## 6.2 DTO odpowiedzi statusowej

```ts
type JobStatus =
  | "queued"
  | "running"
  | "cancelling"
  | "completed"
  | "completed_with_drift"
  | "failed"
  | "cancelled";

type JobPhase =
  | "enqueue"
  | "acquire_lease"
  | "resolve_sources"
  | "decompile"
  | "parse"
  | "validate"
  | "transform"
  | "stage_manifest"
  | "sync"
  | "publish"
  | "finalize";

interface ProcessingJobStatusDto {
  jobId: string;
  jobKey: string;
  pipelineType: "placeable" | "creature" | "area" | "blob_ingest";
  status: JobStatus;
  phase: JobPhase;

  attempt: number;
  maxAttempts: number;
  retryCount: number;
  retryExhausted: boolean;
  nextRetryAt?: string;

  progress: {
    percent: number;              // 0..100
    currentStep?: string;
    stepsCompleted?: number;
    stepsTotal?: number;
    lastHeartbeatAt?: string;
  };

  policy: {
    mode: "strict" | "warn" | "audit";
  };

  lock?: {
    scope?: "source" | "module" | "area" | "template";
    keyHash?: string;
    ownerId?: string;
    leaseExpiresAt?: string;
    waitMs?: number;
  };

  revision?: {
    expectedRevision?: string;
    actualRevision?: string;
    conflict: boolean;
  };

  diagnosticsSummary: {
    errorCount: number;
    warnCount: number;
    infoCount: number;
  };

  cancelRequested: boolean;
  cancelHonored?: boolean;

  lastError?: {
    code: string;
    message: string;
    retryable: boolean;
    details?: Array<{ path: string; reason: string }>;
  };

  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  updatedAt: string;
}
```

## 6.3 HTTP kontrakt endpointow lifecycle

1. `POST /v1/processing/jobs` (enqueue)
- `202 Accepted`: nowy job w `queued`.
- `200 OK`: idempotent replay tego samego `jobKey`.
- `409 Conflict`: `PIPELINE_JOB_ALREADY_EXISTS` (ten sam klucz, inny payload semantyczny).
- `422 Unprocessable Entity`: `VALIDATION_FAILED` / `PIPELINE_INPUT_INVALID`.

2. `GET /v1/processing/jobs/{jobId}` (status)
- `200 OK`: zwraca `ProcessingJobStatusDto`.
- `404 Not Found`: `PIPELINE_JOB_NOT_FOUND`.

3. `POST /v1/processing/jobs/{jobId}:cancel`
- `202 Accepted`: przejscie `running -> cancelling` lub `queued -> cancelled`.
- `200 OK`: job juz `cancelled` (idempotent cancel).
- `409 Conflict`: status terminalny inny niz `cancelled`.

4. `POST /v1/processing/jobs/{jobId}:retry`
- `202 Accepted`: przejscie `failed/cancelled -> queued` (nowy attempt).
- `409 Conflict`: job nie jest terminalny retry-eligible.
- `404 Not Found`: `PIPELINE_JOB_NOT_FOUND`.

## 7. Status code mapping per use-case

| Use-case | Final status | Canonical code | HTTP | retryable |
|---|---|---|---:|---:|
| P0 source missing (required) | `failed` | `PIPELINE_DECOMP_INPUT_NOT_FOUND` / `P0_MISSING_SOURCE` | 404/422 | false |
| P1/P2 source missing (optional) | `completed` | diag only (`P1_P2_UNRESOLVED_REFERENCE`) | 200 | false |
| Strict validation gate blocked | `failed` | `PIPELINE_PARSE_STRICT_BLOCKED` / `PIPELINE_VALIDATION_*` | 422 | false |
| Warn policy degradacja | `completed` | diag only (`WARN`) | 200 | false |
| Lock conflict/timeout (transient) | `queued` (auto retry) lub `failed` (exhausted) | `PIPELINE_SOURCE_LOCK_CONFLICT` / `PIPELINE_LOCK_TIMEOUT` | 409/504 | true |
| Dependency outage/timeout | `queued` (auto retry) lub `failed` (exhausted) | `PIPELINE_DEPENDENCY_UNAVAILABLE` / `PIPELINE_DECOMP_TIMEOUT` | 503/504 | true |
| Revision conflict (`latest` CAS) | `failed` | `PIPELINE_JOB_STATE_CONFLICT` / `failed_conflict` | 409 | false |
| Rebase-and-retry po konflikcie | `queued` | brak nowego bledu (akcja operatora) | 202 | n/a |
| Determinism drift | `completed_with_drift` | `PIPELINE_DETERMINISM_DRIFT` (diagnostic/event) | 200/500* | false |
| User cancel | `cancelled` | `PIPELINE_STAGE_CANCELLED` (opcjonalnie) | 200/202 | false |

`*` Dla async polling rekomendowany `200` z `status=completed_with_drift`; dla sync request/response dopuszczalne `500` z kodem drift.

## 8. Zdarzenia observability (wymagane)

Minimalny strumien eventow:
1. `pipeline.job.enqueued`
2. `pipeline.job.started`
3. `pipeline.job.progress`
4. `pipeline.retry.scheduled`
5. `pipeline.retry.exhausted`
6. `pipeline.job.cancel_requested`
7. `pipeline.job.cancelled`
8. `pipeline.job.completed`
9. `pipeline.job.completed_with_drift`
10. `pipeline.job.failed`

Wspolne pola: `requestId`, `jobId`, `jobKey`, `pipelineType`, `phase`, `attempt`, `maxAttempts`, `error.code`, `error.retryable`, `durationMs`, `pipelineVersion`.

## 9. Invariants i acceptance

1. Przejscia statusow sa CAS-owe i atomowe (brak podwojnych start/completion).
2. `status` jest monotoniczny semantycznie: nieterminalny -> terminalny; jedyny wyj¹tek to retry (`running -> queued` nowy attempt).
3. `retryable=true` nigdy nie wystarcza samodzielnie do nieskonczonego retry (zawsze limit attemptow).
4. `strict|warn|audit` zmienia wynik businessowy (fail vs complete), ale nie zmienia natury `retryable` bledu.
5. `completed_with_drift` jest raportowane jako osobny final status i osobny sygnal SLO.
6. `cancel` i `retry` sa idempotentne na poziomie API.
7. Status API zawsze zwraca komplet: `status`, `phase`, `attempt`, `retryCount`, `diagnosticsSummary`, `timestamps`.
