# Benchmark Data Collection Contract R67 (Aurora Reverse)

Data: 2026-05-24
Status: Draft (normative data-collection contract for benchmark runtime)
Owner: Agent F5 (Benchmark Data Collection Contract)
Zakres: doprecyzowanie kontraktu zbierania danych benchmarkowych runtime backendu dla `placeable|creature|area`, kompatybilne z R65/R66.

## 1. Cel i zgodnosc

R67 uszczegolawia warstwe telemetry/data-collection dla benchmark harness:
1. stabilny slownik metryk,
2. stabilny kontrakt etykiet,
3. deterministyczne agregacje,
4. jawna retencja i downsampling,
5. jawny sampling bez utraty sygnalu krytycznego.

Zgodnosc normatywna:
1. R65: `S|M|L|XL`, progi `PASS|WARN|FAIL|REGRESSION`, throughput/latency/memory.
2. R66: artefakty `benchmark-report.json`, `benchmark-events.jsonl`, `benchmark-summary.md`, baseline policy, CI profiles.
3. R63 observability taxonomy: low-cardinality labels i event->metric binding.

## 2. Jednostka obserwacji i klucze

Podstawowa jednostka obserwacji: `scenario-run`, identyfikowana przez:
1. `runId`
2. `scenarioKey = <pipelineType>/<scenarioId>/<scale>/<concurrencyProfile>`
3. `datasetFingerprint`

Regula porownywalnosci:
1. `strictComparable=true` tylko gdy identyczne `scenarioKey` i `datasetFingerprint`.
2. Przy `strictComparable=false` raportujemy trend, ale bez klasyfikacji `REGRESSION`.

## 3. Kontrakt metryk (required)

## 3.1 Throughput

1. `benchmark_jobs_per_minute`
- typ: gauge (run summary)
- jednostka: jobs/min
- zrodlo: measured runs
- required: TAK

2. `benchmark_completed_jobs_per_minute`
- typ: gauge (run summary)
- jednostka: jobs/min
- zrodlo: measured runs
- required: TAK

## 3.2 Latency

1. `benchmark_job_duration_ms_mean`
2. `benchmark_job_duration_ms_p50`
3. `benchmark_job_duration_ms_p95`
4. `benchmark_job_duration_ms_p99`
5. `benchmark_job_duration_ms_stddev`
6. `benchmark_job_duration_ms_cov`

Dla powyzszych:
- typ: gauge (run summary)
- jednostka: ms (`cov` bez jednostki)
- zrodlo: measured runs only
- required: TAK

Stage-level (required):
1. `benchmark_stage_duration_ms_p95{stage}`
2. `benchmark_stage_error_rate{stage}`

Stage enum (minimum):
`lock.acquire`, `fetch.source`, `transform.main`, `persist.artifact`, `determinism.compare`, `lock.release`.

## 3.3 Memory

1. `benchmark_memory_peak_rss_mb`
- typ: gauge
- jednostka: MB
- agregacja: max z measured runs
- required: TAK

2. `benchmark_memory_p95_rss_mb`
- typ: gauge
- jednostka: MB
- required: TAK

3. `benchmark_memory_oom_count`
- typ: counter->summary value
- jednostka: count
- required: TAK

4. `benchmark_memory_gc_pause_p95_ms`
- typ: gauge
- jednostka: ms
- required: WARUNKOWO (jesli runtime eksportuje)

Regula krytyczna:
1. Brak `benchmark_memory_peak_rss_mb` oznacza `FAIL` (`invalid_report`).

## 3.4 Reliability/consistency

1. `benchmark_success_rate`
2. `benchmark_retry_rate`
3. `benchmark_retry_exhausted_count`
4. `benchmark_lock_conflict_rate`
5. `benchmark_determinism_drift_count`

Dla powyzszych:
- typ: gauge/counter summary
- required: TAK

## 3.5 Comparative deltas (vs baseline)

Liczone gdy baseline istnieje:
1. `benchmark_delta_p50_pct`
2. `benchmark_delta_p95_pct`
3. `benchmark_delta_p99_pct`
4. `benchmark_delta_mean_pct`
5. `benchmark_delta_completed_jobs_per_minute_pct`
6. `benchmark_delta_peak_rss_mb_pct`
7. `benchmark_delta_retry_rate_pp`
8. `benchmark_delta_lock_conflict_rate_pp`
9. `benchmark_delta_success_rate_pp`

## 4. Kontrakt etykiet (labels)

## 4.1 Labels wymagane (all benchmark metrics)

1. `pipeline_type` (`placeable|creature|area`)
2. `scenario_id` (`PL-*|CR-*|AR-*`)
3. `scale` (`S|M|L|XL`)
4. `concurrency_profile` (`serial|contention`)
5. `trigger` (`manual|ci|nightly|release`)
6. `threshold_profile` (`benchmark-pr-smoke|benchmark-nightly-scale|benchmark-release-gate|diagnostic`)
7. `spec_version` (`r67`)

## 4.2 Labels warunkowe

1. `stage` dla metryk stage-level.
2. `result` (`PASS|WARN|FAIL|REGRESSION`) dla metryk decyzji.
3. `strict_comparable` (`true|false`) dla metryk porownawczych.
4. `baseline_source` (`last_main|nightly_median_5|none`) dla deltas.

## 4.3 Labels zabronione (high-cardinality)

NIE WOLNO dodawac do metryk:
1. `requestId`
2. `jobId`
3. `jobKey`
4. `traceId`
5. raw `resref`, `sourcePath`, `token`, `details`

Dozwolone tylko w eventach/traces, nie w metrykach agregowanych.

## 4.4 Budzet kardynalnosci

1. Maksymalna kardynalnosc na pojedyncza metryke per 24h: `<= 2000` series.
2. Naruszenie budzetu powoduje:
- alarm `benchmark.labels.cardinality_risk`
- degradacje do zestawu labels minimalnego (`pipeline_type`, `scale`, `concurrency_profile`, `result`).

## 5. Reguly agregacji

## 5.1 Zakres probki

1. Warmup runs (`warmupRuns`) sa wykluczone z agregacji metryk finalnych.
2. Agregacje liczymy wylacznie z `measuredRuns` (`>=10`, default 15).

## 5.2 Agregacja run summary

1. `p50/p95/p99`: kwantyle z rozkladu `jobDurationMs` measured runs.
2. `mean`, `stddev`, `cov`: z tego samego zbioru measured.
3. `peak_rss_mb`: `max` z measured runs.
4. `p95_rss_mb`: p95 z measured runs.
5. `success_rate = completed_or_completed_with_drift / measuredRuns`.
6. `retry_rate = retries_total / measuredRuns`.

## 5.3 Agregacja stage-level

1. Dla kazdego `stage`: `p95(durationMs)` i `errorRate`.
2. `errorRate(stage) = stage_errors / stage_attempts`.
3. Stage nieobecny w runie musi byc raportowany jako `missing_stage_metric` (alarm), nie moze byc cicho pomijany.

## 5.4 Agregacja profile-level (CI job)

Dla jednego CI joba (np. `benchmark-nightly-scale`):
1. status globalny = najgorszy status scenariusza wedlug priorytetu:
`FAIL > REGRESSION > WARN > PASS`.
2. agregacja trendu:
- mediana `p95` per `scenarioKey` (ostatnie 5 runow nocnych)
- mediana `completed_jobs_per_minute` per `scenarioKey`.

## 5.5 Reguly porownania z baseline

1. Delta procentowa:
`deltaPct = ((candidate - baseline) / baseline) * 100`.
2. Delta pp:
`deltaPp = (candidateRate - baselineRate) * 100`.
3. Gdy `baseline=0` dla metryki procentowej:
- oznacz `delta=undefined`
- emituj `comparison_not_computable`.

## 6. Sampling contract

## 6.1 Metryki agregowane

1. Sampling dla metryk run summary: `100%` scenario-run.
2. Sampling dla metryk stage-level:
- `serial`: 100%
- `contention`: 100% dla `failed|retry|drift`, 50% dla `completed` event->stage raw records.

Uwaga: sampling raw records NIE moze zmieniac finalnych agregatow run summary.

## 6.2 Events (`benchmark-events.jsonl`)

1. `stage_failed`, `retry_scheduled`, `retry_exhausted`, `alarm_raised`, `oom`, `determinism_drift`:
- sampling zawsze `100%`.
2. `stage_completed`:
- default sampling `25%` dla `serial`
- default sampling `10%` dla `contention`
3. Co 10-ty `job_completed` MUST byc zachowany (`systematic keep`) nawet przy losowaniu.

## 6.3 Traces (jesli wlaczone)

1. `FAIL|REGRESSION|WARN` runy: `100%` trace retention.
2. `PASS` runy:
- `serial`: 20%
- `contention`: 10%
3. Decyzja sampling musi byc deterministyczna:
`sample = hash(runId + scenarioKey + attempt) mod 100 < rate`.

## 6.4 Anti-bias guard

1. Sampling nie moze zalezec od wartosci `durationMs` ani `error.code`.
2. Zabronione jest odrzucanie tail-latency buckets.
3. Gdy wykryto bias (`tail_underrepresented=true`), sampling dla danego scenariusza podnosimy tymczasowo do 100% na 24h.

## 7. Retention i lifecycle danych

## 7.1 Artefakty benchmarkowe

1. PR gate artefakty:
- retention min 14 dni.
2. Nightly artefakty:
- retention min 30 dni.
3. Release artefakty:
- retention min 180 dni.

Artefakty objete retencja:
1. `benchmark-report.json`
2. `benchmark-events.jsonl`
3. `benchmark-summary.md`

## 7.2 Metryki czasowe (TSDB)

1. Raw high-resolution buckets:
- retention 30 dni.
2. Downsample 5m:
- retention 180 dni.
3. Downsample 1h:
- retention 400 dni.

## 7.3 Event store

1. Full-fidelity events (`failed|retry|alarm|oom|drift`): 180 dni.
2. Sampled success events: 30 dni.
3. Po TTL dane usuwane automatycznie przez scheduled purge; brak manual overwrite.

## 7.4 Baseline snapshots

1. Snapshoty baseline (`last_main` + `nightly_median_5`) trzymane min 180 dni.
2. Usuniecie snapshotu wymaga replacement snapshotu dla tego samego `scenarioKey`.

## 8. Data quality i walidacje

## 8.1 Completeness checks

Run jest `invalid_report` gdy brakuje dowolnej required metryki:
1. throughput metrics,
2. latency metrics,
3. memory metrics (`peak_rss_mb` obligatoryjnie),
4. reliability metrics,
5. scenario/dataset metadata.

## 8.2 Consistency checks

1. `completedJobsPerMinute <= jobsPerMinute`.
2. `p50 <= p95 <= p99`.
3. `0 <= successRate <= 1`.
4. `retryExhaustedCount <= retriesTotal`.

Naruszenie -> alarm `benchmark.data.invariant_violation` + status co najmniej `FAIL`.

## 8.3 Freshness checks

1. `generatedAt` musi byc <= 5 min od konca runu.
2. Brak freshness -> `WARN` dla `manual`, `FAIL` dla `ci|nightly|release`.

## 9. Minimalny kontrakt wyjsciowy r67

`benchmark-report.json` MUSI zawierac:
1. `specVersion = r67`
2. sekcje: `run`, `environment`, `scenario`, `dataset`, `execution`, `summary`, `stages`, `comparison`, `alarms`, `dataCollection`.

Sekcja `dataCollection` (nowa w r67) MUSI zawierac:
1. `samplingPolicyVersion`
2. `eventSamplingRates`
3. `traceSamplingRates`
4. `retentionProfileApplied`
5. `cardinalityBudgetStatus`

## 10. Acceptance criteria r67

R67 jest wdrozone, gdy:
1. Wszystkie required metryki z sekcji 3 sa emitowane i walidowane fail-fast.
2. Labels z sekcji 4 sa jedynymi labels metryk benchmarkowych.
3. Agregacje z sekcji 5 daja identyczny wynik przy powtorzeniu runu na tym samym zbiorze measured runs.
4. Sampling z sekcji 6 nie redukuje coverage dla zdarzen krytycznych.
5. Retencja z sekcji 7 jest aktywna i audytowalna per profil CI.
6. `benchmark-report.json` zawiera `dataCollection` i `specVersion=r67`.

## 11. Delta vs R65/R66

1. R65/R66 definiowaly co mierzyc i jak gate-owac; R67 doprecyzowuje jak stabilnie zbierac dane.
2. R67 dodaje kontrakt labels, sampling i retention jako first-class czesc benchmark runtime contract.
3. R67 dodaje sekcje `dataCollection` do raportu dla audytu telemetrycznego.
