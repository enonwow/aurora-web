# Module Source Priority Spec (R63)

## 1. Scope
Spec definiuje kontrakt wyboru zrodla modulu (`moduleDecompiledPath` vs `modulePackedPath`), walidacji startu backendu oraz modelu bledow.

## 2. Evidence Base (reverse + backend)

### 2.1 Reverse evidence
- `C:\Projects\nwn-last-city\Areas Generator 3d\Web Model Viewer\Common\resman.py:117-133`
  - Odczyt zasobow jest `first-match-wins`: najpierw `module_decompiled`, potem `module_packed`, dalej HAK, na koncu vanilla KEY/BIF.
- `C:\Projects\nwn-last-city\Areas Generator 3d\Web Model Viewer\exporter\areas\legacy_2d\generate-codex.py:233-247`
  - `module.ifo` jest czytane najpierw z `module_decompiled`, fallback do `module_packed` tylko gdy brak danych.
- `C:\Projects\nwn-last-city\Aurora\reverse\_RECOVERED_FROM_AI_DOCUMENTATIONS\reports\areas3d-handoff\ANALYSIS_TASKS_FOR_THREAD_019e3315.md:1518-1534, 2299-2301, 2599-2601, 3074-3078`
  - RE backlog identyfikuje ryzyko cichego wymuszania zapisu do `module_decompiled` bez kontraktu source oraz wymaga jawnej polityki bledow i gate parity.
- `C:\Projects\nwn-last-city\Aurora\reverse\_RECOVERED_FROM_AI_DOCUMENTATIONS\reports\areas3d-handoff\ANALYSIS_TASKS_FOR_THREAD_019e3315.md:3835-3839`
  - Rekomenduje jawny kod policy bledu (`PARITY_VALIDATION_FAILED`) zamiast nieczytelnych failure modes.

### 2.2 Backend evidence
- `C:\Projects\aurora-web-backend\backend\src\modules\runtime-settings\application\runtime-settings-bootstrap.service.ts:41-74`
  - Gdy oba pola sa ustawione, backend preferuje `moduleDecompiledPath` i pomija sync z `.mod`.
  - Gdy tylko `modulePackedPath`, backend robi extract + blob sync.
- `C:\Projects\aurora-web-backend\backend\src\modules\runtime-settings\application\runtime-settings-bootstrap.service.ts:77-113`
  - Startup gate: co najmniej jedna sciezka modulu.
  - Dla sciezki packed: wymagane pelne blob storage config.
- `C:\Projects\aurora-web-backend\backend\src\modules\runtime-settings\domain\runtime-settings.schema.ts:17-29, 121-131`
  - Walidacja payloadu: co najmniej jedna sciezka modulu.
  - Gdy ustawione `modulePackedPath`, `blobStorage.bucket` jest wymagane.
- `C:\Projects\aurora-web-backend\backend\src\modules\runtime-settings\adapters\inbound\http\runtime-settings.schemas.ts:15-23`
  - Walidacja API zwraca `422` + `code=VALIDATION_FAILED`.
- `C:\Projects\aurora-web-backend\backend\test\unit\runtime-settings-bootstrap.service.spec.ts:44-115`
  - Testy potwierdzaja scenariusze: fail bez obu sciezek, preferencja decompiled, packed sync gdy tylko packed.

## 3. Canonical Source Selection Policy

### 3.1 Input normalization
- Backend MUSI trimowac wartosci:
  - `D = paths.moduleDecompiledPath.trim()`
  - `P = paths.modulePackedPath.trim()`
- Pusty string po trimie traktujemy jako `unset`.

### 3.2 Priority matrix
1. `D != ""` i `P != ""`
- Active module source: `DECOMPILED_PRIMARY`.
- Packed sync: `SKIP`.
- Log: informacja o preferencji decompiled.

2. `D != ""` i `P == ""`
- Active module source: `DECOMPILED_ONLY`.
- Packed sync: `SKIP`.

3. `D == ""` i `P != ""`
- Active module source: `PACKED_SYNC_REQUIRED`.
- Backend MUSI wykonac extract ERF/MOD i sync snapshotu do blob storage.

4. `D == ""` i `P == ""`
- Startup MUSI fail-fast.

### 3.3 Compatibility note
Polityka jest zgodna z RE/PoC chain (`module_decompiled` przed `module_packed`) i eliminuje niedeterministyczne fallbacki wskazane w backlogu reverse.

## 4. Startup Validation Contract

## 4.1 Pre-bootstrap invariants
- Musi byc skonfigurowane co najmniej jedno z:
  - `paths.moduleDecompiledPath`
  - `paths.modulePackedPath`

## 4.2 Packed-only bootstrap invariants
Gdy `D == ""` i `P != ""`, backend MUSI wymagac:
- `blobStorage.endpoint`
- `blobStorage.region`
- `blobStorage.bucket`
- `blobStorage.modulePrefix`
- `blobStorage.accessKeyId`
- `blobStorage.secretAccessKey`

## 4.3 API payload invariants (PUT /settings/runtime)
- Co najmniej jedna sciezka modulu musi byc ustawiona.
- Gdy `modulePackedPath` jest ustawione, `blobStorage.bucket` jest wymagane na etapie schema validation.
- Naruszenia zwracaja `422 VALIDATION_FAILED` z listą `details[path, reason]`.

## 5. Error Model

### 5.1 HTTP validation errors
- `VALIDATION_FAILED` (422)
- Trigger:
  - obie sciezki modulu puste,
  - `modulePackedPath` ustawione i brak `blobStorage.bucket`,
  - inne naruszenia runtime settings schema.

### 5.2 Startup fatal errors (no successful app bootstrap)
- `RUNTIME_SETTINGS_INVALID_MODULE_SOURCE`
  - Condition: `D == ""` i `P == ""`.
  - Current message compatibility:
    - `Runtime settings invalid: either paths.moduleDecompiledPath or paths.modulePackedPath must be configured.`

- `RUNTIME_SETTINGS_INVALID_PACKED_SYNC_CONFIG`
  - Condition: packed path aktywne, ale brak wymaganych pol blob storage.
  - Current message compatibility:
    - `Runtime settings invalid for packed module sync. Missing: ...`

- `RUNTIME_SETTINGS_INVALID_PACKED_MODULE_PATH`
  - Condition: niepoprawny path/plik dla packed module lub nieczytelny plik.

- `RUNTIME_SETTINGS_PACKED_MODULE_EXTRACT_FAILED`
  - Condition: niepoprawny ERF signature/version/range/read.
  - Source: extractor (`nwn-erf-packed-module-extractor.service.ts`).

- `RUNTIME_SETTINGS_PACKED_MODULE_SYNC_FAILED`
  - Condition: blad replace snapshot do blob storage.

### 5.3 Policy/parity extension errors (from reverse backlog)
- `PARITY_VALIDATION_FAILED`
  - Reserved dla strict parity gate (export/edit), gdy policy wymaga fail zamiast warning.
  - Kod powinien byc jawnie wyniesiony do payloadu/logu (zgodnie z reverse tasks).

## 6. Logging and Observability

Backend MUSI emitowac jednoznaczne logi decyzyjne:
- oba pathy ustawione -> decompiled priority + packed skipped,
- tylko decompiled -> packed skipped,
- tylko packed -> packed sync start + summary (files/bytes/bucket/prefix),
- startup fail -> explicit reason i brak niejawnych fallbackow.

## 7. Non-goals
- Ta spec nie definiuje jeszcze source-bound write targeting dla edytorow area/placeables (`resref+source` contract).
- Ta spec nie definiuje gate triady `ARE+GIT+GIC`; to jest osobny parity track z reverse backlogu.

## 8. Test Matrix (minimum)
1. Startup fail gdy oba pathy puste.
2. Startup pass gdy tylko decompiled.
3. Startup pass + skip sync gdy oba ustawione.
4. Startup pass + extract/sync gdy tylko packed i blob config komplet.
5. Startup fail gdy tylko packed i brakuje blob config.
6. API `PUT` -> `422 VALIDATION_FAILED` dla obu path pustych.
7. API `PUT` -> `422 VALIDATION_FAILED` dla packed bez bucket.

## 9. R63 Decision Summary
- Deterministyczny wybor zrodla: `moduleDecompiledPath` ma absolutny priorytet nad `modulePackedPath`.
- Brak cichych fallbackow przy starcie: niepoprawna konfiguracja konczy bootstrap.
- Bledy musza byc jawnie klasyfikowane (walidacja API vs startup fatal vs parity policy).
