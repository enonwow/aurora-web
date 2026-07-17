# Processing Pipeline: standard błędów i walidacji

## Cel
Ujednolicić obsługę błędów w processing pipeline tak, aby:
- zachować obecny kontrakt `AppException` (`code`, `message`, `details`, `retryable`),
- jednoznacznie mapować błędy na status HTTP,
- spójnie oznaczać retryability,
- mieć przewidywalne logi i metryki.

## Aktualny kontrakt (bazowy)
Backend zwraca `ErrorEnvelope`:
- `error.code: string`
- `error.message: string`
- `error.details: Array<{ path: string; reason: string }>`
- `error.retryable: boolean`

To pozostaje bez zmian. Standard dotyczy wartości pól i reguł ich użycia.

## Format kodu błędu domenowego
Format: `PIPELINE_<OBSZAR>_<PRZYCZYNA>`

Przykłady:
- `PIPELINE_INPUT_INVALID`
- `PIPELINE_JOB_NOT_FOUND`
- `PIPELINE_STAGE_TIMEOUT`
- `PIPELINE_DEPENDENCY_UNAVAILABLE`

Reguły:
- uppercase + `_`,
- bez statusu HTTP w nazwie,
- stabilny kod (niezmienny przy refactorze),
- `message` może ewoluować, `code` ma być kluczem automatyzacji.

## Kategorie i mapowanie HTTP/retryability
| Kategoria | Przykładowe kody | HTTP | retryable |
|---|---|---:|---:|
| Walidacja wejścia | `VALIDATION_FAILED`, `PIPELINE_INPUT_INVALID` | 422 | false |
| Konflikt stanu żądania | `PIPELINE_STATE_CONFLICT` | 409 | false |
| Brak zasobu | `PIPELINE_JOB_NOT_FOUND`, `PIPELINE_ARTIFACT_NOT_FOUND` | 404 | false |
| Brak autoryzacji/uprawnień | `UNAUTHORIZED`, `FORBIDDEN_ROLE`, `FORBIDDEN_PERMISSION` | 401/403 | false |
| Ograniczenia biznesowe | `PIPELINE_QUOTA_EXCEEDED`, `PIPELINE_RULE_VIOLATION` | 422 | false |
| Zależność chwilowo niedostępna | `PIPELINE_DEPENDENCY_UNAVAILABLE`, `PIPELINE_UPSTREAM_TIMEOUT` | 503/504 | true |
| Przeciążenie/limit systemowy | `PIPELINE_BACKPRESSURE`, `PIPELINE_RATE_LIMITED` | 429/503 | true |
| Błąd przetwarzania wewnętrznego | `PIPELINE_STAGE_FAILED` | 500 | false* |
| Timeout etapu | `PIPELINE_STAGE_TIMEOUT` | 504 | true |

\* `PIPELINE_STAGE_FAILED` oznaczaj jako `retryable: true` tylko gdy przyczyna jest jawnie tymczasowa (np. lock timeout, transient I/O).

## Minimalny katalog kodów dla processing pipeline (v1)
### Input/validation
- `PIPELINE_INPUT_INVALID` -> 422, retryable false  
Niepoprawny payload pipeline (semantyka, brak pól, złe zakresy).

- `PIPELINE_CONFIG_INVALID` -> 422, retryable false  
Niepoprawna konfiguracja joba/stage.

### Lifecycle/job
- `PIPELINE_JOB_NOT_FOUND` -> 404, retryable false
- `PIPELINE_JOB_ALREADY_EXISTS` -> 409, retryable false
- `PIPELINE_JOB_STATE_CONFLICT` -> 409, retryable false  
Np. próba uruchomienia joba, który już trwa.

### Stages/execution
- `PIPELINE_STAGE_NOT_FOUND` -> 404, retryable false
- `PIPELINE_STAGE_FAILED` -> 500, retryable false (domyślnie)
- `PIPELINE_STAGE_TIMEOUT` -> 504, retryable true
- `PIPELINE_STAGE_CANCELLED` -> 409, retryable false

### Dependencies/infrastructure
- `PIPELINE_DEPENDENCY_UNAVAILABLE` -> 503, retryable true
- `PIPELINE_DEPENDENCY_TIMEOUT` -> 504, retryable true
- `PIPELINE_STORAGE_UNAVAILABLE` -> 503, retryable true
- `PIPELINE_RATE_LIMITED` -> 429, retryable true

## Standard `details`
`details` używamy jako listy naruszeń/wskazówek diagnostycznych:
- walidacja: `path` = pole DTO/query (`"filters.limit"`), `reason` = komunikat walidacji,
- błędy domenowe bez pola wejściowego: `path` = `"jobId"`, `"stageId"`, `"dependency.<name>"` lub `"system"`,
- max 10 wpisów (reszta agregowana do jednego `reason` typu `"and N more..."`).

## Reguły rzucania `AppException`
1. W adapterach HTTP (schema parsing) utrzymać `VALIDATION_FAILED` dla walidacji kontraktu API.
2. W warstwie application dla pipeline używać kodów `PIPELINE_*`.
3. `retryable` ustawiać jawnie na `true` tylko dla błędów przejściowych.
4. Dla nieobsłużonych wyjątków nadal fallback do `INTERNAL_SERVER_ERROR` w `HttpErrorFilter`.

Przykład:
```ts
throw new AppException({
  status: 503,
  code: "PIPELINE_DEPENDENCY_UNAVAILABLE",
  message: "Pipeline dependency is temporarily unavailable.",
  details: [{ path: "dependency.renderer", reason: "Connection refused" }],
  retryable: true
});
```

## Mapowanie na logi
## Poziomy logowania
- `WARN`: 4xx nie-retryable (walidacja, konflikt, auth, not found),
- `ERROR`: 5xx i wszystkie retryable=true,
- `INFO`: opcjonalnie dla oczekiwanych odmów dostępu o wysokim wolumenie (`FORBIDDEN_*`), jeśli `WARN` powoduje szum.

## Pola logu (strukturalnie)
- `event`: `"http_error"`
- `requestId`
- `status`
- `code`
- `retryable`
- `path` (route)
- `method`
- `module` (np. `"pipeline"`)
- `detailsCount`
- `errorClass` (`AppException` / `HttpException` / `UnknownError`)

Nie logować pełnych payloadów wejściowych ani sekretów.

## Mapowanie na metryki
Minimalny zestaw:
- Counter: `http_errors_total{code,status,retryable,module}`
- Counter: `pipeline_errors_total{pipeline_code,retryable,stage}`
- Histogram: `pipeline_stage_duration_ms{stage,status}` (pozwala korelować timeouty)

Reguły:
- `code` i `status` jako główne etykiety agregacji,
- `requestId` nie jest etykietą metryki (zbyt wysoka kardynalność),
- `details.path` nie jako etykieta (również kardynalność).

## Strategia retry po stronie klienta
- Retry tylko gdy `error.retryable === true`.
- Zalecane backoff: exponential + jitter.
- Dla `429` respektować `Retry-After` (jeśli endpoint wystawia nagłówek).
- Brak retry dla `VALIDATION_FAILED`, `*_NOT_FOUND`, `*_STATE_CONFLICT`, `FORBIDDEN_*`, `UNAUTHORIZED`.

## Zgodność wsteczna
- Obecne kody (`VALIDATION_FAILED`, `UNAUTHORIZED`, `INVALID_SESSION`, `FORBIDDEN_*`, `AREA_NOT_FOUND`, `TEMPLATE_NOT_FOUND`) pozostają poprawne.
- Nowe endpointy processing pipeline powinny używać katalogu `PIPELINE_*`.
- Migracja istniejących endpointów do `PIPELINE_*` opcjonalna, tylko jeśli nie łamie kontraktu konsumentów.

## Checklist wdrożeniowy
1. Dodać katalog kodów `PIPELINE_*` w warstwie application pipeline.
2. Uzgodnić i udokumentować mapowanie `code -> status/retryable` per endpoint.
3. Podpiąć logowanie w `HttpErrorFilter` wg pól powyżej.
4. Podpiąć metryki counter/histogram z tagami o niskiej kardynalności.
5. Dodać testy jednostkowe: `code`, `status`, `retryable`, `details`.
