# Processing Error Taxonomy Spec (R63, Agent L1)

Data: 2026-05-24  
Status: Draft for backend processing contract  
Zakres: mapowanie bledow dekompilacji, parsowania i walidacji na jednolity kontrakt API.

## 1. Cel

Ustalic jedna taksonomie bledow dla processing pipeline Aurora reverse, zgodna z aktualnym backendowym kontraktem `AppException/ErrorEnvelope`, tak aby:

1. kazdy blad mial stabilny `code`,
2. retry dzialalo tylko dla bledow przejsciowych (`retryable=true`),
3. severity bylo deterministyczne i porownywalne miedzy decomp/parse/validation.

## 2. Kontrakt API (bez zmian)

Obowiazuje istniejacy envelope:

- `error.code: string`
- `error.message: string`
- `error.details: Array<{ path: string; reason: string }>`
- `error.retryable: boolean`

`severity` jest polem klasyfikacyjnym taksonomii (dla logow, metryk, telemetry i triage), nie nowym top-level polem API.

## 3. Normy bazowe (backend)

1. Format kodu: `PIPELINE_<AREA>_<CAUSE>`.
2. `retryable=true` tylko dla bledow chwilowych (timeout/dependency/backpressure/lock).
3. Dla walidacji kontraktu HTTP utrzymujemy `VALIDATION_FAILED` (422) na adapterze schema.
4. Dla processing domain uzywamy kodow `PIPELINE_*`.
5. Fallback nieobsluzonych wyjatkow: `INTERNAL_SERVER_ERROR`.

## 4. Severity taxonomy

- `INFO`: sygnal diagnostyczny bez blokady flow.
- `WARN`: degradacja/parcial parse lub blad danych klienta/corpusu, zwykle 4xx i `retryable=false`.
- `ERROR`: twarda blokada processingu (strict gate lub blad runtime), wymaga interwencji.
- `CRITICAL`: awaria przejsciowa infrastruktury/zaleznosci, retry zalecany (`retryable=true`).

## 5. Evidence anchors (Aurora reverse + backend standards)

1. `C:\Projects\nwn-last-city\Aurora\reverse\areas3d_handoff\IMPLEMENTATION_REPORTS_FROM_019e3315.md:114-117, 181, 387, 410-413, 958-961, 1067-1071, 1085-1090` (tile cardinality, parse diagnostics, strict policies, top-level schema gate).
2. `C:\Projects\nwn-last-city\Aurora\reverse\areas3d_handoff\ANALYSIS_TASKS_FOR_THREAD_019e3315.md:3831-3839` (explicit policy code `PARITY_VALIDATION_FAILED`).
3. `C:\Projects\aurora-web-backend\backend\docs\aurora-reverse\blob-ingest-pipeline-spec-r63.md` sekcja `11.1/11.2` (retryable vs non-retryable failure policy).
4. `C:\Projects\aurora-web-backend\backend\docs\standards\processing-pipeline-errors-and-validation.md` (kontrakt `AppException`, mapowanie status/retryable, reguly logowania).
5. `C:\Projects\aurora-web-backend\backend\docs\standards\processing-pipeline-observability-slo-agent-r15.md` (kody lock/timeout/drift i retry semantics).

## 6. Canonical mapping: decomp/parse/validation -> API

| Phase | Canonical code | HTTP | retryable | severity | Kiedy uzywac |
|---|---|---:|---:|---|---|
| Decomp | `PIPELINE_DECOMP_INPUT_NOT_FOUND` | 404 | false | WARN | Brak pliku/wejscia do dekompilacji (ARE/GIT/GIC/mod). |
| Decomp | `PIPELINE_DECOMP_UNSUPPORTED_FORMAT` | 422 | false | WARN | Format wejscia nieobslugiwany przez decompiler/extractor. |
| Decomp | `PIPELINE_DECOMP_EXEC_FAILED` | 500 | false | ERROR | Decompiler/extractor zakonczyl sie bledem logicznym/formatowym. |
| Decomp | `PIPELINE_DECOMP_OUTPUT_MISSING` | 500 | false | ERROR | Proces zakonczony, ale brak oczekiwanych artefaktow wyjsciowych. |
| Decomp | `PIPELINE_DECOMP_TIMEOUT` | 504 | true | CRITICAL | Timeout etapu dekompilacji/ekstrakcji. |
| Decomp | `PIPELINE_DECOMP_DEPENDENCY_UNAVAILABLE` | 503 | true | CRITICAL | Chwilowa niedostepnosc storage/toolchain/upstream. |
| Parse | `PIPELINE_PARSE_ARE_INDEX_FAILED` | 422 | false | WARN | Nieudany parse pojedynczego ARE/index entry (z preserve diagnostics). |
| Parse | `PIPELINE_PARSE_GIT_ENTRY_FAILED` | 422 | false | WARN | Partial parse fail dla wpisow list GIT (`Placeable/Door/Creature/Trigger/Waypoint/List`). |
| Parse | `PIPELINE_PARSE_GIC_ENTRY_FAILED` | 422 | false | WARN | Parse error sidecar GIC dla entry/comment mapowania. |
| Parse | `PIPELINE_PARSE_TOP_LEVEL_SCHEMA_MISMATCH` | 422 | false | WARN | Top-level GIT list schema niezgodne (`present/isList/rawCount/fieldType`). |
| Parse | `PIPELINE_PARSE_STRICT_BLOCKED` | 422 | false | ERROR | Tryb `strict` podnosi parse mismatch z warning do hard-fail. |
| Validation | `PIPELINE_VALIDATION_TILE_CARDINALITY_MISMATCH` | 422 | false | WARN | `len(Tile_List) != Width*Height` w policy `warn`. |
| Validation | `PIPELINE_VALIDATION_TILE_ALIAS_CONFLICT` | 422 | false | WARN | Konflikt `Tile_List` vs `TileList` w policy `warn`. |
| Validation | `PIPELINE_VALIDATION_TOP_LEVEL_LIST_SCHEMA_MISMATCH` | 422 | false | WARN | Walidacyjny gate dla GIT top-level list w policy `warn`. |
| Validation | `PIPELINE_VALIDATION_PARITY_FAILED` | 422 | false | ERROR | Policy parity `strict` (alias dla `PARITY_VALIDATION_FAILED`). |
| Validation | `PIPELINE_VALIDATION_LOCSTRING_REPLACE_BLOCKED` | 409 | false | ERROR | Destructive locstring replace zablokowany przez strict policy. |

## 7. Compatibility mapping (reverse legacy codes -> canonical)

| Reverse/legacy code | Canonical code | retryable | severity |
|---|---|---:|---|
| `GIT_CREATURE_PARSE_FAILED` | `PIPELINE_PARSE_GIT_ENTRY_FAILED` | false | WARN |
| `GIT_GROUND_ITEM_PARSE_FAILED` | `PIPELINE_PARSE_GIT_ENTRY_FAILED` | false | WARN |
| `GIT_TOP_LEVEL_LIST_SCHEMA_MISMATCH` | `PIPELINE_VALIDATION_TOP_LEVEL_LIST_SCHEMA_MISMATCH` | false | WARN/ERROR (zaleznie od policy) |
| `ARE_TILE_LIST_ALIAS_CARDINALITY_CONFLICT` | `PIPELINE_VALIDATION_TILE_ALIAS_CONFLICT` | false | WARN/ERROR (zaleznie od policy) |
| `PARITY_VALIDATION_FAILED` | `PIPELINE_VALIDATION_PARITY_FAILED` | false | ERROR |
| `LOCSTRING_REPLACE_BLOCKED` | `PIPELINE_VALIDATION_LOCSTRING_REPLACE_BLOCKED` | false | ERROR |

## 8. Policy switch: warn vs strict

1. W `warn`: parser/validator emituje issue i kontynuuje flow; kod kanoniczny moze trafic do `details`/telemetry bez fail requestu.
2. W `strict`: to samo naruszenie konczy request kodem z sekcji 6 (`PIPELINE_PARSE_STRICT_BLOCKED` albo `PIPELINE_VALIDATION_*`).
3. `retryable` nie zalezy od policy strict/warn; zalezy od natury bledu (transient vs deterministic).

## 9. `details.path` convention (wymagane)

1. Decomp: `decomp.input`, `decomp.tool`, `decomp.output`, `dependency.<name>`.
2. Parse: `parse.<sourceList>[<idx>]`, `parse.topLevel.<listName>`, `parse.gic.<idx>`.
3. Validation: `validation.tileListCardinality`, `validation.tileListAlias`, `validation.gitTopLevelSchema`, `validation.parity`.

Przyklad:

```json
{
  "error": {
    "code": "PIPELINE_VALIDATION_TILE_CARDINALITY_MISMATCH",
    "message": "Tile_List cardinality does not match Width*Height.",
    "details": [
      { "path": "validation.tileListCardinality", "reason": "expected=256 actual=249 delta=-7 mode=strict" }
    ],
    "retryable": false
  }
}
```

## 10. Retry policy (client + worker)

1. Retry tylko gdy `retryable=true`.
2. Dotyczy glownie: `PIPELINE_DECOMP_TIMEOUT`, `PIPELINE_DECOMP_DEPENDENCY_UNAVAILABLE`.
3. Brak retry dla bledow parse/validation i konfliktow policy.
4. Backoff: exponential + jitter; respekt `Retry-After` dla `429` jesli wystawione.

## 11. Minimal implementation checklist

1. W warstwie application dopiac canonical kody z sekcji 6.
2. Utrzymac kompatybilnosc starych kodow przez mapowanie z sekcji 7.
3. Emitowac `severity` jako tag log/metryka (np. `pipeline_errors_total{code,retryable,severity}`).
4. Dodac testy jednostkowe mapowania `legacy -> canonical`, `code -> status/retryable/severity`.
5. Dodac testy strict/warn, potwierdzajace ten sam trigger i rozny wynik (issue vs hard-fail).
