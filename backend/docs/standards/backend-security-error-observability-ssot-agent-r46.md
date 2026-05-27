# Backend Security/Error/Observability SSOT (Draft, Agent R46)

## Cel i zakres
Jedna norma implementacyjna dla endpointów backendowych (szczególnie processing: `placeable/creature/area`) obejmująca: autoryzację, kontrakt błędów oraz observability/SLO. Ten dokument jest nadrzędnym punktem odniesienia dla implementacji i review.

## 1) Security i autoryzacja (MUST)
1. Każdy endpoint nieoznaczony `@Public()` MUST mieć `@Roles(...)` (na metodzie lub przez class-level fallback).
2. Brak efektywnego `@Roles(...)` dla endpointu niepublicznego oznacza deny-by-default (`403 FORBIDDEN_ROLE`).
3. Każda operacja mutująca MUST mieć jawne `@Permissions(...)`; nie polegamy na samych rolach ani na UI.
4. `AccessGuard` używa `getAllAndOverride(handler, class)`:
   - metadata z metody nadpisuje klasę,
   - brak automatycznego merge `@Roles/@Permissions`.
5. Class-level dekoratory stosujemy tylko gdy wszystkie niepubliczne metody mają identyczną politykę; wyjątki MUST być method-level.

### Processing matrix (minimum)
- Read (`GET list/details`): role `viewer,builder,dm,admin` + permission `scene.read`.
- Preview (`GET .../preview`): role `viewer,builder,dm,admin` + permission `asset.preview`.
- Placeable/Area start (`POST`): role `builder,admin` + permission `scene.edit`.
- Placeable/Area apply (`POST .../apply`): role `builder,admin` + permission `asset.place`.
- Placeable/Area delete/cancel (`DELETE`): role `builder,admin` + permission `asset.delete`.
- Creature start/apply/delete: role `dm,admin` + permission `dm.spawn_creature` (do czasu wydzielenia osobnego permission do delete/cancel).

## 2) Error contract i semantyka (MUST)
1. Obowiązuje `AppException/ErrorEnvelope`: `code`, `message`, `details[]`, `retryable`.
2. Dla pipeline używamy stabilnych kodów `PIPELINE_<AREA>_<CAUSE>`.
3. `retryable=true` wyłącznie dla błędów przejściowych (timeout/dependency/lock/backpressure/rate limit).
4. Minimalne mapowanie:
   - `422` + `retryable=false`: validation/business rule (`VALIDATION_FAILED`, `PIPELINE_INPUT_INVALID`),
   - `404` + `false`: not found (`PIPELINE_*_NOT_FOUND`),
   - `409` + `false`: state conflict,
   - `503/504` + `true`: dependency unavailable/timeout, lock timeout,
   - `500`: internal/stage failed (domyślnie `false`, tylko jawnie tymczasowe przypadki mogą mieć `true`).
5. Kody kluczowe R15:
   - `PIPELINE_SOURCE_LOCK_CONFLICT` -> `409`, zwykle `retryable=true`,
   - `PIPELINE_LOCK_TIMEOUT` -> `504`, `retryable=true`,
   - `PIPELINE_DETERMINISM_DRIFT` -> `500`, `retryable=false`,
   - `PIPELINE_RETRY_EXHAUSTED` -> `503/500`, `retryable=false` dla klienta synchronicznego.

## 3) Observability, SLI/SLO i alerting (MUST)
1. Logi strukturalne JSON z `requestId`, `jobId`, `pipelineType`, `stage`, `attempt`, `error.code`, `retryable`, `durationMs`; bez sekretów i raw payloadów.
2. Metryki (niska kardynalność, prefix `aurora_pipeline_`): jobs, attempts, retries, drift, lock conflicts + histograms duration/lock wait.
3. Zakazane etykiety metryk: `requestId`, `jobId`, `sourcePath`, pola wysokiej kardynalności z `details`.
4. Tracing: root span `pipeline.job`, child spans co najmniej: lock acquire/release, fetch, transform, persist, determinism compare, retry backoff.
5. Docelowe SLO:
   - success ratio miesięcznie: >= 99.5% globalnie, >= 99.0% per pipeline type,
   - retry recovery (7d): >= 92%,
   - determinism drift (30d): < 0.1% (24h burst < 0.5%),
   - lock conflict rate (7d): < 1.0%, lock wait P95 < 2s.
6. Alerty krytyczne: szybki burn-rate SLO, drift spike, retry exhausted burst; ostrzegawcze: retry storm, lock conflict/wait regressions.

## 4) Definition of Done (dla nowych endpointów)
1. Dekoratory `@Roles` i `@Permissions` zgodne z powyższą matrycą i regułą override.
2. Każdy błąd domenowy mapowany do `code/status/retryable` zgodnie z normą.
3. Każdy retry/drift/lock event emitowany w logach, metrykach i trace.
4. Testy jednostkowe/e2e pokrywają: auth deny-by-default, permission checks, error mapping, retryable semantics.
