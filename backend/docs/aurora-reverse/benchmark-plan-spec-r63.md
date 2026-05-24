# Benchmark Plan Spec R63 (Aurora Reverse)

## 1. Cel dokumentu
Ten dokument definiuje benchmark processingu dla trzech pipeline typow:
- `placeable`
- `creature`
- `area`

Spec obejmuje:
- zestaw workloadow i scenariuszy,
- protokol uruchamiania,
- metryki i progi regresji,
- format raportow (`summary`, `raw`, `events`).

Zakres opiera sie o dane Aurora Reverse i aktualny zestaw benchmark candidates.

## 2. Zrodla danych (Aurora Reverse)
Zrodla referencyjne:
- `scene.json` (kandydaci placeable/VFX)
- `area-data` dla `wnd_slms_swamp__with_placeables` (kandydaci door)

Kandydaci referencyjni (runtime buckets):

| Bucket | Resref | Triangles | Meshes | Emitters | Extra | Source |
|---|---|---:|---:|---:|---|---|
| `placeable_heavy_no_vfx` | `c_wingsmeph` | 659 | 16 | 0 | - | `scene.json` |
| `placeable_heavy_vfx` | `ad_top_lion_1` | 798 | 28 | 1 | - | `scene.json` |
| `placeable_vfx_plc_alt` | `plc_x02` | 112 | 5 | 3 | - | `scene.json` |
| `door_heavy_instance` | `tn_sdoor_14` | 250 | 10 | 0 | `doorIndex=12` | `area-data` |
| `door_heavy_single_mesh` | `tn_gdoor_05` | 190 | 6 | 0 | `maxSingleMeshTriangles=102`, `doorIndex=8` | `area-data` |

Kontekst obszaru dla drzwi:
- `areaResref = wnd_slms_swamp__with_placeables`

## 3. Cele benchmarku
## 3.1 Placeable processing
Zweryfikowac koszt processingu dla:
- ciezkiego modelu bez VFX,
- ciezkiego modelu z VFX,
- modelu o wysokim emitter pressure przy niskim geo.

## 3.2 Creature processing
Zweryfikowac, jak obciazenie sceny placeable (anchor load) wplywa na processing `creature`:
- spawn/transform pojedynczego creature,
- serie spawnow przy rosnacym kontekscie placeable,
- stabilnosc czasu i retry behavior.

## 3.3 Area processing
Zweryfikowac koszt processingu obszaru z naciskiem na:
- kompozycje mieszane (placeable + creature),
- koszt drzwi (instance heavy i single mesh peak),
- determinism oraz lock contention przy rownoleglych jobach.

## 4. Scenariusze workload
## 4.1 Zasada skali
Kazdy scenariusz ma trzy skale:
- `S` (small): 1x candidate payload
- `M` (medium): 5x candidate payload
- `L` (large): 20x candidate payload

Wielokrotnosc oznacza zwiekszanie liczby obiektow w jobie, nie modyfikacje geometrii pojedynczego assetu.

## 4.2 Placeable scenarios
- `PL-1-no-vfx-heavy`: `c_wingsmeph`
- `PL-2-vfx-heavy`: `ad_top_lion_1`
- `PL-3-vfx-emitter-pressure`: `plc_x02`
- `PL-4-door-instance-heavy`: `tn_sdoor_14`
- `PL-5-door-single-mesh-peak`: `tn_gdoor_05`

## 4.3 Creature scenarios
Creature benchmark korzysta z tych samych anchorow placeable jako tlo obciazenia:
- `CR-1-baseline`: creature bez anchorow
- `CR-2-no-vfx-anchor`: creature + `c_wingsmeph`
- `CR-3-vfx-anchor`: creature + `ad_top_lion_1`
- `CR-4-emitter-anchor`: creature + `plc_x02`
- `CR-5-door-anchor-mix`: creature + (`tn_sdoor_14` + `tn_gdoor_05`)

Uzasadnienie: brak osobnego zestawu candidate metrics dla creature w Aurora Reverse, wiec obciazenie benchmarkowe dla `creature` jest kontrolowane przez scene anchors z potwierdzonym profilem geometrii/emitterow.

## 4.4 Area scenarios
- `AR-1-placeable-stress`: area z miksu `c_wingsmeph` + `ad_top_lion_1` + `plc_x02`
- `AR-2-door-stress`: area z miksu `tn_sdoor_14` + `tn_gdoor_05`
- `AR-3-mixed-composition`: area mieszana (placeable + creature + door)
- `AR-4-lock-contention`: rownolegle uruchamiane joby area na tym samym source scope
- `AR-5-determinism-repeat`: ten sam input hash uruchomiony wielokrotnie

## 5. Protokol uruchamiania benchmarku
## 5.1 Srodowisko
Kazdy raport MUSI zawierac:
- `pipelineVersion`
- `runtimeSettingsRevision`
- `gitCommit`
- `nodeVersion`
- `cpuModel`, `cpuCores`
- `memoryGb`
- `osName`, `osVersion`

## 5.2 Sekwencja runu
Dla kazdego `(pipelineType, scenarioId, scale)`:
1. `warmupRuns = 3` (nie raportowane do statystyki finalnej)
2. `measuredRuns = 15`
3. `cooldownMs = 1000` miedzy runami
4. `timeoutMs` per job:
- `placeable`: 30000
- `creature`: 30000
- `area`: 60000

## 5.3 Rownoleglosc
Dwa profile:
- `serial`: `concurrency = 1`
- `contention`: `concurrency = 4`

Wynik finalny scenariusza raportowany osobno dla obu profili.

## 5.4 Kontrola jakosci pomiaru
- odrzucic runy z awaria infrastrukturalna poza pipeline logic (`host reboot`, `oom killer`),
- timestampy i trwania zawsze w UTC i ms,
- agregaty latencji: `p50`, `p95`, `p99`, `mean`, `stddev`,
- policzyc `coefficientOfVariation = stddev / mean`.

## 6. Metryki benchmarkowe
## 6.1 Job-level
- `jobDurationMs`
- `finalStatus` (`completed`, `failed`, `completed_with_drift`)
- `attemptCount`
- `retryCount`
- `retryExhausted` (bool)
- `determinismDrift` (bool)

## 6.2 Stage-level
Per stage (`lock.acquire`, `fetch.source`, `transform.*`, `persist.artifact`, `determinism.compare`, `lock.release`):
- `durationMs`
- `status` (`ok`, `error`, `retry`)
- `errorCode` (jesli wystapil)

## 6.3 Lock/consistency
- `lockWaitMs`
- `lockHoldMs`
- `lockConflictCount`
- `driftEventCount`

## 6.4 Throughput
- `jobsPerMinute` dla okna scenariusza
- `completedJobsPerMinute`

## 7. Reguly pass/fail
## 7.1 Hard fail
Scenariusz jest `FAIL`, jesli:
- `successRate < 99.0%` dla measured runs,
- `retryExhaustedCount > 0`,
- `determinismDriftCount > 0` dla scenariusza `AR-5-determinism-repeat`.

## 7.2 Regression fail (vs baseline)
Scenariusz jest `REGRESSION`, jesli:
- `p95JobDurationMs` wzrosnie o > 20% vs baseline,
- albo `retryRate` wzrosnie o > 5 pp,
- albo `lockConflictRate` wzrosnie o > 2 pp w profilu `contention`.

## 7.3 Warning
- `coefficientOfVariation > 0.25` (niestabilne wyniki),
- `p99/p50 > 3.0` (wysoki tail latency).

## 8. Format raportow
## 8.1 Artefakty
Kazdy benchmark run produkuje 3 artefakty:
- `benchmark-summary.md` (human-readable)
- `benchmark-report.json` (machine-readable)
- `benchmark-events.jsonl` (event stream)

## 8.2 benchmark-report.json (kontrakt)
```json
{
  "specVersion": "r63",
  "generatedAt": "2026-05-24T12:00:00.000Z",
  "environment": {
    "pipelineVersion": "string",
    "runtimeSettingsRevision": 1,
    "gitCommit": "string",
    "nodeVersion": "string",
    "cpuModel": "string",
    "cpuCores": 8,
    "memoryGb": 32,
    "osName": "string",
    "osVersion": "string"
  },
  "candidates": {
    "placeable_heavy_no_vfx": { "resref": "c_wingsmeph", "triangles": 659, "meshes": 16, "emitters": 0 },
    "placeable_heavy_vfx": { "resref": "ad_top_lion_1", "triangles": 798, "meshes": 28, "emitters": 1 },
    "placeable_vfx_plc_alt": { "resref": "plc_x02", "triangles": 112, "meshes": 5, "emitters": 3 },
    "door_heavy_instance": { "resref": "tn_sdoor_14", "triangles": 250, "meshes": 10, "emitters": 0, "areaResref": "wnd_slms_swamp__with_placeables", "doorIndex": 12 },
    "door_heavy_single_mesh": { "resref": "tn_gdoor_05", "triangles": 190, "meshes": 6, "emitters": 0, "maxSingleMeshTriangles": 102, "areaResref": "wnd_slms_swamp__with_placeables", "doorIndex": 8 }
  },
  "results": [
    {
      "pipelineType": "placeable",
      "scenarioId": "PL-2-vfx-heavy",
      "scale": "M",
      "concurrencyProfile": "serial",
      "warmupRuns": 3,
      "measuredRuns": 15,
      "status": "PASS",
      "summary": {
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
        "transform.placeable": { "p95Ms": 370.5, "errorRate": 0.0 },
        "persist.artifact": { "p95Ms": 140.4, "errorRate": 0.0 },
        "determinism.compare": { "p95Ms": 21.6, "errorRate": 0.0 },
        "lock.release": { "p95Ms": 8.7, "errorRate": 0.0 }
      },
      "baselineComparison": {
        "baselineId": "2026-05-20-main-r62",
        "p95DeltaPct": 4.2,
        "retryRateDeltaPp": 0.0,
        "lockConflictDeltaPp": 0.0,
        "regression": false
      }
    }
  ]
}
```

## 8.3 benchmark-events.jsonl (kontrakt)
Kazda linia to pojedynczy event JSON zgodny ze standardem observability pipeline.

Minimalne pola:
- `timestamp`
- `level`
- `event`
- `requestId`
- `jobId`
- `pipelineType`
- `stage`
- `attempt`
- `maxAttempts`
- `durationMs`
- `pipelineVersion`
- `error.code` (opcjonalnie)
- `error.retryable` (opcjonalnie)

Przyklad:
```json
{"timestamp":"2026-05-24T12:00:00.000Z","level":"info","event":"pipeline.stage.completed","requestId":"req-1","jobId":"job-1","pipelineType":"area","stage":"transform.area","attempt":1,"maxAttempts":3,"durationMs":412.7,"pipelineVersion":"v1.3.0"}
```

## 8.4 benchmark-summary.md (uklad)
Sekcje wymagane:
1. `Run Metadata`
2. `Candidate Set` (5 kandydatow z metrykami)
3. `Scenario Matrix` (PASS/FAIL/REGRESSION)
4. `Top Regressions by p95`
5. `Retry and Lock Diagnostics`
6. `Determinism Findings`
7. `Release Recommendation` (`go`, `go_with_risk`, `no_go`)

## 9. Macierz scenariuszy do uruchamiania
Minimalny zestaw release-gate:
- Placeable: `PL-1`, `PL-2`, `PL-3`, `PL-4`, `PL-5` w skalach `S,M,L` i profilach `serial,contention`
- Creature: `CR-1`, `CR-3`, `CR-5` w skalach `S,M,L` i profilach `serial,contention`
- Area: `AR-1`, `AR-2`, `AR-3`, `AR-4`, `AR-5` w skalach `S,M,L` i profilach `serial,contention`

## 10. Harmonogram i utrzymanie baseline
- Baseline referencyjny aktualizowac po kazdym zaakceptowanym release pipeline.
- Oznaczenie baseline: `<yyyy-mm-dd>-<branch>-<specVersion>`.
- Porownanie regresji zawsze do:
1. ostatniego baseline na `main`,
2. oraz rolling median z ostatnich 5 udanych runow nocnych.

## 11. Kryteria gotowosci implementacyjnej
Spec R63 uznaje sie za implementowalny, gdy benchmark runner:
- potrafi odtworzyc wszystkie scenariusze z sekcji 9,
- eksportuje trzy artefakty z sekcji 8,
- wylicza pass/fail/regression wg sekcji 7,
- zapisuje candidate metadata dokladnie dla: `c_wingsmeph`, `ad_top_lion_1`, `plc_x02`, `tn_sdoor_14`, `tn_gdoor_05`.
