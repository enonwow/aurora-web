# Implementation Slice 5: Benchmarks (R66)

Data: 2026-05-24
Status: Proposed -> Ready for implementation
Owner: Agent F4 (backend)
Zakres: wdrozenie benchmark harness + scale tiers + CI gates + format raportow dla backendu Aurora Reverse.

## 1. Cel slice

Slice 5 domyka benchmarkowanie backendu tak, aby:
1. benchmarki byly deterministyczne i porownywalne run-to-run,
2. skale workloadu (`S|M|L|XL`) byly wspierane przez jeden harness,
3. CI mialo twarde gate dla PR/nightly/release,
4. raporty byly jednoczesnie machine-readable i audit-friendly.

Ten slice implementuje specyfikacje R63/R65 i przeklada je na wykonywalny plan backendowy.

## 2. In/Out of scope

In scope:
1. benchmark runner (request validation, dataset resolution, execution orchestration),
2. scale tiers (`S|M|L|XL`) z mapowaniem na mnozniki workloadu,
3. baseline comparator + decyzje `PASS|WARN|FAIL|REGRESSION`,
4. generowanie artefaktow: `benchmark-report.json`, `benchmark-events.jsonl`, `benchmark-summary.md`,
5. CI workflows i quality gates dla trzech profili,
6. minimalna telemetria i alarm envelope,
7. testy regresyjne i mutacyjne dla logiki gate.

Out of scope:
1. tuning wydajnosci samych pipeline (to jest osobny slice optymalizacyjny),
2. pelne dashboardy BI (tylko eksport danych i kontrakt),
3. zmiany semantyki pipeline `placeable|creature|area` niezwiazane z benchmarkiem.

## 3. Architektura wdrozenia (backend)

## 3.1 Moduly logiczne

1. `BenchmarkHarness`
- przyjmuje request benchmarku, waliduje kontrakt, uruchamia workload, publikuje artefakty.

2. `DatasetResolver`
- rozwiazuje selector `latest|pinned_revision|explicit_candidates`,
- wylicza `datasetFingerprint` i pilnuje fail-fast dla niespojnych danych.

3. `ScaleTierMapper`
- mapuje `S=1x`, `M=5x`, `L=20x`, `XL=50x`,
- buduje finalny workload per `pipelineType` i `scenarioId`.

4. `RunComparator`
- wybiera baseline,
- liczy delty i klasyfikuje wynik (`REGRESSION`, `COMPARABLE_STABLE`, `COMPARABLE_IMPROVEMENT`, `NON_COMPARABLE_DATASET`).

5. `GateEvaluator`
- egzekwuje hard fail, regression fail, warning,
- emituje alarm envelope.

6. `ReportWriter`
- serializuje trzy artefakty i waliduje komplet wymaganych pol.

7. `CiGateAdapter`
- mapuje wynik scenariuszy na status joba CI (`PASS`, `UNSTABLE`, `FAIL`) wg profilu.

## 3.2 Kontrakt wejscia harnessu

Wymagane pola (minimum):
1. `specVersion`, `run.*`, `scenario.*`, `dataset.*`, `execution.*`, `thresholdProfile`.
2. `scenario.scale` przyjmuje tylko `S|M|L|XL`.
3. `execution.measuredRuns >= 10`, `warmupRuns >= 1`.
4. `selector=pinned_revision` wymaga `datasetKey + expectedRevision + commitKey`.

Blad walidacji konczy run przed startem benchmarku i zwraca canonical error envelope.

## 4. Plan implementacji (kolejnosc)

## 4.1 Pakiet A - Harness core + determinism guard

1. Implementacja request validatora wg kontraktu R63/R65.
2. Integracja `DatasetResolver`:
- resolve `latest` przez `refs/<datasetKey>/latest.json`,
- resolve `pinned_revision` przez `commits/<datasetKey>/<commitKey>.json`,
- resolve `explicit_candidates` bezposrednio z payloadu.
3. Liczenie `datasetFingerprint = sha256(canonical_json(...))`.
4. Blokada silent fallback: `pinned_revision` nie moze przejsc na `latest`.
5. Persist metadanych runu (`runId`, scenario key, fingerprint, revision, commitKey).

## 4.2 Pakiet B - Scale tiers + workload builder

1. Wspolny mapper `S/M/L/XL -> 1/5/20/50`.
2. Builder workloadu per pipeline:
- `placeable`: multiplikacja listy kandydatow,
- `creature`: multiplikacja anchor load,
- `area`: skalowanie lane `placeable|door|creature`.
3. Walidacja limitow wykonania (`timeoutMs`) per pipeline.
4. Snapshot finalnej listy workloadu do raportu (dla reprodukcji).

## 4.3 Pakiet C - Execution, agregacja metryk, alarmy

1. Warmup (`n=3`) i measured (`n=15`, min 10) z cooldown.
2. Agregacja metryk:
- throughput: `jobsPerMinute`, `completedJobsPerMinute`,
- latency: `mean`, `p50`, `p95`, `p99`, `stddev`, `coefficientOfVariation`,
- memory: `peakRssMb`, `p95RssMb`, `oomCount`, `gcPauseP95Ms` (jesli dostepne),
- stage-level `p95Ms` + `errorRate`.
3. `GateEvaluator`:
- hard fail,
- regression fail (gdy `strictComparable=true`),
- warning.
4. Emisja `alarm envelope` dla kazdego naruszenia progu.

## 4.4 Pakiet D - Run comparator + baseline policy

1. Baseline selection order:
- ostatni zaakceptowany run na `main`,
- rolling median z 5 nightly,
- fallback `NO_BASELINE`.
2. `strictComparable=true` tylko przy identycznym `datasetFingerprint` i tym samym scenario key.
3. Liczenie delt:
- `p50/p95/p99/mean DeltaPct`,
- `retryRateDeltaPp`, `lockConflictDeltaPp`, `successRateDeltaPp`,
- `completedJobsPerMinute DeltaPct`, `peakRssMb DeltaPct`.
4. Klasyfikacja wyniku porownania i propagacja do CI.

## 4.5 Pakiet E - Report formats + CI adapters

1. `benchmark-report.json`
- pojedynczy kanoniczny dokument z run metadata, scenario, dataset, execution, summary, stages, comparison, alarms.

2. `benchmark-events.jsonl`
- jeden event na linie,
- minimalne pola: `timestamp`, `runId`, `pipelineType`, `scenarioId`, `stage`, `attempt`, `durationMs`, `status`, opcjonalnie `error.*`.

3. `benchmark-summary.md`
- sekcje: Run Metadata, Scenario+Dataset, Decision Matrix, Top Deltas, Retry/Lock Diagnostics, Release Recommendation.

4. CI adapters:
- `benchmark-pr-smoke`,
- `benchmark-nightly-scale`,
- `benchmark-release-gate`.

## 5. CI gates i progi decyzji

## 5.1 Profile CI

1. PR gate (`benchmark-pr-smoke`)
- zakres: `small|medium`, `serial`, scenariusze: `PL-2`, `CR-3`, `AR-3`,
- fail gdy dowolny scenariusz ma `FAIL|REGRESSION`.

2. Nightly gate (`benchmark-nightly-scale`)
- zakres: full matrix `small|medium|large`, plus `xlarge` dla `PL-2`, `AR-2`, `AR-4`,
- profile `serial|contention`,
- wynik: `PASS` (brak fail/regression), `UNSTABLE` (same warn), `FAIL` (co najmniej 1 fail/regression).

3. Release gate (`benchmark-release-gate`)
- zakres: `medium|large|xlarge`, profile `serial|contention`,
- scenariusze wymagane: `PL-2`, `PL-5`, `CR-5`, `AR-3`, `AR-4`, `AR-5`,
- wymagany stan globalny: bez `WARN|FAIL|REGRESSION`.

## 5.2 Progi (normatywne)

Hard fail:
1. `successRate < 99.0%`,
2. `retryExhaustedCount > 0`,
3. `oomCount > 0`,
4. `AR-5-determinism-repeat`: `determinismDriftCount > 0`,
5. brak wymaganych artefaktow lub metryk.

Regression fail (strict comparable):
1. `p95 +>20%`,
2. `p99 +>25%`,
3. `retryRate +>5 pp`,
4. `lockConflictRate +>2 pp` (contention),
5. `completedJobsPerMinute ->15%`,
6. `peakRssMb +>25%`.

Warning:
1. `coefficientOfVariation > 0.25`,
2. `p99/p50 > 3.0`,
3. `gcPauseP95Ms > 200`,
4. `strictComparable=false` przy triggerze `ci`.

## 6. Format raportow (backend contract R66)

## 6.1 benchmark-report.json

Wymagane top-level pola:
1. `specVersion` (`r66`),
2. `runId`, `generatedAt`,
3. `environment` (commit, runtime, host),
4. `scenario` (`pipelineType`, `scenarioId`, `scale`, `concurrencyProfile`),
5. `dataset` (`datasetKey`, `datasetRevision`, `commitKey`, `selector`, `datasetFingerprint`),
6. `execution` (`warmupRuns`, `measuredRuns`, `timeouts`),
7. `summary` (status, throughput, latency, memory, retry, drift),
8. `stages` (stage metrics),
9. `comparison` (baseline + delta + classification),
10. `alarms` (0..N).

## 6.2 benchmark-events.jsonl

Kontrakt eventu:
1. `timestamp` w UTC ISO8601,
2. `eventType` (`stage_started|stage_completed|stage_failed|job_completed|alarm_raised`),
3. `runId`, `scenarioKey`, `pipelineType`,
4. `attempt`, `durationMs`, `status`,
5. `error.code`, `error.retryable` (opcjonalne),
6. `traceId`/`requestId` (jesli dostepne).

## 6.3 benchmark-summary.md

Sekcje wymagane:
1. `Run Metadata`,
2. `Scenario and Dataset Resolution`,
3. `Gate Decisions`,
4. `Top Deltas vs Baseline`,
5. `Tail Latency and Variability`,
6. `Memory Footprint`,
7. `Release Recommendation` (`go|go_with_risk|no_go`).

## 7. Acceptance Criteria (Definition of Done)

Slice jest zaakceptowany, gdy wszystkie warunki sa spelnione:
1. Harness akceptuje `S|M|L|XL` i mapuje je na `1|5|20|50` bez rozjazdu miedzy pipeline.
2. Wejscie benchmarku jest walidowane fail-fast; bledne requesty nie uruchamiaja workloadu.
3. `DatasetResolver` zawsze zwraca `datasetFingerprint` i nie wykonuje silent fallback z `pinned_revision`.
4. Porownanie run-to-run respektuje `strictComparable` i nie wystawia `REGRESSION`, gdy fingerprint jest inny.
5. Wszystkie trzy artefakty (`benchmark-report.json`, `benchmark-events.jsonl`, `benchmark-summary.md`) sa generowane dla kazdego runu.
6. Raport JSON zawiera komplet metryk throughput/latency/memory; brak pola wymag. daje `FAIL` (invalid report).
7. CI ma trzy profile gate i status pipeline jest zgodny z progami sekcji 5.
8. Alarm envelope jest emitowany dla kazdego przekroczenia progu i zawiera `metric`, `actual`, `threshold`, `decision`.
9. Nightly i release korzystaja z baseline policy (last-main + rolling median), a fallback `NO_BASELINE` jest jawnie raportowany.
10. Minimalny zestaw testow z sekcji 8 przechodzi zielono.

## 8. Minimalny zestaw testow regresyjnych/mutacyjnych

## 8.1 Testy regresyjne (minimum)

1. `request_validation_rejects_invalid_scale`
- we: `scale=XX`
- oczekiwane: HTTP/domain validation error, run nie startuje.

2. `pinned_selector_rejects_revision_mismatch`
- we: `selector=pinned_revision`, `expectedRevision != commit.revision`
- oczekiwane: fail-fast, brak fallback do `latest`.

3. `dataset_fingerprint_stable_for_same_input`
- we: dwa identyczne requesty/candidates
- oczekiwane: identyczny `datasetFingerprint`.

4. `dataset_fingerprint_changes_on_candidate_delta`
- we: zmiana jednego kandydata lub runtime revision
- oczekiwane: inny `datasetFingerprint`.

5. `strict_comparable_false_when_fingerprint_differs`
- we: candidate vs baseline z innym fingerprint
- oczekiwane: `NON_COMPARABLE_DATASET`, bez `REGRESSION`.

6. `regression_triggered_on_p95_over_20pct`
- we: baseline p95=100, candidate p95=121
- oczekiwane: `REGRESSION`.

7. `hard_fail_on_oom`
- we: `oomCount=1`
- oczekiwane: `FAIL` niezaleznie od innych metryk.

8. `warning_on_high_variability`
- we: `coefficientOfVariation=0.31`, bez fail/regression
- oczekiwane: `WARN`.

9. `report_invalid_when_memory_metrics_missing`
- we: brak `peakRssMb`
- oczekiwane: `FAIL` + alarm `missing_required_metric`.

10. `ci_profile_pr_smoke_fails_on_any_regression`
- we: jeden scenariusz `REGRESSION` w profilu PR
- oczekiwane: status joba CI = fail.

## 8.2 Testy mutacyjne (minimum)

Cel: wykryc bledy logiki progow i klasyfikacji.

1. Mutant: `>` -> `>=` dla progu p95 (`20%`)
- test kill: przypadek graniczny `20.0%` NIE powinien dawac regression.

2. Mutant: wylaczenie warunku `oomCount > 0`
- test kill: `oomCount=1` musi zawsze dawac `FAIL`.

3. Mutant: podmiana operatora `AND/OR` w hard-fail matrix
- test kill: pojedyncze naruszenie musi wystarczyc do `FAIL`.

4. Mutant: ignorowanie `strictComparable` przy klasyfikacji
- test kill: inny fingerprint nie moze byc oceniony jako regression gate.

5. Mutant: stale zwracanie `PASS` przez CI adapter release
- test kill: obecny `WARN` musi zablokowac release.

6. Mutant: usuniecie walidacji `measuredRuns >= 10`
- test kill: `measuredRuns=5` musi byc odrzucone.

Wymagane minimum pokrycia mutacyjnego dla tego slice:
1. `GateEvaluator` mutation score >= 85%,
2. `RunComparator` mutation score >= 80%,
3. `CiGateAdapter` mutation score >= 80%.

## 9. Ryzyka i mitigacje

1. Ryzyko: niestabilnosc hostow CI zaburza latency.
- Mitigacja: oddzielic `WARN` (niestabilnosc) od `FAIL` i logowac host metadata.

2. Ryzyko: dryf datasetu przy `latest`.
- Mitigacja: fingerprint + revision pinning + jawny `strictComparable=false`.

3. Ryzyko: nadmierny czas benchmarkow release.
- Mitigacja: selektywny zestaw scenariuszy wymaganych i shardowanie matrycy.

## 10. Handover checklist (operacyjny)

1. Pipeline CI ma trzy workflowy benchmarkowe i publikacje artefaktow.
2. Artefakty sa retention-managed (min. 14 dni PR, 30 dni nightly/release).
3. Runbook opisuje krok rerun + baseline override z audytem.
4. Wlasciciele komponentow (`Harness`, `Comparator`, `CI`) sa przypisani.
5. Testy regresyjne i mutacyjne sa uruchamiane w standardowym `test` jobie backendu.

