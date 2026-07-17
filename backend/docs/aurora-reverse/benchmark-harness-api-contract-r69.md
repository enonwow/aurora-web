# Benchmark Harness API Contract R69 (Aurora Reverse)

Data: 2026-05-24  
Status: Draft (normative integration contract: benchmark harness <-> backend Processing API)  
Owner: Agent E7 (Benchmark Harness API Contract)  
Zakres: endpointy, payloady, statusy, artefakty i raportowanie CI dla benchmark harnessu, spojne z R67 (data collection) i R68 (code skeleton harnessu).

## 1. Cel i zgodnosc

R69 definiuje warstwe integracji HTTP pomiedzy harness runnerem benchmarkowym a backend Processing API.

Normatywna zgodnosc:
1. R67 (`benchmark-data-collection-contract-r67.md`): metryki, labels, sampling, retention, `dataCollection`.
2. R68 (`code-skeleton-benchmark-harness-r68.md`): profile `smoke|pr|nightly`, runner + collectory.
3. R63/R67 processing API (`processing-api-shape-spec-r63.md`, `processing-api-examples-r67.md`): envelope, status lifecycle, idempotency, canonical `PIPELINE_*` errors.

R69 nie zmienia kontraktu domenowego processing pipeline; doklada tylko kontrakt integracji benchmarkowej.

## 2. Uczestnicy i odpowiedzialnosci

1. `Benchmark Harness Runner`
- uruchamia scenariusze benchmarkowe,
- wywoluje API processing,
- agreguje metryki i publikuje artefakty.

2. `Processing API Backend`
- tworzy i prowadzi lifecycle jobow (`queued -> running -> ...`),
- zwraca statusy, diagnostyke i bledy `PIPELINE_*`.

3. `CI Gate Adapter`
- mapuje wynik benchmarku na wynik joba CI,
- publikuje artefakty i statusy gate (`PASS|WARN|FAIL|REGRESSION`).

## 3. Konwencje transportowe

1. Base path: `/api/v1`.
2. Response envelope: `SuccessEnvelope<T>` i `ErrorEnvelope` (bez zmian).
3. Wymagane naglowki:
- `Authorization: Bearer <token>`
- `Idempotency-Key` dla mutujacych start/cancel/retry.
4. Korelacja:
- request: `x-request-id` (optional),
- response: `x-request-id` (required by backend contract).
5. Daty: ISO-8601 UTC.
6. Harness MUSI logowac surowe `requestId` i `jobId` dla kazdego wywolania API.

## 4. Endpointy integracyjne (normatywne)

## 4.1 Start job (wymagany)

`POST /api/v1/processing/{type}` gdzie `type in {placeable,creature,area}`.

HTTP:
1. `202 Accepted` - nowy job.
2. `200 OK` + `x-idempotency-replayed: true` - replay idempotentny.
3. `4xx/5xx` - `ErrorEnvelope` z `PIPELINE_*` lub auth/validation error.

Harness MUST:
1. generowac `Idempotency-Key` per scenario attempt:
- format: `bench_<runId>_<scenarioKeyHash>_<attempt>`
2. stosowac ten sam key przy retry transportowym tego samego wywolania start.
3. NIE recznie ponawiac startu z nowym key, jesli poprzedni start mogl byc przyjety (retry tylko z tym samym key do czasu jednoznacznej odpowiedzi).

## 4.2 Status polling (wymagany)

Preferowana sciezka (R67 examples):
1. `GET /api/v1/processing/jobs/{jobId}`

Alias kompatybilnosci (R63 shape):
2. `GET /api/v1/processing/{type}/{jobId}`

HTTP:
1. `200 OK` - aktualny snapshot joba.
2. `304 Not Modified` - przy `If-None-Match` i braku zmian.
3. `404 PIPELINE_JOB_NOT_FOUND`.

Harness MUST:
1. wspierac `ETag/If-None-Match` gdy backend je wystawia.
2. traktowac `jobVersion` jako monotoniczny znacznik progresu.
3. zakonczyc polling tylko na statusie terminalnym.

## 4.3 Cancel (warunkowy, recovery)

Preferowana sciezka:
1. `POST /api/v1/processing/jobs/{jobId}:cancel`

HTTP:
1. `202` - cancel przyjete.
2. `200` - idempotentny replay cancel.
3. `409 PIPELINE_JOB_STATE_CONFLICT` - job terminalny lub nielegalny stan.

Harness uzywa cancel tylko przy:
1. timeout scenariusza,
2. shutdown CI joba,
3. kontrolowanym cleanup po krytycznej awarii harnessu.

## 4.4 Retry (warunkowy, recovery)

Preferowana sciezka:
1. `POST /api/v1/processing/jobs/{jobId}:retry`

HTTP:
1. `202` - retry przyjete, `attempt+1`.
2. `409 PIPELINE_JOB_STATE_CONFLICT`.

Harness NIE wywoluje retry automatycznie dla kazdego bledu; retry jest sterowany polityka sekcji 8.

## 4.5 Apply lane (zabronione w benchmark run)

`POST /api/v1/processing/{type}/{jobId}/apply` jest poza standardowym benchmarkiem.

Regula:
1. Benchmark run MUST byc `dryRun=true`.
2. Harness MUST NOT wywolywac `apply` w profilach `smoke|pr|nightly`.
3. Wyjatek diagnostyczny wymaga jawnego `thresholdProfile=diagnostic` i flagi operatora.

## 5. Payload startu joba (harness -> API)

## 5.1 Canonical request body

```json
{
  "sourceContext": {
    "areaResref": "lc_market_01",
    "moduleSourceFingerprint": "modfp_8f2a4f27b9",
    "sourcePolicy": "DECOMPILED_PRIMARY",
    "runtimeProfile": "xoreos-nwn"
  },
  "execution": {
    "validationMode": "strict",
    "dryRun": true,
    "timeoutMs": 120000,
    "priority": "batch"
  },
  "expectedRevision": "rev_000184",
  "target": {}
}
```

`target` jest typ-specyficzny i MUSI byc mapowany z `scenario.pipelineType`:
1. `placeable`: `instanceAddressId|templateResRef|transformDraft`.
2. `creature`: `gitIndex|templateResRef|spawnDraft`.
3. `area`: `includeLanes|migrateLegacyObjects`.

## 5.2 Mapowanie z runnera R68

Mapowanie `bench.config.ts`/`ScenarioSpec` -> request:
1. `scenario.id` -> `scenarioId` (wewnetrz metadanych harnessu, nie w payload API).
2. `scenario.timeoutMs` -> `execution.timeoutMs`.
3. `profile` -> `execution.priority`:
- `smoke`: `interactive`
- `pr|nightly`: `batch`
4. `profile` -> `validationMode`:
- `smoke|pr`: `strict`
- `nightly`: `strict` (default), `warn` tylko w `diagnostic`.
5. benchmark default: `execution.dryRun=true` dla wszystkich profili.

## 5.3 Harness metadata (lokalne, poza payload API)

Harness MUSI utrzymywac metadane per scenario-run:
1. `runId`
2. `scenarioKey = <pipelineType>/<scenarioId>/<scale>/<concurrencyProfile>`
3. `datasetFingerprint`
4. `thresholdProfile`:
- `benchmark-pr-smoke`
- `benchmark-nightly-scale`
- `benchmark-release-gate`
- `diagnostic`

Metadane te sa wymagane dla labels R67 i nie sa wysylane jako pola API start request body.

## 6. Kontrakt statusow i mapowanie decyzji

## 6.1 Status lifecycle joba API

Obslugiwane statusy joba:
1. `queued`
2. `running`
3. `retrying`
4. `completed`
5. `completed_with_drift`
6. `failed`
7. `cancelled`

Statusy terminalne:
1. `completed`
2. `completed_with_drift`
3. `failed`
4. `cancelled`

## 6.2 Mapowanie job status -> benchmark sample outcome

1. `completed` -> sample `success=true`, `drift=false`.
2. `completed_with_drift` -> sample `success=true`, `drift=true` + `determinismDriftCount++`.
3. `failed` -> sample `success=false`, `error=lastError.code`.
4. `cancelled` -> sample `success=false`, `error=PIPELINE_JOB_CANCELLED`.

## 6.3 Mapowanie benchmark decisions (R67/R63)

Po agregacji runu harness klasyfikuje scenario-run do:
1. `PASS`
2. `WARN`
3. `FAIL`
4. `REGRESSION`

Reguly pozostaja z R67/R63:
1. hard fail (`successRate`, `retryExhausted`, `oom`, missing metrics) -> `FAIL`.
2. strict comparable + przekroczenie delta progow -> `REGRESSION`.
3. naruszenia warning-only -> `WARN`.
4. brak naruszen -> `PASS`.

## 7. Kontrakt bledow API (harness reaction policy)

Harness MUSI interpretowac `error.code` i `retryable`.

## 7.1 Fail-fast (bez retry start/status)

1. `PIPELINE_IDEMPOTENCY_KEY_REUSED`
2. `PIPELINE_IDEMPOTENCY_KEY_REQUIRED`
3. `PIPELINE_INPUT_INVALID`/`VALIDATION_FAILED`
4. `PIPELINE_APPLY_REVISION_CONFLICT`/`PIPELINE_REVISION_CONFLICT`
5. `FORBIDDEN_*`, `UNAUTHORIZED`, `INVALID_SESSION`

Reakcja:
1. scenario-run `FAIL`
2. alarm: `bench.api.contract_violation` lub `bench.api.authz_failure`

## 7.2 Retryable transport/domain

1. `PIPELINE_SOURCE_LOCK_CONFLICT`
2. `PIPELINE_LOCK_TIMEOUT`
3. `PIPELINE_DEPENDENCY_UNAVAILABLE`
4. `PIPELINE_DEPENDENCY_TIMEOUT`
5. `PIPELINE_RATE_LIMITED`
6. HTTP `429|503|504` z `retryable=true`

Reakcja:
1. bounded retry z backoff: `1s, 2s, 3s, 5s (cap)`.
2. max retry start/status call per sample: `<= 5`.
3. przekroczenie retry budget -> scenario-run `FAIL` z `PIPELINE_RETRY_EXHAUSTED` local marker.

## 8. Polling i timeout policy

1. Pierwszy poll po `recommendedPollAfterMs`, fallback `1000 ms`.
2. Backoff: `1s -> 2s -> 3s -> 5s`.
3. `waitMs` long-poll:
- `smoke`: `0..2000`
- `pr`: `0..5000`
- `nightly`: `0..10000`
4. Scenario timeout (R68 `scenario.timeoutMs`) jest limitem nadrzednym.
5. Po timeout:
- harness wysyla cancel,
- oznacza sample `failed_timeout`,
- emituje alarm `bench.api.job_timeout`.

## 9. Artefakty benchmarkowe (integracja API)

## 9.1 Artefakty wymagane (bez zmian wzgledem R67)

1. `benchmark-report.json`
2. `benchmark-events.jsonl`
3. `benchmark-summary.md`

## 9.2 Rozszerzenia R69 w `benchmark-report.json`

`benchmark-report.json` MUSI pozostac kompatybilny z R67 (`specVersion=r67`) i dodatkowo zawierac:

```json
{
  "integrationContractVersion": "r69",
  "api": {
    "basePath": "/api/v1",
    "startRouteTemplate": "/processing/{type}",
    "statusRouteTemplate": "/processing/jobs/{jobId}",
    "idempotency": {
      "replayCount": 0,
      "keyReuseConflicts": 0
    },
    "http": {
      "callsTotal": 120,
      "callsFailed": 2,
      "retryableFailures": 2,
      "nonRetryableFailures": 0
    },
    "statusDistribution": {
      "completed": 58,
      "completed_with_drift": 1,
      "failed": 1,
      "cancelled": 0
    }
  }
}
```

Regula kompatybilnosci:
1. `specVersion` raportu zostaje `r67`.
2. `integrationContractVersion=r69` identyfikuje warstwe API integration.

## 9.3 Event stream (`benchmark-events.jsonl`)

Harness MUSI emitowac dodatkowe typy eventow API:
1. `api.start.requested`
2. `api.start.accepted`
3. `api.start.replayed`
4. `api.status.polled`
5. `api.status.transition`
6. `api.cancel.requested`
7. `api.retry.requested`
8. `api.error`

Minimalne pola eventu API:
1. `timestamp`
2. `runId`
3. `scenarioKey`
4. `jobId`
5. `http.method`
6. `http.path`
7. `http.status`
8. `requestId`
9. `error.code` (opcjonalnie)
10. `retryable` (opcjonalnie)

## 9.4 Summary markdown (`benchmark-summary.md`)

Sekcje wymagane:
1. `Run Metadata`
2. `Scenario Matrix`
3. `API Reliability Summary`
4. `Gate Decision`
5. `Top Regressions/Warnings`
6. `Recommended Action`

## 10. Kontrakt raportowania CI

## 10.1 Profile i threshold mapping

Mapowanie profili R68 do gate profili:
1. `smoke` -> `benchmark-pr-smoke`
2. `pr` -> `benchmark-pr-smoke`
3. `nightly` -> `benchmark-nightly-scale`
4. `release` (logiczny gate CI, poza runner enum) -> runner `nightly` + `thresholdProfile=benchmark-release-gate`

## 10.2 Wynik joba CI

Dla jednego joba CI:
1. `FAIL` jesli dowolny scenario-run ma `FAIL` lub `REGRESSION`.
2. `UNSTABLE` jesli brak `FAIL|REGRESSION`, ale wystepuje `WARN`.
3. `PASS` jesli wszystkie scenario-runy `PASS`.

Dodatkowa regula release gate:
1. dla `benchmark-release-gate`, `WARN` traktowany jako `FAIL`.

## 10.3 Artefakty CI (publish)

Kazdy job benchmarkowy MUSI publikowac:
1. `benchmark-report.json`
2. `benchmark-events.jsonl`
3. `benchmark-summary.md`

CI SHOULD publikowac tez:
1. `benchmark-gate-result.json` (krotki machine-readable verdict dla workflow logic).

## 10.4 `benchmark-gate-result.json` (recommended)

```json
{
  "contractVersion": "r69",
  "runId": "bench-2026-05-24T12-00-00Z-main",
  "profile": "pr",
  "thresholdProfile": "benchmark-pr-smoke",
  "decision": "PASS|UNSTABLE|FAIL",
  "scenarioTotals": {
    "pass": 12,
    "warn": 1,
    "fail": 0,
    "regression": 0
  },
  "strictComparableCoveragePct": 91.7
}
```

## 11. Reguly kompatybilnosci i migracji

1. R69 jest additive:
- nie lamie existing `processing/*` payloadow,
- nie zmienia status lifecycle API.
2. R69 wspiera obie sciezki status endpoint (`/processing/jobs/{jobId}` preferowane, typed alias dla kompatybilnosci).
3. R69 utrzymuje `benchmark-report.json specVersion=r67`.
4. Przy wdrozeniu, harness moze rolloutowac `integrationContractVersion=r69` etapami per profil CI.

## 12. Acceptance criteria R69

R69 uznaje sie za wdrozone, gdy:
1. Harness korzysta z `POST /processing/{type}` + status polling zgodnie z sekcjami 4 i 8.
2. Idempotency key policy jest egzekwowana i auditowalna (`replayCount`, `keyReuseConflicts`).
3. Job statusy API sa mapowane do benchmark outcome bez luk (`completed|completed_with_drift|failed|cancelled`).
4. Wszystkie wymagane artefakty R67 sa produkowane, a raport zawiera rozszerzenie `integrationContractVersion=r69`.
5. CI gate stosuje reguly `PASS|UNSTABLE|FAIL` oraz release override dla `WARN`.
6. Error handling odroznia fail-fast i retryable zgodnie z sekcja 7, bez nieskonczonych retry.
7. Brak wywolan `apply` w standardowych benchmarkach (`smoke|pr|nightly`).
