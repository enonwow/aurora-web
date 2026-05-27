# Observability Event Taxonomy Spec R63 (Agent X1)

Data: 2026-05-24
Status: Draft for backend processing observability contract
Zakres: taksonomia eventow, metryk i atrybutow telemetrycznych dla pipeline `ingest -> parse -> classify -> enrich -> publish` oraz sciezek `fail/retry` dla `placeable`, `creature`, `area`, `blob_ingest`.

## 1. Cel

Zdefiniowac jedna, stabilna taksonomie observability zgodna z Aurora Reverse i standardami backend, tak aby:
1. eventy i metryki byly porownywalne miedzy pipeline types,
2. retry/fail mialy jawny i deterministyczny sygnal operacyjny,
3. etap `classify` i `enrich` byly first-class (bez utraty zgodnosci z R15),
4. low-cardinality pozostalo wymuszone dla Prometheus/OTel.

## 2. Evidence base (Aurora Reverse + backend)

1. `C:\Projects\aurora-web-backend\backend\docs\standards\processing-pipeline-observability-slo-agent-r15.md`
- canonical event families, metryki `aurora_pipeline_*`, tracing baseline.
2. `C:\Projects\aurora-web-backend\backend\docs\standards\processing-pipeline-errors-and-validation.md`
- kontrakt `AppException/ErrorEnvelope`, retryable semantics, `PIPELINE_*`.
3. `C:\Projects\aurora-web-backend\backend\docs\aurora-reverse\processing-job-lifecycle-spec-r63.md`
- lifecycle eventy `enqueued/start/progress/complete/fail/cancel/retry`.
4. `C:\Projects\aurora-web-backend\backend\docs\aurora-reverse\processing-error-taxonomy-spec-r63.md`
- canonical error.code i severity taxonomy.
5. `C:\Projects\aurora-web-backend\backend\docs\aurora-reverse\hex-processing-ports-spec-r63.md`
- stage boundaries i port-level observability binding.
6. `C:\Projects\aurora-web-backend\backend\docs\aurora-reverse\placeable-classification-spec-r63.md`
- `classify` lane (`placeable/door/vfx`) jako osobny kontrakt.
7. `C:\Projects\aurora-web-backend\backend\docs\aurora-reverse\creature-enrichment-spec-r63.md`
- `enrich` lane (`UTC/2DA/TLK/HAK`) jako osobny kontrakt.
8. `C:\Projects\aurora-web-backend\backend\docs\aurora-reverse\blob-ingest-pipeline-spec-r63.md`
- ingest/recovery/retry policy i revision-gated publish.

## 3. Canonical dimensions

## 3.1 Obowiazkowe wymiary (logs/events/traces)

1. `pipelineType`: `placeable | creature | area | blob_ingest`
2. `stageGroup`: `ingest | parse | classify | enrich | publish`
3. `result`: `started | completed | failed | retry_scheduled | retry_exhausted | cancelled | completed_with_drift`
4. `attempt`: liczba >= 1
5. `maxAttempts`: liczba >= 1
6. `pipelineVersion`: wersja runtime pipeline
7. `error.code` i `error.retryable` gdy `result` jest failure/retry

## 3.2 Dodatkowe low-cardinality labels (metryki)

1. `final_status`: `completed | completed_with_drift | failed | cancelled`
2. `retry_reason`: `timeout | dependency_unavailable | lock_conflict | rate_limited | transient_io | revision_conflict`
3. `lock_scope`: `source | module | area | template`
4. `drift_type`: `output_mismatch | ordering_mismatch | floating_tolerance_exceeded`

Zakazane labels: `requestId`, `jobId`, `jobKey`, `sourcePath`, raw `details[]`, surowe resref/path/token.

## 4. Stage taxonomy (R63)

## 4.1 Canonical `stage`

1. `ingest.acquire_lock`
2. `ingest.resolve_sources`
3. `ingest.fetch_source`
4. `ingest.stage_manifest`
5. `parse.decode_input`
6. `parse.extract_records`
7. `parse.policy_gate`
8. `classify.placeable_kind`
9. `classify.token_diagnostics`
10. `enrich.overlay_runtime`
11. `enrich.lookup_2da`
12. `enrich.lookup_tlk`
13. `enrich.resolve_hak`
14. `publish.persist_artifacts`
15. `publish.revision_gate`
16. `publish.emit_outbox`
17. `publish.release_lock`

## 4.2 Mapping na legacy R15 stage dashboards

1. `ingest.*` -> `pipeline.stage=fetch.source`
2. `parse.*` -> `pipeline.stage=transform.<pipelineType>`
3. `classify.*` -> `pipeline.stage=transform.<pipelineType>`
4. `enrich.*` -> `pipeline.stage=transform.<pipelineType>`
5. `publish.*` -> `pipeline.stage=persist.artifact`

Wymaganie: event MUSI zawierac `stage` (R63), a opcjonalnie `legacyStage` dla kompatybilnosci wykresow R15.

## 5. Event taxonomy

## 5.1 Job lifecycle events (required)

1. `pipeline.job.enqueued`
2. `pipeline.job.started`
3. `pipeline.job.progress`
4. `pipeline.job.completed`
5. `pipeline.job.completed_with_drift`
6. `pipeline.job.failed`
7. `pipeline.job.cancel_requested`
8. `pipeline.job.cancelled`

## 5.2 Stage lifecycle events (required)

1. `pipeline.stage.started`
2. `pipeline.stage.completed`
3. `pipeline.stage.failed`

Kazdy stage event MUSI miec `stageGroup` i `stage`.

## 5.3 Retry/fail events (required)

1. `pipeline.retry.scheduled`
2. `pipeline.retry.exhausted`
3. `pipeline.source_lock.acquire_started`
4. `pipeline.source_lock.acquire_succeeded`
5. `pipeline.source_lock.acquire_failed`
6. `pipeline.source_lock.conflict`
7. `pipeline.source_lock.released`

## 5.4 Determinism/revision events (required for publish correctness)

1. `pipeline.determinism.check_performed`
2. `pipeline.determinism.drift_detected`
3. `pipeline.revision_gate.conflict_detected`
4. `pipeline.revision_gate.passed`

## 6. Event envelope (JSONL)

## 6.1 Wspolne pola

`timestamp`, `level`, `event`, `requestId`, `jobId`, `jobKey`, `pipelineType`, `pipelineVersion`, `stageGroup`, `stage`, `attempt`, `maxAttempts`, `durationMs`.

## 6.2 Pola warunkowe

1. Failure/retry: `error.code`, `error.retryable`, `error.severity`, `retry.reason`, `retry.backoffMs`, `retry.jitterMs`.
2. Lock: `lock.scope`, `lock.keyHash`, `lock.ownerId`, `lock.leaseMs`, `lock.waitMs`, `lock.conflictType`.
3. Determinism: `determinism.inputHash`, `determinism.outputHash`, `determinism.baselineOutputHash`, `determinism.driftType`, `determinism.seed`.
4. Revision gate: `revision.expected`, `revision.actual`, `revision.conflict`.

## 6.3 Przyklady eventow

```json
{"timestamp":"2026-05-24T12:00:00.000Z","level":"info","event":"pipeline.stage.completed","requestId":"req-1","jobId":"job-1","jobKey":"jk-1","pipelineType":"area","pipelineVersion":"v1.3.0","stageGroup":"ingest","stage":"ingest.resolve_sources","attempt":1,"maxAttempts":3,"durationMs":83.4}
```

```json
{"timestamp":"2026-05-24T12:00:00.300Z","level":"warn","event":"pipeline.retry.scheduled","requestId":"req-1","jobId":"job-1","jobKey":"jk-1","pipelineType":"area","pipelineVersion":"v1.3.0","stageGroup":"parse","stage":"parse.extract_records","attempt":1,"maxAttempts":3,"error":{"code":"PIPELINE_STAGE_TIMEOUT","retryable":true,"severity":"CRITICAL"},"retry":{"reason":"timeout","backoffMs":2000,"jitterMs":211}}
```

```json
{"timestamp":"2026-05-24T12:00:02.000Z","level":"info","event":"pipeline.stage.completed","requestId":"req-2","jobId":"job-2","jobKey":"jk-2","pipelineType":"placeable","pipelineVersion":"v1.3.0","stageGroup":"classify","stage":"classify.placeable_kind","attempt":1,"maxAttempts":3,"durationMs":17.2}
```

## 7. Metrics taxonomy (Prometheus/OTel)

Prefiks metryk: `aurora_pipeline_`.

## 7.1 Counters (required)

1. `aurora_pipeline_jobs_total{pipeline_type,final_status,pipeline_version}`
2. `aurora_pipeline_attempts_total{pipeline_type,stage_group,stage,result,error_code,retryable}`
3. `aurora_pipeline_retries_total{pipeline_type,stage_group,stage,reason}`
4. `aurora_pipeline_drift_events_total{pipeline_type,stage,drift_type}`
5. `aurora_pipeline_source_lock_conflicts_total{pipeline_type,lock_scope,conflict_type}`
6. `aurora_pipeline_source_lock_acquire_total{pipeline_type,lock_scope,result}`
7. `aurora_pipeline_revision_gate_conflicts_total{pipeline_type,stage_group}`

## 7.2 Histograms (required)

1. `aurora_pipeline_job_duration_seconds{pipeline_type,final_status}`
2. `aurora_pipeline_stage_duration_seconds{pipeline_type,stage_group,stage,result}`
3. `aurora_pipeline_retry_delay_seconds{pipeline_type,stage_group,stage,reason}`
4. `aurora_pipeline_lock_wait_seconds{pipeline_type,lock_scope,result}`
5. `aurora_pipeline_lock_hold_seconds{pipeline_type,lock_scope}`

## 7.3 Gauges (optional, low-cardinality)

1. `aurora_pipeline_inflight_jobs{pipeline_type}`
2. `aurora_pipeline_source_locks_held{lock_scope}`
3. `aurora_pipeline_retry_queue_depth{pipeline_type}`

## 8. Event -> metric binding rules

1. `pipeline.job.completed|completed_with_drift|failed|cancelled` inkrementuje `aurora_pipeline_jobs_total` i obserwuje `aurora_pipeline_job_duration_seconds`.
2. `pipeline.stage.started|completed|failed` inkrementuje `aurora_pipeline_attempts_total`; `completed|failed` obserwuje `aurora_pipeline_stage_duration_seconds`.
3. `pipeline.retry.scheduled` inkrementuje `aurora_pipeline_retries_total` i obserwuje `aurora_pipeline_retry_delay_seconds`.
4. `pipeline.retry.exhausted` emituje `result=retry_exhausted` na `aurora_pipeline_attempts_total`.
5. `pipeline.source_lock.acquire_*|conflict|released` mapuje na lock counters/histograms.
6. `pipeline.revision_gate.conflict_detected` inkrementuje `aurora_pipeline_revision_gate_conflicts_total`.
7. `pipeline.determinism.drift_detected` inkrementuje `aurora_pipeline_drift_events_total`.

## 9. Fail/retry taxonomy

## 9.1 Retryable (MUST)

1. `PIPELINE_LOCK_TIMEOUT`
2. `PIPELINE_SOURCE_LOCK_CONFLICT`
3. `PIPELINE_DEPENDENCY_UNAVAILABLE`
4. `PIPELINE_DECOMP_TIMEOUT`
5. `PIPELINE_RATE_LIMITED`

Dla powyzszych event `pipeline.retry.scheduled` jest wymagany, jesli `attempt < maxAttempts`.

## 9.2 Non-retryable (MUST)

1. `PIPELINE_INPUT_INVALID`
2. `PIPELINE_PARSE_STRICT_BLOCKED`
3. `PIPELINE_VALIDATION_PARITY_FAILED`
4. `PIPELINE_DETERMINISM_DRIFT`
5. `PIPELINE_RETRY_EXHAUSTED`

Dla powyzszych finalny event to `pipeline.job.failed` albo `pipeline.job.completed_with_drift` (dla drift).

## 10. Trace taxonomy

1. Root span: `pipeline.job`.
2. Child spans: `pipeline.ingest.*`, `pipeline.parse.*`, `pipeline.classify.*`, `pipeline.enrich.*`, `pipeline.publish.*`.
3. Retry NIE tworzy nowego trace; retry jest eventem/spans continuation w tym samym trace.
4. Wymagane atrybuty span: `pipeline.type`, `pipeline.stage_group`, `pipeline.stage`, `pipeline.version`, `attempt`, `max_attempts`, `error.code`, `retryable`.

## 11. Compliance matrix (R63)

Implementacja jest zgodna, gdy:
1. emituje wszystkie eventy required z sekcji 5,
2. kazdy stage event ma `stageGroup` oraz `stage` z sekcji 4,
3. metryki required z sekcji 7 sa podpinane przez reguly z sekcji 8,
4. retry/fail semantics respektuja sekcje 9 i `processing-error-taxonomy-spec-r63.md`,
5. dashboardy R15 dzialaja przez mapping `legacyStage` z sekcji 4.2,
6. brak wysokiej kardynalnosci w labels.

## 12. Migration strategy (bez breaking changes)

1. Etap 1: dodac `stageGroup` + `stage` do eventow bez usuwania legacy `stage`.
2. Etap 2: rozszerzyc metryki o `stage_group` i `stage` jako labels.
3. Etap 3: przelaczyc dashboardy na R63 labels, zostawiajac R15 compatibility window.
4. Etap 4: po stabilizacji usunac zaleznosc na `legacyStage` (opcjonalnie).
