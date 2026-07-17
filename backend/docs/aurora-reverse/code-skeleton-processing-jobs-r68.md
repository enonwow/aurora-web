# Code Skeleton - Processing Jobs API/Lifecycle (R68, Agent C6)

Data: 2026-05-24  
Status: Code skeleton (application/domain/adapters)  
Zakres: szkic implementacji Processing Jobs API + lifecycle (`enqueue/status/cancel/retry`) z modelem stanu joba i retry strategy.

## 1. Cel i zalozenia

Ten dokument definiuje minimalny, implementowalny szkielet dla backendowego modulu processing jobs w architekturze hexagonalnej:
1. `adapters/inbound/http` - kontrakty i kontrolery API.
2. `application` - use-case orchestration i lifecycle engine.
3. `domain` - state machine joba, retry policy, reguly biznesowe.
4. `adapters/outbound/*` - repozytoria, kolejka/worker, telemetry.

Szkielet jest spojny z dokumentami R63-R67 (processing lifecycle, API shape, error taxonomy, ADR mapping) i odpowiada zadaniu ADR-66-05 + ADR-66-06 na poziomie implementacyjnym.

## 2. Proponowany uklad modulow i plikow

```text
backend/src/modules/processing/
  processing.module.ts

  adapters/
    inbound/
      http/
        processing.controller.ts
        processing-jobs.controller.ts
        processing.schemas.ts
        dto/
          enqueue-processing.request.dto.ts
          processing-job-status.response.dto.ts
          processing-job-accepted.response.dto.ts
    outbound/
      postgres/
        processing-job.repository.ts
        processing-job-attempt.repository.ts
        processing-idempotency.repository.ts
        processing-job-event.repository.ts
      queue/
        processing-job-dispatcher.adapter.ts
        processing-job-worker.adapter.ts
      observability/
        processing-observability.adapter.ts

  application/
    processing-command.service.ts
    processing-query.service.ts
    processing-lifecycle.engine.ts
    retry-scheduler.service.ts
    job-lease.service.ts
    idempotency.service.ts
    contracts/
      processing-contracts.mapper.ts
    ports/
      processing-job-repository.port.ts
      processing-job-attempt-repository.port.ts
      processing-idempotency-repository.port.ts
      processing-event-log.port.ts
      processing-dispatcher.port.ts
      processing-observability.port.ts
      processing-clock.port.ts
      processing-lease.port.ts

  domain/
    job-status.state-machine.ts
    job-status.types.ts
    job-phase.types.ts
    retry.policy.ts
    retry.types.ts
    processing-error.types.ts
    job-identity.ts
    job-keys.ts
```

## 3. Model domenowy joba

## 3.1 Status i phase

```ts
// domain/job-status.types.ts
export const JOB_STATUS = {
  QUEUED: "queued",
  RUNNING: "running",
  CANCELLING: "cancelling",
  COMPLETED: "completed",
  COMPLETED_WITH_DRIFT: "completed_with_drift",
  FAILED: "failed",
  CANCELLED: "cancelled"
} as const;

export type JobStatus = (typeof JOB_STATUS)[keyof typeof JOB_STATUS];

export function isTerminalStatus(status: JobStatus): boolean {
  return (
    status === JOB_STATUS.COMPLETED ||
    status === JOB_STATUS.COMPLETED_WITH_DRIFT ||
    status === JOB_STATUS.FAILED ||
    status === JOB_STATUS.CANCELLED
  );
}
```

```ts
// domain/job-phase.types.ts
export const JOB_PHASE = {
  ACCEPTED: "accepted",
  INGEST: "ingest",
  PARSE: "parse",
  ENRICH: "enrich",
  PUBLISH: "publish",
  FINALIZE: "finalize"
} as const;

export type JobPhase = (typeof JOB_PHASE)[keyof typeof JOB_PHASE];
```

## 3.2 Aggregate snapshot

```ts
// domain/job-identity.ts
export interface ProcessingJobSnapshot {
  jobId: string;                 // prc_<ulid>
  jobKey: string;                // deterministic hash
  pipelineType: "placeable" | "creature" | "area";

  status: JobStatus;
  phase: JobPhase;
  transitionVersion: number;     // CAS guard

  attempt: number;
  maxAttempts: number;
  retryCount: number;
  nextRetryAt: string | null;

  cancelRequested: boolean;
  cancelHonored: boolean;

  expectedRevision: number | null;
  actualRevision: number | null;

  percent: number | null;
  currentStep: string | null;
  stepsCompleted: number;
  stepsTotal: number;

  leaseOwner: string | null;
  leaseExpiresAt: string | null;
  lastHeartbeatAt: string | null;

  lastErrorCode: string | null;
  lastErrorRetryable: boolean | null;
  lastErrorMessage: string | null;

  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  updatedAt: string;
}
```

## 4. State machine job lifecycle

## 4.1 Dozwolone przejscia

```ts
// domain/job-status.state-machine.ts
export type JobTransitionAction =
  | "enqueue"
  | "start"
  | "progress"
  | "cancel_request"
  | "cancel_ack"
  | "complete"
  | "complete_with_drift"
  | "fail"
  | "retry_manual"
  | "retry_auto";
```

Tabela przejsc:
1. `null -> queued` (`enqueue`)
2. `queued -> running` (`start`)
3. `running -> running` (`progress`)
4. `queued -> cancelled` (`cancel_request` immediate)
5. `running -> cancelling` (`cancel_request` cooperative)
6. `cancelling -> cancelled` (`cancel_ack`)
7. `running|cancelling -> completed` (`complete`)
8. `running -> completed_with_drift` (`complete_with_drift`)
9. `running|cancelling -> failed` (`fail`)
10. `failed|cancelled -> queued` (`retry_manual`)
11. `running -> queued` (`retry_auto` tylko po retryable fail i attempt+1)

Niedozwolone:
1. `retry_*` z `queued|running|cancelling|completed|completed_with_drift`.
2. `cancel_request` z `completed|completed_with_drift|failed|cancelled`.
3. `start` bez lease albo z niespojnym `transitionVersion`.

## 4.2 CAS i atomowosc

Kazda zmiana lifecycle powinna byc warunkowa:
1. `WHERE job_id = :jobId AND transition_version = :expectedVersion`.
2. Przy sukcesie: `transition_version = transition_version + 1`, `updated_at = now()`.
3. Przy 0 zaktualizowanych rekordow: konflikt wspolbieznosci (`PIPELINE_JOB_STATE_CONFLICT`).

Minimalny interfejs portu:

```ts
// application/ports/processing-job-repository.port.ts
export interface TransitionRequest {
  jobId: string;
  expectedVersion: number;
  action: JobTransitionAction;
  patch: Partial<ProcessingJobSnapshot>;
  nowIso: string;
}

export interface ProcessingJobRepositoryPort {
  insert(snapshot: ProcessingJobSnapshot): Promise<void>;
  findByJobId(jobId: string): Promise<ProcessingJobSnapshot | null>;
  findByJobKey(jobKey: string): Promise<ProcessingJobSnapshot | null>;
  transition(request: TransitionRequest): Promise<"applied" | "conflict">;
}
```

## 5. Retry strategy (bounded, deterministic)

## 5.1 Retry policy model

```ts
// domain/retry.types.ts
export interface RetryPolicyConfig {
  maxAttempts: number;          // np. 5
  baseDelayMs: number;          // np. 1000
  maxDelayMs: number;           // np. 60000
  jitterRatio: number;          // np. 0.2
}

export interface RetryDecision {
  allowed: boolean;
  reason:
    | "retryable"
    | "not_retryable"
    | "attempt_limit_reached"
    | "terminal_status"
    | "cancel_requested";
  nextRetryAt: string | null;
  nextAttempt: number | null;
}
```

## 5.2 Reguly retry

1. Auto-retry tylko gdy blad ma `retryable=true`.
2. Auto-retry tylko gdy `attempt < maxAttempts`.
3. Brak auto-retry gdy `cancelRequested=true`.
4. Brak auto-retry dla bledow walidacyjnych/kontraktowych (`4xx class` domenowo).
5. Manual retry tylko ze stanow terminalnych `failed|cancelled`.
6. Po wyczerpaniu prob: status `failed`, kod `PIPELINE_RETRY_EXHAUSTED`.

## 5.3 Algorytm backoff + jitter

```ts
// domain/retry.policy.ts
export function computeBackoffMs(
  retryCount: number,
  config: RetryPolicyConfig,
  random01: number
): number {
  const exponent = Math.max(0, retryCount);
  const raw = config.baseDelayMs * Math.pow(2, exponent);
  const capped = Math.min(raw, config.maxDelayMs);

  const jitterAmplitude = Math.floor(capped * config.jitterRatio);
  const jitter = Math.floor((random01 * 2 - 1) * jitterAmplitude);

  return Math.max(config.baseDelayMs, capped + jitter);
}
```

Rekomendacja operacyjna:
1. Domyslne `maxAttempts=5`.
2. Sekwencja (bez jitter): `1s,2s,4s,8s,16s` (cap do `60s`).
3. Jitter symetryczny `+-20%` dla rozproszenia burstu.

## 6. Application lifecycle orchestration

## 6.1 API command service

`processing-command.service.ts`:
1. `enqueue(request, auth, idempotencyKey)`.
2. `cancel(jobId, auth)`.
3. `retry(jobId, auth)`.
4. Delegacja do `ProcessingLifecycleEngine` + `IdempotencyService` + dispatcher.

Szkic sygnatur:

```ts
export class ProcessingCommandService {
  async enqueue(input: EnqueueCommand): Promise<EnqueueResult> {}
  async cancel(input: CancelCommand): Promise<ProcessingJobSnapshot> {}
  async retry(input: RetryCommand): Promise<ProcessingJobSnapshot> {}
}
```

## 6.2 Query service

`processing-query.service.ts`:
1. `getStatus(jobId)`.
2. mapowanie snapshot -> `ProcessingJobStatusResponseDto`.

## 6.3 Lifecycle engine

`processing-lifecycle.engine.ts` odpowiada za spojnosc przejsc i side-effecty:
1. `enqueue` tworzy rekord joba + attempt #1 + event.
2. `start` bierze lease i przechodzi do `running`.
3. `progress` odswieza heartbeat + progress.
4. `fail` zapisuje error i pyta `RetryPolicy` o auto-retry.
5. `cancel` ustawia `cancelRequested`; zaleznie od statusu robi immediate cancel lub `cancelling`.
6. `complete` domyka lifecycle i publikuje event terminalny.

Minimalna sekwencja workerowa:
1. dispatcher pobiera `queued`.
2. worker: `start` (CAS + lease).
3. worker wykonuje fazy pipeline i checkpoint.
4. przy bledzie: `fail` -> `retry_auto` lub terminal `failed`.
5. przy cancel flag: `cancel_ack`.
6. przy sukcesie: `complete` albo `complete_with_drift`.

## 7. Inbound HTTP skeleton

## 7.1 Endpoints

1. `POST /api/v1/processing/{type}`
2. `GET /api/v1/processing/jobs/{jobId}`
3. `POST /api/v1/processing/jobs/{jobId}:cancel`
4. `POST /api/v1/processing/jobs/{jobId}:retry`

## 7.2 Controller responsibilities

`processing.controller.ts`:
1. walidacja typu pipeline i payloadu.
2. wymagany `Idempotency-Key`.
3. zwrot `SuccessEnvelope` i kodu `202|200|409|422` wg semantyki.

`processing-jobs.controller.ts`:
1. status/cancel/retry.
2. mapowanie bledow domenowych na HTTP (`404`,`409`,`422`).

Szkic:

```ts
@Controller("processing")
export class ProcessingController {
  @Post(":type")
  async enqueue(...) {}
}

@Controller("processing/jobs")
export class ProcessingJobsController {
  @Get(":jobId")
  async status(...) {}

  @Post(":jobId:cancel")
  async cancel(...) {}

  @Post(":jobId:retry")
  async retry(...) {}
}
```

## 7.3 Idempotency flow (enqueue)

1. Sprawdz `(actorId, routeTemplate, pipelineType, idempotencyKey)`.
2. Jesli brak wpisu: atomowo zapisz key + request fingerprint + `jobId`.
3. Jesli wpis istnieje i fingerprint identyczny: replay (`200` + `x-idempotency-replayed: true`).
4. Jesli wpis istnieje i fingerprint inny: `409 PIPELINE_IDEMPOTENCY_KEY_REUSED`.

## 8. Outbound adapters skeleton

## 8.1 Postgres repositories

`adapters/outbound/postgres/*`:
1. `ProcessingJobRepository` - snapshot + transitions CAS.
2. `ProcessingJobAttemptRepository` - licznik prob, `nextRetryAt`, heartbeat lease.
3. `ProcessingIdempotencyRepository` - key scope + snapshot replay.
4. `ProcessingJobEventRepository` - append-only log zdarzen.

Minimalne tabele:
1. `processing_jobs`
2. `processing_job_attempts`
3. `processing_idempotency`
4. `processing_job_events`

## 8.2 Queue/worker adapters

1. `ProcessingJobDispatcherAdapter` - enqueue `jobId` do kolejki.
2. `ProcessingJobWorkerAdapter` - consumer; wywoluje `ProcessingLifecycleEngine`.

Wymagania:
1. lease renewal na progress checkpointach.
2. takeover po `leaseExpiresAt`.
3. dedupe worker execution przez CAS transition i attempt lock.

## 8.3 Observability adapter

`processing-observability.adapter.ts` emituje:
1. eventy: `processing.job.enqueued|started|progressed|failed|retried|cancelled|completed`.
2. metryki: latency per phase, retry_count, retry_exhausted_total, cancel_latency.
3. trace fields: `jobId`, `jobKey`, `attempt`, `pipelineType`, `status`, `phase`.

## 9. Modul DI (Nest)

Szkic `processing.module.ts`:
1. Rejestruje kontrolery HTTP.
2. Rejestruje serwisy application/domain.
3. Bindowanie tokenow portow na adaptery.

```ts
@Module({
  controllers: [ProcessingController, ProcessingJobsController],
  providers: [
    ProcessingCommandService,
    ProcessingQueryService,
    ProcessingLifecycleEngine,
    RetrySchedulerService,
    IdempotencyService,
    JobLeaseService,

    ProcessingJobRepository,
    ProcessingJobAttemptRepository,
    ProcessingIdempotencyRepository,
    ProcessingJobEventRepository,
    ProcessingJobDispatcherAdapter,
    ProcessingObservabilityAdapter,

    { provide: PROCESSING_JOB_REPOSITORY, useExisting: ProcessingJobRepository },
    { provide: PROCESSING_JOB_ATTEMPT_REPOSITORY, useExisting: ProcessingJobAttemptRepository },
    { provide: PROCESSING_IDEMPOTENCY_REPOSITORY, useExisting: ProcessingIdempotencyRepository },
    { provide: PROCESSING_EVENT_LOG, useExisting: ProcessingJobEventRepository },
    { provide: PROCESSING_DISPATCHER, useExisting: ProcessingJobDispatcherAdapter },
    { provide: PROCESSING_OBSERVABILITY, useExisting: ProcessingObservabilityAdapter }
  ]
})
export class ProcessingModule {}
```

## 10. Blad i kody domenowe (minimum)

W `domain/processing-error.types.ts`:
1. `PIPELINE_JOB_NOT_FOUND`
2. `PIPELINE_JOB_STATE_CONFLICT`
3. `PIPELINE_IDEMPOTENCY_KEY_REQUIRED`
4. `PIPELINE_IDEMPOTENCY_KEY_REUSED`
5. `PIPELINE_RETRY_EXHAUSTED`
6. `PIPELINE_CANCEL_NOT_ALLOWED`
7. `PIPELINE_RETRY_NOT_ALLOWED`

Kazdy blad powinien niesc:
1. `code`
2. `message`
3. `retryable`
4. `httpStatus`
5. `details`

## 11. Minimalny plan testow dla tego szkicu

## 11.1 Unit

1. `job-status.state-machine.spec.ts` - legal/illegal transitions + CAS expectations.
2. `retry.policy.spec.ts` - backoff, jitter bounds, attempt exhaustion.
3. `idempotency.service.spec.ts` - replay vs conflict.

## 11.2 Integration

1. `processing-job.repository.transition.integration.spec.ts` - atomowosc transition.
2. `retry-exhausted.integration.spec.ts` - terminal fail po limicie.
3. `lease-takeover.integration.spec.ts` - worker recovery po wygaslym lease.

## 11.3 E2E

1. `processing-api.e2e-spec.ts` - `enqueue/status` happy path.
2. `processing-jobs.e2e-spec.ts` - `cancel/retry` semantyka `200/202/409`.
3. `processing-idempotency.e2e-spec.ts` - duplicate key same payload vs different payload.

## 12. Kolejnosc implementacji (proponowana)

1. Domain core: `job-status.state-machine.ts`, `retry.policy.ts`, error types.
2. Application ports + services: command/query/lifecycle/idempotency.
3. Postgres outbound adapters i migracje tabel jobowych.
4. HTTP inbound adapters i DTO schemas.
5. Worker adapter + retry scheduler + lease renewal.
6. Observability adapter + integration/e2e tests.

Taka kolejnosc minimalizuje ryzyko regresji i pozwala szybko uruchomic pionowy fragment `enqueue -> worker start -> status`, a nastepnie domknac cancel/retry.
