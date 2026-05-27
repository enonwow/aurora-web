# Benchmark Scale Tiers R65 (Aurora Reverse)

Data: 2026-05-24
Status: Draft (CI benchmark scaling gate)
Zakres: skalowanie benchmarkow processingu (`small/medium/large/xlarge`) dla pipeline `placeable|creature|area` z metrykami `throughput/latency/memory` i jednoznacznym pass/fail dla CI.

## 1. Cel

Ten dokument doprecyzowuje R63 o czwarty poziom skali (`xlarge`) i normalizuje gate wydajnosciowy dla CI:
1. wspolny model skali workloadu,
2. wspolny zestaw metryk i sposob agregacji,
3. jednoznaczne kryteria `PASS|WARN|FAIL|REGRESSION` dla PR/nightly/release.

## 2. Podstawa (benchmark candidates + Aurora Reverse)

Dokument opiera sie o:
1. `backend/docs/aurora-reverse/benchmark-plan-spec-r63.md`
2. `backend/docs/aurora-reverse/benchmark-harness-contract-spec-r63.md`
3. `backend/docs/aurora-reverse/admin-runtime-settings-contract-spec-r63.md` (`benchmarkCandidates`)
4. kanoniczne kandydaty Aurora Reverse wykorzystywane juz w R63.

## 3. Kanoniczni kandydaci benchmarkowi

| Candidate key | Resref | Triangles | Meshes | Emitters | Notes |
|---|---|---:|---:|---:|---|
| `placeable_heavy_no_vfx` | `c_wingsmeph` | 659 | 16 | 0 | scene candidate |
| `placeable_heavy_vfx` | `ad_top_lion_1` | 798 | 28 | 1 | scene candidate |
| `placeable_vfx_plc_alt` | `plc_x02` | 112 | 5 | 3 | emitter pressure candidate |
| `door_heavy_instance` | `tn_sdoor_14` | 250 | 10 | 0 | `areaResref=wnd_slms_swamp__with_placeables` |
| `door_heavy_single_mesh` | `tn_gdoor_05` | 190 | 6 | 0 | `maxSingleMeshTriangles=102` |

Regula datasetu:
1. `runtime-default`: kandydaci z `benchmarkCandidates` runtime settings.
2. `reverse-canonical`: tabela powyzej.
3. `pinned`: `datasetKey + commitKey + expectedRevision`.
4. Brak silent fallback z `pinned` do `latest` (fail-fast).

## 4. Scale tiers

### 4.1 Mnozniki skali

| Tier | Alias | Multiplier |
|---|---|---:|
| `small` | `S` | 1x |
| `medium` | `M` | 5x |
| `large` | `L` | 20x |
| `xlarge` | `XL` | 50x |

Definicja: `multiplier` zwieksza liczbe obiektow/jobow w workloadzie; nie modyfikuje geometrii pojedynczego assetu.

### 4.2 Mapping tier -> workload

1. `placeable`: powielanie kandydatow `PL-*` zgodnie z mnoznikiem tier.
2. `creature`: anchor load (`CR-*`) skaluje sie tym samym mnoznikiem; `creature` payload pozostaje semantycznie ten sam.
3. `area`: kompozycje `AR-*` skaluja liczebnosc lane (`placeable|door|creature`) zgodnie z tier.

## 5. Metryki i agregacja

### 5.1 Throughput

Wymagane:
1. `jobsPerMinute`
2. `completedJobsPerMinute`

Agregacja: liczona na measured runs, osobno dla `serial` i `contention`.

### 5.2 Latency

Wymagane:
1. `jobDurationMs.mean`
2. `jobDurationMs.p50`
3. `jobDurationMs.p95`
4. `jobDurationMs.p99`
5. `jobDurationMs.stddev`
6. `jobDurationMs.coefficientOfVariation`

Dodatkowo stage-level `p95Ms` dla: `lock.acquire`, `fetch.source`, `transform.main`, `persist.artifact`, `determinism.compare`, `lock.release`.

### 5.3 Memory

Wymagane:
1. `memory.peakRssMb` (max z measured runs)
2. `memory.p95RssMb`
3. `memory.oomCount`
4. `memory.gcPauseP95Ms` (jesli runtime eksportuje)

Wymaganie telemetryczne: brak `peakRssMb` uniemozliwia ocene gate i daje `FAIL` (invalid report).

## 6. Pass/fail dla CI

### 6.1 Hard fail (kazdy tier)

Scenariusz ma `FAIL`, jesli wystapi dowolny warunek:
1. `successRate < 99.0%`
2. `retryExhaustedCount > 0`
3. `oomCount > 0`
4. dla `AR-5-determinism-repeat`: `determinismDriftCount > 0`
5. brak wymaganych metryk throughput/latency/memory.

### 6.2 Regression fail vs baseline (ten sam `datasetFingerprint`)

Scenariusz ma `REGRESSION`, jesli wystapi dowolny warunek:
1. `p95JobDurationMs` wzrost `> 20%`
2. `p99JobDurationMs` wzrost `> 25%`
3. `retryRate` wzrost `> 5 pp`
4. `lockConflictRate` wzrost `> 2 pp` (profil `contention`)
5. `completedJobsPerMinute` spadek `> 15%`
6. `peakRssMb` wzrost `> 25%`

### 6.3 Tier absolute memory caps (CI runners 32 GB)

| Tier | `peakRssMb` hard cap |
|---|---:|
| `small` | 1536 |
| `medium` | 3072 |
| `large` | 8192 |
| `xlarge` | 14336 |

Przekroczenie cap = `FAIL` (niezaleznie od porownania do baseline).

### 6.4 Warning (niestabilnosc)

Scenariusz ma `WARN`, jesli nie ma fail/regression, ale:
1. `coefficientOfVariation > 0.25`
2. `p99/p50 > 3.0`
3. `gcPauseP95Ms > 200`.

## 7. CI gate profiles

### 7.1 PR gate (`benchmark-pr-smoke`)

Zakres:
1. `small` + `medium`
2. `serial` only
3. scenariusze: `PL-2`, `CR-3`, `AR-3`

Decyzja:
1. `PASS` gdy wszystkie scenariusze `PASS` albo `WARN` bez `FAIL|REGRESSION`.
2. `FAIL` gdy dowolny scenariusz `FAIL|REGRESSION`.

### 7.2 Nightly gate (`benchmark-nightly-scale`)

Zakres:
1. `small|medium|large` dla pelnej macierzy `PL-*|CR-*|AR-*`
2. `xlarge` dla `PL-2`, `AR-2`, `AR-4`
3. profile `serial` i `contention`

Decyzja:
1. `PASS` gdy brak `FAIL|REGRESSION`.
2. `UNSTABLE` gdy tylko `WARN`.
3. `FAIL` gdy wystapi `FAIL|REGRESSION`.

### 7.3 Release gate (`benchmark-release-gate`)

Zakres:
1. `medium|large|xlarge`
2. profile `serial` i `contention`
3. wymagane scenariusze: `PL-2`, `PL-5`, `CR-5`, `AR-3`, `AR-4`, `AR-5`

Decyzja:
1. `PASS` tylko gdy wszystkie wymagane scenariusze sa `PASS`.
2. `FAIL` dla dowolnego `WARN|FAIL|REGRESSION` (release wymaga stanu czystego).

## 8. Kontrakt raportu (R65 delta)

`benchmark-report.json` rozszerza R63 o:

```json
{
  "specVersion": "r65",
  "scenario": {
    "scale": "S|M|L|XL"
  },
  "summary": {
    "status": "PASS|WARN|FAIL|REGRESSION",
    "jobsPerMinute": 0,
    "completedJobsPerMinute": 0,
    "jobDurationMs": {
      "mean": 0,
      "p50": 0,
      "p95": 0,
      "p99": 0,
      "stddev": 0,
      "coefficientOfVariation": 0
    },
    "memory": {
      "peakRssMb": 0,
      "p95RssMb": 0,
      "oomCount": 0,
      "gcPauseP95Ms": 0
    }
  }
}
```

## 9. Kryterium adopcji

Spec R65 jest wdrozony, gdy:
1. harness akceptuje `XL` i mapuje je na `50x`,
2. raport eksportuje komplet throughput/latency/memory,
3. CI ma trzy profile gate (`pr-smoke`, `nightly-scale`, `release-gate`) z decyzjami zgodnymi z sekcja 6 i 7.
