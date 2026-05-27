# Implementation Slice 3 - Processing API + Jobs (R66, Agent D4)

Data: 2026-05-24  
Status: Implementation-ready plan  
Zakres: wdrozenie Processing API i lifecycle jobow (`enqueue/status/cancel/retry`) dla `placeable|creature|area` wraz z kontraktami DTO i observability.

## 1. Cel i rezultat Slice 3

Slice 3 domyka pionowy fragment backendu:
1. Publiczny kontrakt HTTP dla uruchamiania i obslugi jobow processingu.
2. Spojny state machine job lifecycle z idempotencja, cancel i retry.
3. Stabilne kontrakty danych `placeable`, `creature`, `area` na sciezce jobowej.
4. Telemetria i metryki, ktore umozliwiaja operacyjne utrzymanie i SLO.

Rezultat: klient moze deterministycznie uruchomic pipeline, sprawdzac status, anulowac i ponawiac, a backend zwraca jednolity envelope, statusy i diagnostyke z pelnym sladem observability.

## 2. Scope i granice

W scope:
1. `POST /api/v1/processing/{type}` (`type=placeable|creature|area`) - enqueue/start.
2. `GET /api/v1/processing/jobs/{jobId}` - status.
3. `POST /api/v1/processing/jobs/{jobId}:cancel` - cancel.
4. `POST /api/v1/processing/jobs/{jobId}:retry` - retry.
5. Persystencja jobow/attemptow/idempotencji/checkpointow.
6. DTO request/response dla `placeable/creature/area`.
7. Eventy, metryki, trace i dashboard compatibility window.

Poza scope:
1. Pelny writeback `apply` (osobny slice; tu tylko przygotowanie pol statusowych pod apply).
2. UI workflow i frontend orchestration.
3. Nowe lane parsera/dekompilacji (uzywamy istniejacych portow i spec R63).

## 3. Evidence i zaleznosci

Plan jest zgodny z:
1. `processing-api-shape-spec-r63.md`
2. `processing-job-lifecycle-spec-r63.md`
3. `processing-error-taxonomy-spec-r63.md`
4. `placeable-classification-spec-r63.md`
5. `creature-enrichment-spec-r63.md`
6. `area-composition-spec-r63.md`
7. `observability-event-taxonomy-spec-r63.md`
8. `implementation-backlog-r64.md` (pozycje 6, 7, 9, 11)

## 4. Architektura Slice 3

## 4.1 Komponenty

1. `ProcessingApiController`
- mapuje request HTTP -> commandy use-case.
- egzekwuje `Idempotency-Key` i walidacje payload.

2. `ProcessingJobService`
- tworzy i odczytuje joby.
- zarzadza przejsciami statusow (CAS/atomowosc).

3. `ProcessingLifecycleEngine`
- wykonuje `enqueue/start/progress/complete/fail/cancel/retry`.
- utrzymuje status top-level i `phase`.

4. `ProcessingContractsMapper`
- normalizuje DTO pipeline-specific (`placeable|creature|area`).
- mapuje diagnostics do kontraktu API.

5. `ProcessingObservabilityAdapter`
- emituje eventy lifecycle/stage/retry/lock/revision/drift.
- publikuje metryki i span attributes.

## 4.2 Persystencja (minimalny model)

1. `processing_jobs`
- `job_id` (PK, `prc_<ulid>`)
- `job_key` (deterministyczny hash)
- `pipeline_type` (`placeable|creature|area`)
- `status` (`queued|running|cancelling|completed|completed_with_drift|failed|cancelled`)
- `phase`
- `request_fingerprint`
- `source_fingerprint`
- `policy_mode` (`strict|warn|audit`)
- `expected_revision`, `actual_revision`
- `cancel_requested`, `cancel_honored`
- `created_at`, `updated_at`, `started_at`, `completed_at`
- `created_by_actor`

2. `processing_job_attempts`
- `job_id` + `attempt` (PK)
- `max_attempts`, `retry_count`, `next_retry_at`
- `lease_owner`, `lease_expires_at`, `last_heartbeat_at`
- `last_error_code`, `last_error_retryable`, `last_error_message`
- `diagnostics_summary_json`

3. `processing_idempotency`
- `actor_id`, `route_template`, `pipeline_type`, `idempotency_key` (unique scope)
- `request_fingerprint`
- `job_id`
- `response_snapshot_json`
- `expires_at`

4. `processing_job_events`
- append-only event log (debug/audit/rebuild metrics).
- `event_name`, `stage_group`, `stage`, `payload_json`, `occurred_at`.

## 5. HTTP kontrakt i zachowania

Wszystkie odpowiedzi pozostaja w `SuccessEnvelope/ErrorEnvelope`:
1. `contractVersion`
2. `requestId`
3. `data` albo `error`

## 5.1 Enqueue

Endpoint: `POST /api/v1/processing/{type}`

Wymagania:
1. `Idempotency-Key` header (required).
2. `type in {placeable,creature,area}`.
3. Canonical payload fingerprint.

Semantyka:
1. Nowy workload -> `202 Accepted`, `status=queued`, `attempt=1`.
2. Replay ten sam payload + ten sam key -> `200 OK`, zwrot snapshotu, header `x-idempotency-replayed: true`.
3. Reuse key z innym payload -> `409 PIPELINE_IDEMPOTENCY_KEY_REUSED`.
4. Brak key -> `422 PIPELINE_IDEMPOTENCY_KEY_REQUIRED`.

Response `data` (minimum):
1. `jobId`
2. `jobKey`
3. `pipelineType`
4. `status`
5. `phase`
6. `attempt`
7. `maxAttempts`

## 5.2 Status

Endpoint: `GET /api/v1/processing/jobs/{jobId}`

Semantyka:
1. Znaleziono job -> `200 OK`, pelny `ProcessingJobStatusDto`.
2. Brak joba -> `404 PIPELINE_JOB_NOT_FOUND`.

`ProcessingJobStatusDto` (minimum):
1. Identity: `jobId`, `jobKey`, `pipelineType`.
2. Lifecycle: `status`, `phase`, `attempt`, `maxAttempts`, `retryCount`, `nextRetryAt`.
3. Progress: `percent`, `currentStep`, `stepsCompleted`, `stepsTotal`, `lastHeartbeatAt`.
4. Concurrency: `lock.scope`, `lock.keyHash`, `lock.leaseExpiresAt`.
5. Revision: `expectedRevision`, `actualRevision`, `conflict`.
6. Diagnostics: `diagnosticsSummary`, `lastError`.
7. Cancel fields: `cancelRequested`, `cancelHonored`.
8. Timestamps: `createdAt`, `startedAt`, `completedAt`, `updatedAt`.

## 5.3 Cancel

Endpoint: `POST /api/v1/processing/jobs/{jobId}:cancel`

Semantyka:
1. `queued -> cancelled` natychmiast (`202` lub `200` idempotent).
2. `running -> cancelling` cooperative (`202`).
3. `cancelling` ponowne wywolanie -> `200` (idempotent).
4. `completed|completed_with_drift|failed` -> `409 PIPELINE_JOB_STATE_CONFLICT`.

Wymuszenia:
1. Worker sprawdza `cancelRequested` na granicach checkpointow.
2. Odpowiedz statusowa musi raportowac:
- `cancelRequested=true`
- `cancelHonored=true|false` po zamknieciu joba.

## 5.4 Retry

Endpoint: `POST /api/v1/processing/jobs/{jobId}:retry`

Semantyka:
1. Dopuszczone tylko dla `failed` i `cancelled`.
2. Tworzony jest nowy `attempt` tego samego `jobId` i tego samego `jobKey`.
3. Status przechodzi na `queued`.
4. Dla jobow nie-terminalnych -> `409 PIPELINE_JOB_STATE_CONFLICT`.

Retry policy:
1. Auto-retry tylko gdy `error.retryable=true`.
2. Backoff wyk: `1s,2s,4s,8s...`, max `60s`, jitter.
3. Po przekroczeniu `maxAttempts` -> `failed` + `PIPELINE_RETRY_EXHAUSTED`.

## 6. State machine implementation

## 6.1 Statusy

Nieterminalne:
1. `queued`
2. `running`
3. `cancelling`

Terminalne:
1. `completed`
2. `completed_with_drift`
3. `failed`
4. `cancelled`

## 6.2 Przejscia atomowe (CAS)

Dozwolone:
1. `enqueue`: `null -> queued`
2. `start`: `queued -> running`
3. `progress`: `running -> running`
4. `cancel_request`: `running -> cancelling`, `queued -> cancelled`
5. `cancel_ack`: `cancelling -> cancelled`
6. `complete`: `running|cancelling -> completed`
7. `complete_with_drift`: `running -> completed_with_drift`
8. `fail`: `running|cancelling -> failed`
9. `retry_manual`: `failed|cancelled -> queued`
10. `retry_auto`: `running(fail retryable) -> queued`

Niedozwolone:
1. `retry` z `queued|running|cancelling`
2. `cancel` z `completed|completed_with_drift`
3. `start` bez aktywnego lease lub ze stale transition version

## 6.3 Lease, heartbeat, resume

1. Worker bierze lease przy `start`; lease ma `expiresAt`.
2. `progress` odnawia heartbeat i lease.
3. Po restarcie inny worker moze przejac job, jesli lease wygasl.
4. Resume czyta checkpoint i kontynuuje od ostatniego bezpiecznego `phase`.

## 7. Kontrakty domenowe w Processing API

## 7.1 Wspolna baza requestu

Kazdy `POST /processing/{type}` przyjmuje:
1. `sourceContext` (`areaResref`, `moduleSourceFingerprint`, `sourcePolicy`, `runtimeProfile`)
2. `execution` (`validationMode`, `dryRun`, `timeoutMs`, `priority`)
3. `expectedRevision` (dla revision-gated flow)
4. `target` (pipeline-specific)

## 7.2 Placeable contract

`target`:
1. `instanceAddressId` (preferowane)
2. `templateResRef` (fallback)
3. `transformDraft` (`x,y,z,bearing`)

Status payload extension:
1. `classification.kind` (`placeable|door|vfx`)
2. `classification.sourceList` (`Placeable List|Door List`)
3. `classification.sourceIndex`
4. `classification.validationCodes[]`
5. `classification.tokenDiagnostics[]`

Invariants:
1. `door` nigdy nie mapuje sie na `Placeable List` lane jako `placeable`.
2. `vfx` zawsze ma source list `Placeable List`.

## 7.3 Creature contract

`target`:
1. `gitIndex` (preferowane)
2. `templateResRef` (fallback)
3. `spawnDraft` (`x,y,z,xOrientation,yOrientation`)

Status payload extension:
1. `creature.creatureKey` (`areaResRef`, `gitIndex`, `templateResRef`, `tag`)
2. `creature.utcResolved`
3. `creature.twoDa` summary (rows found/missing)
4. `creature.tlk` summary (resolvedFrom distribution)
5. `creature.hak` summary (effective priorities)
6. `creature.validationIssuesTop[]`

Invariants:
1. Overlay `UTC -> GIT` jest zachowany.
2. Brak UTC nie jest hard fail sam w sobie.

## 7.4 Area contract

`target`:
1. `includeLanes` (`tiles/placeables/doors/creatures/triggers/waypoints/sounds/encounters/stores/environment`)
2. `migrationMode` (`composition_only|dual_with_legacy_objects`)

Status payload extension:
1. `area.compositionCounts` per lane
2. `area.tileListCardinality` (`expected`, `actual`, `delta`, `severity`)
3. `area.gitTopLevelListSchema` (`ok|mismatch`)
4. `area.gitParseDiagnosticsSummary`
5. `area.runtimeProfile`

Invariants:
1. `GIT.List` trafia do `composition.items[]`.
2. `composition.*` jest canonical over `objects[]`.

## 8. Error taxonomy binding

Wymagane mapowania:
1. Validation input -> `PIPELINE_INPUT_INVALID` (`422`, `retryable=false`)
2. Idempotency conflict -> `PIPELINE_IDEMPOTENCY_KEY_REUSED` (`409`, `false`)
3. Job state conflict -> `PIPELINE_JOB_STATE_CONFLICT` (`409`, `false`)
4. Not found -> `PIPELINE_JOB_NOT_FOUND` (`404`, `false`)
5. Lock/source contention -> `PIPELINE_SOURCE_LOCK_CONFLICT` (`409`, `true`)
6. Retry exhausted -> `PIPELINE_RETRY_EXHAUSTED` (`409/500`, `false`)
7. Revision conflict -> `PIPELINE_REVISION_CONFLICT` (`409`, `true` lub `false` wg policy)

Kazdy blad zwraca:
1. `code`
2. `message`
3. `details[]` (`path`, `reason`)
4. `retryable`

## 9. Observability plan (must-have)

## 9.1 Event families

Lifecycle:
1. `pipeline.job.enqueued`
2. `pipeline.job.started`
3. `pipeline.job.progress`
4. `pipeline.job.completed`
5. `pipeline.job.completed_with_drift`
6. `pipeline.job.failed`
7. `pipeline.job.cancel_requested`
8. `pipeline.job.cancelled`

Stage:
1. `pipeline.stage.started`
2. `pipeline.stage.completed`
3. `pipeline.stage.failed`

Retry/lock/revision/drift:
1. `pipeline.retry.scheduled`
2. `pipeline.retry.exhausted`
3. `pipeline.source_lock.acquire_started|succeeded|failed|conflict|released`
4. `pipeline.revision_gate.passed|conflict_detected`
5. `pipeline.determinism.check_performed|drift_detected`

## 9.2 Metrics

Counters:
1. `aurora_pipeline_jobs_total{pipeline_type,final_status,pipeline_version}`
2. `aurora_pipeline_attempts_total{pipeline_type,stage_group,stage,result,error_code,retryable}`
3. `aurora_pipeline_retries_total{pipeline_type,stage_group,stage,reason}`
4. `aurora_pipeline_drift_events_total{pipeline_type,stage,drift_type}`
5. `aurora_pipeline_source_lock_conflicts_total{pipeline_type,lock_scope,conflict_type}`
6. `aurora_pipeline_revision_gate_conflicts_total{pipeline_type,stage_group}`

Histograms:
1. `aurora_pipeline_job_duration_seconds{pipeline_type,final_status}`
2. `aurora_pipeline_stage_duration_seconds{pipeline_type,stage_group,stage,result}`
3. `aurora_pipeline_retry_delay_seconds{pipeline_type,stage_group,stage,reason}`
4. `aurora_pipeline_lock_wait_seconds{pipeline_type,lock_scope,result}`

Gauges:
1. `aurora_pipeline_inflight_jobs{pipeline_type}`
2. `aurora_pipeline_retry_queue_depth{pipeline_type}`

## 9.3 Trace

1. Root span: `pipeline.job`.
2. Child spans: `pipeline.ingest.*`, `pipeline.parse.*`, `pipeline.classify.*`, `pipeline.enrich.*`, `pipeline.publish.*`.
3. Retry nie tworzy nowego trace; kontynuacja na tym samym `jobId`.
4. Wymagane atrybuty: `pipeline.type`, `pipeline.stage_group`, `pipeline.stage`, `attempt`, `max_attempts`, `error.code`, `retryable`.

## 9.4 Cardinality guardrails

Dozwolone labels low-cardinality:
1. `pipeline_type`
2. `stage_group`
3. `stage`
4. `final_status`
5. `error_code`
6. `retryable`

Zakazane jako labels:
1. `jobId`
2. `jobKey`
3. `requestId`
4. raw path/token/details

## 10. Plan wdrozenia (kolejnosc)

## 10.1 Milestone A - API shell + idempotency
1. DTO walidacyjne dla `POST /processing/{type}`.
2. Handler `enqueue` + tabela `processing_idempotency`.
3. Replay snapshot + `x-idempotency-replayed`.
4. Testy kontraktowe `202/200/409/422`.

## 10.2 Milestone B - lifecycle engine
1. Implementacja status machine z CAS.
2. Lease + heartbeat + resume checkpoint.
3. Endpoint `GET /jobs/{jobId}`.
4. Testy przejsc i scenariuszy restart/recovery.

## 10.3 Milestone C - cancel/retry
1. `:cancel` z cooperative cancellation.
2. `:retry` manual retry attempt+1.
3. Auto-retry scheduler dla `retryable=true`.
4. Testy idempotencji cancel i retry conflictow.

## 10.4 Milestone D - contracts placeable/creature/area
1. Rozszerzenia payloadu statusowego per pipeline type.
2. Mapper diagnostics -> canonical DTO.
3. Invariants i policy checks (`composition`, `UTC->GIT`, classification evidence).
4. Testy snapshot kontraktow.

## 10.5 Milestone E - observability + SLO
1. Emisja eventow wymaganych przez taxonomy.
2. Binding event->metric.
3. Dashboard compatibility (`legacyStage` optional mapping).
4. Alerty: retry surge, lock conflict surge, failed ratio, drift detection.

## 11. Test matrix (Definition of Done)

## 11.1 API i lifecycle
1. `enqueue` idempotent replay dziala i nie tworzy duplikatow.
2. `status` zwraca pelny DTO z attempt/retry/cancel/revision fields.
3. `cancel` dla `queued` i `running` zachowuje semantyke.
4. `retry` odrzuca joby nieterminalne.
5. Niedozwolone przejscia zwracaja `PIPELINE_JOB_STATE_CONFLICT`.

## 11.2 Contracts domainowe
1. Placeable zwraca `kind/sourceList/sourceIndex` + token diagnostics.
2. Creature zwraca overlay i enrichment summary bez utraty preserve-first fields.
3. Area zwraca `composition` counters + tile cardinality + schema diagnostics.

## 11.3 Observability
1. Kazde przejscie lifecycle ma odpowiadajacy event.
2. Retryable fail emituje `pipeline.retry.scheduled`.
3. Retry exhausted emituje `pipeline.retry.exhausted`.
4. Metryki nie naruszaja low-cardinality policy.
5. Trace zawiera wymagane atrybuty etapow i retry.

## 12. Ryzyka i mitigacje

1. Ryzyko: race condition przy transition statusu.
- Mitigacja: optimistic CAS + wersjonowanie rekordu joba.

2. Ryzyko: duplikacja enqueue pod obciazeniem.
- Mitigacja: unique scope idempotency + atomowy insert snapshot.

3. Ryzyko: cancel niehonorowany przy dlugich etapach.
- Mitigacja: checkpoint boundaries i okresowe sprawdzanie `cancelRequested`.

4. Ryzyko: wysoka kardynalnosc metryk.
- Mitigacja: whitelist labels + lint metryk w CI.

5. Ryzyko: rozjazd kontraktow `placeable/creature/area`.
- Mitigacja: snapshot tests + contract versioning `contractVersion`.

## 13. Wyjscie Slice 3

Slice uznaje sie za domkniety, gdy:
1. 4 endpointy lifecycle (`enqueue/status/cancel/retry`) sa dostepne i przechodza test matrix.
2. Job state machine jest atomowa, restart-safe i idempotentna.
3. Kontrakty `placeable/creature/area` sa zwracane przez status payload i zgodne ze spec R63.
4. Observability taxonomy jest zaimplementowana end-to-end (eventy, metryki, trace, alert sygnaly).
