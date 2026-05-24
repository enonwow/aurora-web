# Processing Pipeline Observability & SLO (Agent R15)

## Cel i zakres
Ten dokument definiuje standard observability i SLO dla processing pipeline `placeable/creature/area`, ze szczegolnym naciskiem na:
1. retry i ich skutecznosc/koszt,
2. determinism drift (niespojnosc wynikow dla tego samego inputu),
3. source-lock conflicts (konflikty blokad zrodel i lease).

Dokument zaklada zgodnosc z kontraktem bledow `AppException` i kodami `PIPELINE_*` opisanymi w:
`backend/docs/standards/processing-pipeline-errors-and-validation.md`.

## SLI i SLO
## SLI-1: Pipeline Success Ratio (user-visible)
Definicja:
- sukces = job pipeline zakonczony statusem `completed` bez `determinism_drift=true`,
- porazka = `failed` albo `completed_with_drift`.

SLO:
1. Miesiecznie >= 99.5% sukcesu dla calosci pipeline.
2. Miesiecznie >= 99.0% per `pipeline_type` (`placeable`, `creature`, `area`).

## SLI-2: Retry Recovery Ratio
Definicja:
- licznik: joby, ktore mialy >=1 retry i finalnie `completed`,
- mianownik: joby, ktore mialy >=1 retry.

SLO:
1. 7-dniowo >= 92% dla retry recovery.
2. 7-dniowo < 8% jobow wymaga retry (guard na degradacje upstream/storage).

## SLI-3: Determinism Integrity
Definicja:
- determinism drift event = ten sam `determinism_input_hash` + ta sama `pipeline_version` daja inny `output_hash`.

SLO:
1. 30-dniowo drift rate < 0.1%.
2. 24h drift burst < 0.5% (hard alert).

## SLI-4: Source-Lock Stability
Definicja:
- konflikt locka = fail/retry z kodem `PIPELINE_SOURCE_LOCK_CONFLICT` lub `PIPELINE_LOCK_TIMEOUT`.

SLO:
1. 7-dniowo conflict rate < 1.0% wszystkich attemptow.
2. P95 lock wait time < 2s.

## Metryki (OpenTelemetry/Prometheus)
Wszystkie metryki z prefiksem `aurora_pipeline_`.
Etykiety ograniczamy do niskiej kardynalnosci. Zakazane label: `requestId`, `jobId`, `sourcePath`.

## Counter
1. `aurora_pipeline_jobs_total{pipeline_type,final_status,pipeline_version}`
2. `aurora_pipeline_attempts_total{pipeline_type,stage,result,error_code,retryable}`
3. `aurora_pipeline_retries_total{pipeline_type,stage,reason}`
4. `aurora_pipeline_drift_events_total{pipeline_type,stage,drift_type}`
5. `aurora_pipeline_source_lock_conflicts_total{pipeline_type,lock_scope,conflict_type}`
6. `aurora_pipeline_source_lock_acquire_total{pipeline_type,lock_scope,result}`

## Histogram
1. `aurora_pipeline_job_duration_seconds{pipeline_type,final_status}`
2. `aurora_pipeline_stage_duration_seconds{pipeline_type,stage,result}`
3. `aurora_pipeline_retry_delay_seconds{pipeline_type,stage,reason}`
4. `aurora_pipeline_lock_wait_seconds{pipeline_type,lock_scope,result}`
5. `aurora_pipeline_lock_hold_seconds{pipeline_type,lock_scope}`

## Gauge (ostroznie)
1. `aurora_pipeline_inflight_jobs{pipeline_type}`
2. `aurora_pipeline_source_locks_held{lock_scope}`
3. `aurora_pipeline_retry_queue_depth{pipeline_type}`

## Event logs (strukturalne)
Format JSONL, klucz `event`, bez payloadow surowych i bez sekretow.

Wspolne pola:
`timestamp`, `level`, `event`, `requestId`, `jobId`, `pipelineType`, `stage`, `attempt`, `maxAttempts`,
`error.code`, `error.retryable`, `durationMs`, `pipelineVersion`.

## Wymagane eventy
1. `pipeline.job.started`
2. `pipeline.job.completed`
3. `pipeline.job.failed`
4. `pipeline.stage.started`
5. `pipeline.stage.completed`
6. `pipeline.stage.failed`
7. `pipeline.retry.scheduled`
8. `pipeline.retry.exhausted`
9. `pipeline.determinism.check_performed`
10. `pipeline.determinism.drift_detected`
11. `pipeline.source_lock.acquire_started`
12. `pipeline.source_lock.acquire_succeeded`
13. `pipeline.source_lock.acquire_failed`
14. `pipeline.source_lock.released`
15. `pipeline.source_lock.conflict`

## Pola specjalne per obszar ryzyka
Retry:
- `retry.reason` (`timeout`, `dependency_unavailable`, `lock_conflict`, `rate_limited`, `transient_io`)
- `retry.backoffMs`
- `retry.jitterMs`

Determinism:
- `determinism.inputHash`
- `determinism.outputHash`
- `determinism.baselineOutputHash`
- `determinism.driftType` (`output_mismatch`, `ordering_mismatch`, `floating_tolerance_exceeded`)
- `determinism.seed`

Source-lock:
- `lock.scope` (`source`, `module`, `area`, `template`)
- `lock.keyHash` (hash, nie surowy klucz)
- `lock.ownerId`
- `lock.leaseMs`
- `lock.waitMs`
- `lock.conflictType` (`already_held`, `lease_expired_race`, `stale_owner`, `timeout`)

## Tracing (distributed tracing)
Root span:
- `pipeline.job`

Podstawowe child spans:
1. `pipeline.lock.acquire`
2. `pipeline.fetch.source`
3. `pipeline.transform.placeable` / `pipeline.transform.creature` / `pipeline.transform.area`
4. `pipeline.persist.artifact`
5. `pipeline.determinism.compare`
6. `pipeline.lock.release`
7. `pipeline.retry.backoff_wait` (gdy retry)

Wymagane atrybuty span:
`pipeline.type`, `pipeline.stage`, `pipeline.version`, `attempt`, `max_attempts`,
`error.code`, `retryable`, `lock.scope`, `lock.wait_ms`,
`determinism.input_hash`, `determinism.output_hash`, `determinism.drift`.

Status span:
1. `OK` dla sukcesu,
2. `ERROR` z `error.code` dla fail/retry,
3. retry oznaczamy eventem w tym samym trace, nie nowym trace.

## Alerting (Prometheus-style)
## 1) SLO Burn Rate - pipeline success
Critical (fast burn, 5m/1h):
```promql
(
  1 - (
    sum(rate(aurora_pipeline_jobs_total{final_status="completed"}[5m]))
    /
    sum(rate(aurora_pipeline_jobs_total[5m]))
  )
) > (1 - 0.995) * 14.4
```

Warning (slow burn, 30m/6h):
```promql
(
  1 - (
    sum(rate(aurora_pipeline_jobs_total{final_status="completed"}[30m]))
    /
    sum(rate(aurora_pipeline_jobs_total[30m]))
  )
) > (1 - 0.995) * 6
```

## 2) Retry storm
```promql
sum(rate(aurora_pipeline_retries_total[10m]))
/
sum(rate(aurora_pipeline_attempts_total[10m]))
> 0.15
```

## 3) Determinism drift spike
```promql
sum(rate(aurora_pipeline_drift_events_total[15m]))
/
sum(rate(aurora_pipeline_jobs_total[15m]))
> 0.005
```

## 4) Source-lock conflict spike
```promql
sum(rate(aurora_pipeline_source_lock_conflicts_total[10m]))
/
sum(rate(aurora_pipeline_source_lock_acquire_total[10m]))
> 0.03
```

## 5) Lock wait latency regression
```promql
histogram_quantile(
  0.95,
  sum(rate(aurora_pipeline_lock_wait_seconds_bucket[15m])) by (le)
) > 2
```

## 6) Retry exhausted (hard correctness risk)
```promql
sum(increase(aurora_pipeline_attempts_total{result="retry_exhausted"}[15m])) > 0
```

## Routing alertow
1. `Critical`: drift spike, retry exhausted burst, fast-burn SLO.
2. `Warning`: slow-burn SLO, rosnace conflict/lock wait, retry storm.
3. `Ticket`: pojedyncze incydenty niskiego wolumenu bez trendu.

## Dashboardy (minimalny zestaw)
1. Pipeline overview: throughput, success ratio, p50/p95 duration, in-flight.
2. Retry panel: retry rate, recovery ratio, retry by reason/stage.
3. Determinism panel: drift rate, drift by type, top versions impacted.
4. Source-lock panel: acquire success, conflict rate, wait p95, stale owner incidents.
5. Error budget panel: miesieczny budget, burn rate, prognoza exhaust.

## Semantyka kodow bledow (uzupelnienie)
Dla nacisku R15 dodajemy:
1. `PIPELINE_SOURCE_LOCK_CONFLICT` -> HTTP 409, `retryable=true` (zwykle tak, jesli lock jest tymczasowy).
2. `PIPELINE_LOCK_TIMEOUT` -> HTTP 504, `retryable=true`.
3. `PIPELINE_DETERMINISM_DRIFT` -> HTTP 500, `retryable=false` (wymaga triage, nie slepego retry).
4. `PIPELINE_RETRY_EXHAUSTED` -> HTTP 503/500 zaleznie od przyczyny bazowej, `retryable=false` dla klienta synchronicznego.

## Runbook skrocony (on-call)
1. Gdy drift > prog: zatrzymaj rollout nowej `pipeline_version`, porownaj `output_hash` i seed.
2. Gdy lock conflicts rosna: sprawdz lease tuning (`leaseMs`, `waitMs`) i stale lock cleanup.
3. Gdy retry storm: sprawdz upstream availability i latency, tymczasowo zwieksz backoff+jitter.
4. Gdy retry exhausted: eskalacja do ownera modulu + incident ticket P1.

## Plan wdrozenia etapami
1. Etap 1: metryki + log eventy (bez sampling) dla `job/stage/retry`.
2. Etap 2: tracing spanow lock/determinism + dashboardy.
3. Etap 3: alerty burn-rate i ryzyk determinism/lock.
4. Etap 4: kalibracja progow po 2 tygodniach danych produkcyjnych.

## Kryteria akceptacji
1. Kazdy job ma `requestId` i `jobId` w logach i trace.
2. Kazdy retry emituje `pipeline.retry.scheduled` + inkrementuje `aurora_pipeline_retries_total`.
3. Kazdy detected drift emituje event i counter drift.
4. Kazdy lock acquire/release ma metryke i span.
5. Alerty testowe (syntetyczne) potwierdzone na staging.
