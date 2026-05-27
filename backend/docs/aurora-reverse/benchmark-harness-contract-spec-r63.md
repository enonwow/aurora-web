# Benchmark Harness Contract Spec (R63)

Data: 2026-05-24
Status: Draft (backend benchmark contract baseline)
Zakres: kontrakt harnessu benchmarkowego backendu Aurora Reverse: wejscie scenariusza, selekcja datasetu, format wynikow, porownywanie run-to-run i progi alarmowe.

## 1. Scope i cele

Spec definiuje kanoniczny kontrakt uruchamiania benchmarku dla pipeline:
1. `placeable`
2. `creature`
3. `area`

Kontrakt jest normatywny dla benchmark runnera i CI release-gate. Ma zapewnic:
1. deterministyczne budowanie workloadu,
2. powtarzalnosc wynikow miedzy runami,
3. automatyczne wykrywanie regresji i niestabilnosci.

## 2. Evidence base (Aurora Reverse + backend)

1. `backend/docs/aurora-reverse/benchmark-plan-spec-r63.md`
- canonical scenarios, skale, concurrency profile, warmup/measured runs, pass/fail i regression gates.

2. `backend/docs/aurora-reverse/admin-runtime-settings-contract-spec-r63.md`
- runtime source toggles oraz `benchmarkCandidates` jako zrodlo kandydatow workloadu.

3. `backend/docs/aurora-reverse/blob-ingest-pipeline-spec-r63.md`
- model `commits/<dataset>/<commit_key>.json` i `refs/<dataset>/latest.json` dla pinned/latest dataset revision.

4. `backend/docs/aurora-reverse/processing-job-lifecycle-spec-r63.md`
- statusy i event lifecycle wykorzystywane przez benchmarking job-level i stage-level.

5. `backend/docs/aurora-reverse/processing-error-taxonomy-spec-r63.md`
- wspolna klasyfikacja bledow retryable/non-retryable i envelope kodow.

## 3. Kontrakt wejscia scenariusza

## 3.1 Wejscie harnessu (request)

```json
{
  "specVersion": "r63",
  "run": {
    "runId": "bench-2026-05-24T12-00-00Z-main",
    "trigger": "manual|ci|nightly",
    "gitCommit": "string",
    "pipelineVersion": "string",
    "runtimeSettingsRevision": 1
  },
  "scenario": {
    "pipelineType": "placeable|creature|area",
    "scenarioId": "PL-2-vfx-heavy",
    "scale": "S|M|L",
    "concurrencyProfile": "serial|contention",
    "candidateSet": "runtime-default|reverse-canonical|pinned"
  },
  "dataset": {
    "selector": "latest|pinned_revision|explicit_candidates",
    "datasetKey": "string",
    "expectedRevision": 17,
    "commitKey": "optional-string",
    "candidates": []
  },
  "execution": {
    "warmupRuns": 3,
    "measuredRuns": 15,
    "cooldownMs": 1000,
    "timeoutMs": {
      "placeable": 30000,
      "creature": 30000,
      "area": 60000
    }
  },
  "thresholdProfile": "release_gate|nightly|diagnostic"
}
```

## 3.2 Reguly walidacji wejscia

1. `specVersion` MUSI byc `r63`.
2. `pipelineType` i `scenarioId` MUSZA byc zgodne z matrix R63 (`PL-*`, `CR-*`, `AR-*`).
3. `scale` MUSI nalezec do `S|M|L`; `concurrencyProfile` do `serial|contention`.
4. `measuredRuns >= 10`; `warmupRuns >= 1`.
5. Dla `selector=pinned_revision` wymagane: `datasetKey`, `expectedRevision` i `commitKey`.
6. Dla `selector=explicit_candidates` wymagane: niepusta lista `candidates[]`.
7. `timeoutMs` per pipeline nie moze byc mniejsze niz wartosci minimalne z planu R63.

## 3.3 Mapping scenariusz -> workload

Harness MUSI mapowac `scenarioId` do kandydatow zgodnie z `benchmark-plan-spec-r63.md`:
1. `PL-*` -> placeable/door candidates.
2. `CR-*` -> creature + anchor candidates.
3. `AR-*` -> mieszane kompozycje area.

Skale:
1. `S = 1x`
2. `M = 5x`
3. `L = 20x`

## 4. Kontrakt selekcji datasetu

## 4.1 Zrodla datasetu

1. `runtime-default`
- kandydaci z `benchmarkCandidates` (admin runtime settings), z fallbackiem fail-fast gdy braki krytyczne.

2. `reverse-canonical`
- kanoniczny zestaw R63:
- `c_wingsmeph`
- `ad_top_lion_1`
- `plc_x02`
- `tn_sdoor_14`
- `tn_gdoor_05`

3. `pinned`
- zestaw kandydatow i rewizja przypiete przez `datasetKey + commitKey`.

## 4.2 Algorytm wyboru datasetu

1. Wyznacz `datasetKey`:
- `<pipelineType>/<scenarioId>/<scale>/<concurrencyProfile>`.

2. Rozwiaz selector:
- `latest`: odczytaj `refs/<datasetKey>/latest.json` i pobierz (`revision`, `commitKey`).
- `pinned_revision`: odczytaj `commits/<datasetKey>/<commitKey>.json`; odrzuc, gdy revision mismatch.
- `explicit_candidates`: zbuduj ephemeral dataset z payloadu requestu.

3. Zweryfikuj kandydatow:
- `resref` non-empty,
- brak duplikatow `(assetType,resref,variant)` po normalizacji,
- wszystkie wymagane pola metryk (`triangles`, `meshes`, `emitters`) dla klasy scenariusza.

4. Policz fingerprint:
- `datasetFingerprint = sha256(canonical_json(candidates + selector metadata + runtimeSettingsRevision))`.

5. Zapisz resolved metadata do raportu runu:
- `datasetKey`, `datasetRevision`, `commitKey`, `datasetFingerprint`, `candidateCount`.

## 4.3 Gwarancje determinismu datasetu

1. Dwa runy z tym samym `datasetFingerprint` MUSZA miec identyczny input workload.
2. Zmiana runtime settings lub candidate list MUSI zmienic `datasetFingerprint`.
3. Harness NIE moze cicho fallbackowac z `pinned` do `latest`.

## 5. Kontrakt formatu wynikow

Kazdy run benchmarkowy MUSI wygenerowac artefakty:
1. `benchmark-report.json` (machine-readable, kanoniczny)
2. `benchmark-events.jsonl` (event stream)
3. `benchmark-summary.md` (human-readable)

## 5.1 benchmark-report.json (minimal contract)

```json
{
  "specVersion": "r63",
  "runId": "string",
  "generatedAt": "2026-05-24T12:00:00.000Z",
  "environment": {
    "gitCommit": "string",
    "pipelineVersion": "string",
    "runtimeSettingsRevision": 1,
    "nodeVersion": "string",
    "cpuModel": "string",
    "cpuCores": 8,
    "memoryGb": 32,
    "osName": "string",
    "osVersion": "string"
  },
  "scenario": {
    "pipelineType": "placeable",
    "scenarioId": "PL-2-vfx-heavy",
    "scale": "M",
    "concurrencyProfile": "serial"
  },
  "dataset": {
    "datasetKey": "placeable/PL-2-vfx-heavy/M/serial",
    "datasetRevision": 17,
    "commitKey": "string",
    "datasetFingerprint": "sha256:...",
    "selector": "latest"
  },
  "execution": {
    "warmupRuns": 3,
    "measuredRuns": 15,
    "cooldownMs": 1000,
    "timeoutMs": 30000
  },
  "summary": {
    "status": "PASS|WARN|FAIL|REGRESSION",
    "successRate": 1.0,
    "retryRate": 0.0,
    "retryExhaustedCount": 0,
    "determinismDriftCount": 0,
    "jobsPerMinute": 84.2,
    "jobDurationMs": {
      "mean": 690.4,
      "p50": 672.1,
      "p95": 801.3,
      "p99": 820.0,
      "stddev": 48.3,
      "coefficientOfVariation": 0.07
    },
    "lock": {
      "waitP95Ms": 44.8,
      "holdP95Ms": 210.3,
      "conflictRate": 0.0
    }
  },
  "stages": {
    "lock.acquire": { "p95Ms": 44.8, "errorRate": 0.0 },
    "fetch.source": { "p95Ms": 120.2, "errorRate": 0.0 },
    "transform.main": { "p95Ms": 370.5, "errorRate": 0.0 },
    "persist.artifact": { "p95Ms": 140.4, "errorRate": 0.0 },
    "determinism.compare": { "p95Ms": 21.6, "errorRate": 0.0 },
    "lock.release": { "p95Ms": 8.7, "errorRate": 0.0 }
  },
  "runToRunComparison": {
    "baselineRunId": "2026-05-20-main-r63",
    "baselineDatasetFingerprint": "sha256:...",
    "candidateRunId": "bench-2026-05-24T12-00-00Z-main",
    "p95DeltaPct": 4.2,
    "p99DeltaPct": 3.1,
    "retryRateDeltaPp": 0.0,
    "lockConflictDeltaPp": 0.0,
    "driftDelta": 0,
    "regression": false
  }
}
```

## 5.2 benchmark-events.jsonl

Kazdy event MUSI miec minimum:
1. `timestamp` (UTC ISO8601)
2. `runId`
3. `pipelineType`
4. `scenarioId`
5. `stage`
6. `attempt`
7. `durationMs`
8. `status`
9. `error.code` (opcjonalnie)
10. `error.retryable` (opcjonalnie)

## 5.3 benchmark-summary.md

Sekcje wymagane:
1. Run Metadata
2. Scenario + Dataset Resolution
3. PASS/FAIL/REGRESSION Matrix
4. Top deltas vs baseline
5. Retry/Lock diagnostics
6. Alarm decisions

## 6. Kontrakt porownywania run-to-run

## 6.1 Preconditions porownania

1. Porownanie jest dopuszczalne tylko gdy zgodne sa:
- `pipelineType`, `scenarioId`, `scale`, `concurrencyProfile`.

2. `datasetFingerprint`:
- jesli identyczny -> `strictComparable=true`.
- jesli rozny -> `strictComparable=false`, raportuj tylko trend informacyjny (bez release regression gate).

## 6.2 Zrodla baseline

Kolejnosc wyboru baseline:
1. ostatni zaakceptowany baseline na `main` dla tego samego scenario key,
2. rolling median z ostatnich 5 udanych runow nocnych,
3. fallback: brak baseline -> status `NO_BASELINE` (bez regression fail).

## 6.3 Metryki porownania

Harness MUSI liczyc:
1. `p50DeltaPct`
2. `p95DeltaPct`
3. `p99DeltaPct`
4. `meanDeltaPct`
5. `retryRateDeltaPp`
6. `lockConflictDeltaPp` (profil `contention`)
7. `determinismDriftDelta`
8. `successRateDeltaPp`

## 6.4 Zasady klasyfikacji porownania

1. `REGRESSION`
- przekroczony dowolny prog regresji z sekcji 7.

2. `COMPARABLE_IMPROVEMENT`
- brak przekroczen i co najmniej jedna kluczowa metryka poprawiona (`p95`, `retryRate`, `lockConflictRate`).

3. `COMPARABLE_STABLE`
- brak przekroczen, zmiany mieszcza sie w strefie neutralnej.

4. `NON_COMPARABLE_DATASET`
- rozny `datasetFingerprint`; brak decyzji release-gate o regresji.

## 7. Progi alarmowe (alarm thresholds)

## 7.1 Hard fail (alarm krytyczny)

Scenariusz oznacz jako `FAIL`, jezeli:
1. `successRate < 99.0%`
2. `retryExhaustedCount > 0`
3. dla scenariuszy determinism (`AR-5-*`) `determinismDriftCount > 0`
4. brak wymaganych artefaktow wyjsciowych (`report`, `events`, `summary`)

## 7.2 Regression fail (alarm wydajnosciowy)

Przy `strictComparable=true`, oznacz `REGRESSION`, jezeli:
1. `p95DeltaPct > +20%`
2. albo `retryRateDeltaPp > +5.0`
3. albo (`concurrencyProfile=contention` i `lockConflictDeltaPp > +2.0`)
4. albo `successRateDeltaPp < -1.0`

## 7.3 Warning (alarm ostrzegawczy)

Oznacz `WARN`, jezeli:
1. `coefficientOfVariation > 0.25`
2. `p99/p50 > 3.0`
3. `strictComparable=false` przy triggerze `ci` (brak twardej porownywalnosci)
4. `dataset selector=latest` i `datasetRevision` zmienil sie miedzy warmup a measured (niedeterministyczne zrodlo)

## 7.4 Alarm envelope (machine output)

Kazdy alarm MUSI byc emitowany jako rekord:

```json
{
  "alarmId": "bench.alarm.regression.p95",
  "severity": "critical|high|medium",
  "scenarioKey": "placeable/PL-2-vfx-heavy/M/serial",
  "runId": "bench-2026-05-24T12-00-00Z-main",
  "metric": "p95DeltaPct",
  "actual": 24.7,
  "threshold": 20.0,
  "unit": "%",
  "decision": "REGRESSION",
  "createdAt": "2026-05-24T12:04:31.120Z"
}
```

## 8. Minimal acceptance criteria (R63)

1. Harness waliduje request wg sekcji 3 i odrzuca niepoprawne wejscie przed uruchomieniem jobow.
2. Harness rozwiazuje dataset wg sekcji 4 i zawsze raportuje `datasetFingerprint`.
3. Harness eksportuje trzy artefakty wg sekcji 5.
4. Harness wykonuje run-to-run comparison wg sekcji 6 i rozroznia przypadki `strictComparable` vs `NON_COMPARABLE_DATASET`.
5. Harness emituje alarmy i decyzje PASS/WARN/FAIL/REGRESSION wg sekcji 7.
6. Brak silent fallbackow z `pinned` do `latest` i brak modyfikacji progu bez jawnego `thresholdProfile`.
