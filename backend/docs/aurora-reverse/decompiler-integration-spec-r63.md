# Decompiler Integration Spec (R63, Agent S1)

Data: 2026-05-24
Status: Draft (minimal backend contract)
Zakres: minimalny kontrakt integracji backendu Aurora z zewnetrznym narzedziem dekompilacji.

## 1. Cel

Ustalic minimalny i deterministyczny kontrakt uruchamiania dekompilatora tak, aby backend mial:
1. stabilne wejscie/wyjscie,
2. jednoznaczne mapowanie exit code -> `PIPELINE_*`,
3. twarde timeouty i kontrolowane przerwanie procesu,
4. przewidywalny capture logow,
5. jasna polityke retry/no-retry.

## 2. Evidence base (Aurora Reverse + backend)

1. `C:\Projects\aurora-web-backend\backend\docs\aurora-reverse\processing-error-taxonomy-spec-r63.md`
- kanoniczne kody `PIPELINE_DECOMP_*` i retry semantics.
2. `C:\Projects\aurora-web-backend\backend\docs\aurora-reverse\blob-ingest-pipeline-spec-r63.md` (sekcja 11)
- retryable vs non-retryable i backoff policy.
3. `C:\Projects\aurora-web-backend\backend\docs\standards\processing-pipeline-errors-and-validation.md`
- kontrakt `AppException/ErrorEnvelope` (`code`, `message`, `details`, `retryable`).
4. `C:\Projects\nwn-last-city\Aurora\reverse\areas3d_handoff\IMPLEMENTATION_REPORTS_FROM_019e3315.md`
- reverse-first kierunek: deterministyczny processing, diagnostyka i fail-fast.

## 3. Minimalny kontrakt uruchomienia (wejscie)

Backend traktuje dekompilator jako proces CLI i wywoluje go przez adapter `DecompilerPort`.

### 3.1 Request contract

```ts
interface DecompileRequest {
  requestId: string;           // wymagane
  jobId: string;               // wymagane
  attempt: number;             // >=1
  inputPath: string;           // absolute path, plik wejsciowy (np. MOD/ERF)
  outputDir: string;           // absolute path, pusty lub utworzony przez backend
  timeoutMs?: number;          // optional, domyslnie 60000
  toolArgs?: string[];         // optional, dodatkowe flagi profilu
}
```

### 3.2 Invariants

1. `inputPath` MUSI istniec i byc plikiem.
2. `outputDir` MUSI byc izolowany per `jobId/attempt`.
3. `timeoutMs` zakres: `5000..300000`; poza zakresem -> walidacja backend (bez uruchomienia procesu).
4. Backend przekazuje correlation fields (`requestId`, `jobId`, `attempt`) do env procesu:
- `AURORA_REQUEST_ID`
- `AURORA_JOB_ID`
- `AURORA_ATTEMPT`

### 3.3 Process invocation

Minimalny ksztalt:

```text
decompiler-cli --input <inputPath> --output <outputDir> --json
```

Backend NIE parsuje stdout jako wolnego tekstu; oczekuje pojedynczego JSON result (sekcja 4.1).

## 4. Kontrakt wyjscia

## 4.1 Success payload (`exit code = 0`)

Dekompilator zwraca na `stdout` jeden obiekt JSON:

```json
{
  "status": "ok",
  "artifacts": [
    { "path": "module.ifo.json", "kind": "ifo", "size": 1234 },
    { "path": "area001.git.json", "kind": "git", "size": 4567 }
  ],
  "diagnostics": [],
  "toolVersion": "x.y.z"
}
```

Wymagania:
1. `status` musi byc `ok`.
2. `artifacts.length > 0`.
3. kazdy `artifacts[*].path` jest relatywny do `outputDir`.

## 4.2 Failure payload (`exit code != 0`)

Jesli dekompilator zwraca JSON, minimalny ksztalt:

```json
{
  "status": "error",
  "code": "TOOL_CODE",
  "message": "human readable",
  "diagnostics": [
    { "path": "decomp.input", "reason": "..." }
  ]
}
```

Jesli brak poprawnego JSON, backend tworzy blad na podstawie `exit code` + `stderr` (sekcja 5).

## 5. Exit codes -> backend error contract

| Exit code | Backend `error.code` | HTTP | retryable | Policy |
|---|---|---:|---:|---|
| `0` | success | 200 | n/a | wykonanie poprawne |
| `10` | `PIPELINE_DECOMP_INPUT_NOT_FOUND` | 404 | false | no-retry |
| `11` | `PIPELINE_DECOMP_UNSUPPORTED_FORMAT` | 422 | false | no-retry |
| `12` | `PIPELINE_DECOMP_OUTPUT_MISSING` | 500 | false | no-retry |
| `20` | `PIPELINE_DECOMP_DEPENDENCY_UNAVAILABLE` | 503 | true | retry |
| `21` | `PIPELINE_DECOMP_TIMEOUT` | 504 | true | retry |
| `30` | `PIPELINE_DECOMP_EXEC_FAILED` | 500 | false | no-retry |
| `>=128` lub killed by backend timeout | `PIPELINE_DECOMP_TIMEOUT` | 504 | true | retry |
| inny nieznany | `PIPELINE_DECOMP_EXEC_FAILED` | 500 | false | no-retry |

Uwagi normatywne:
1. Mapowanie jest zamkniete i deterministiczne.
2. `retryable=true` tylko dla przypadkow przejsciowych (`timeout`, `dependency unavailable`).

## 6. Timeout i kontrola procesu

1. Domyslny `timeoutMs = 60000`.
2. Po przekroczeniu timeout backend:
- wysyla graceful stop,
- czeka `graceMs = 5000`,
- eskaluje do force-kill.
3. Po force-kill blad jest mapowany na `PIPELINE_DECOMP_TIMEOUT`.
4. Brak trybu bez timeoutu (no infinite run).

## 7. Log capture contract

1. Backend streamuje i buforuje `stdout` i `stderr` oddzielnie.
2. Limit bufora: `4 MiB` na strumien (ring buffer, zachowaj koncowke).
3. Dla bledu backend zwraca w `details`:
- `path=decomp.exitCode`,
- `path=decomp.stderr.tail`,
- `path=decomp.stdout.tail` (jesli parsing JSON zawiodl).
4. Logi pelne (o ile dostepne) sa zapisywane jako artefakt runu, ale bez sekretow i bez raw credentiali.
5. Kazdy log line ma korelacje przez `requestId/jobId/attempt`.

## 8. Retry / no-retry policy

1. Retry uruchamiamy tylko gdy `retryable=true` z sekcji 5.
2. Parametry retry (zgodne z R63 ingest policy):
- backoff: `1s, 2s, 4s, 8s`,
- `maxBackoff = 60s`,
- `maxAttemptsPerStep = 8`.
3. Brak retry dla bledow deterministycznych (input missing, unsupported format, output contract, exec logic failure).
4. Po wyczerpaniu retry backend emituje finalny blad `PIPELINE_RETRY_EXHAUSTED` z `details.cause=<lastErrorCode>`.

## 9. Minimalny kontrakt implementacyjny adaptera

```ts
interface DecompilerPort {
  run(request: DecompileRequest): Promise<DecompileResult>;
}

interface DecompileResult {
  artifacts: Array<{ path: string; kind: string; size: number }>;
  toolVersion?: string;
  durationMs: number;
  stdoutTail?: string;
  stderrTail?: string;
}
```

Wymaganie: adapter nigdy nie zwraca "partial success" przy `exit code != 0`; w takim przypadku rzuca blad `AppException` z mapowaniem z sekcji 5.

## 10. Acceptance checks (minimal)

1. `exit=0` + poprawny JSON + artefakty -> sukces.
2. `exit=10/11/12/30` -> no-retry i poprawny `PIPELINE_DECOMP_*`.
3. `exit=20/21` lub timeout kill -> retryable=true.
4. Niepoprawny/missing JSON przy `exit=0` -> `PIPELINE_DECOMP_OUTPUT_MISSING`.
5. Log capture zawiera tail `stdout/stderr` i correlation fields.
