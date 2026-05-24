# Runtime Settings Validation Matrix (R67)

Data: 2026-05-24  
Agent: B5 (Runtime Settings Validation Matrix)  
Zakres: admin runtime settings (`GET/PUT /api/v1/settings/runtime`, `GET /api/v1/settings/runtime/haks/resolved`), walidacja payloadu, source lists, bucket dependencies, priorytety i bootstrap fail-fast.

## 1. Kontrakt odpowiedzi bledu (API)

Wspolny envelope bledu:

```json
{
  "contractVersion": "string",
  "requestId": "string",
  "error": {
    "code": "string",
    "message": "string",
    "details": [{ "path": "string", "reason": "string" }],
    "retryable": false
  }
}
```

Kontrakt dla runtime settings admin:
1. Walidacja payloadu `PUT`:
- HTTP `422`
- `error.code = "VALIDATION_FAILED"`
- `error.message = "Runtime settings validation failed."`
- `error.details[*] = { path, reason }`
2. Brak roli `admin`:
- HTTP `403`
- `error.code = "FORBIDDEN_ROLE"`
3. Brak wymaganej permission (`admin.config.write`) przy `PUT`:
- HTTP `403`
- `error.code = "FORBIDDEN_PERMISSION"`

Uwaga: bootstrap fail-fast to bledy startupowe (nie HTTP), opisane w sekcji 5.

## 2. Matrix A: Paths + Bucket (walidacja `PUT`)

| ID | Obszar | Wejscie (delta payloadu) | Oczekiwany wynik | Expected API error | Pokrycie testowe |
|---|---|---|---|---|---|
| A01 | module paths gate | `moduleDecompiledPath != ""`, `modulePackedPath == ""` | `200`, zapis OK | brak | Istnieje: `backend/test/unit/runtime-settings.schemas.spec.ts` (`accepts payload with moduleDecompiledPath only`) |
| A02 | module paths gate | `moduleDecompiledPath != ""`, `modulePackedPath != ""` | `200`, zapis OK | brak | Brak dedykowanego testu `PUT` (do dodania e2e) |
| A03 | module paths gate + bucket | `moduleDecompiledPath == ""`, `modulePackedPath != ""`, `blobStorage.bucket != ""` | `200`, zapis OK | brak | Posrednio pokryte e2e happy-path (`backend/test/runtime-settings.e2e-spec.ts`) |
| A04 | module paths gate | `moduleDecompiledPath == ""`, `modulePackedPath == ""` | `422` | `code=VALIDATION_FAILED`, detail: `path=paths.moduleDecompiledPath`, `reason=At least one module source path is required: moduleDecompiledPath or modulePackedPath.` | Istnieje: `backend/test/unit/runtime-settings.schemas.spec.ts` |
| A05 | packed -> bucket dependency | `moduleDecompiledPath == ""`, `modulePackedPath != ""`, `blobStorage.bucket == ""` | `422` | `code=VALIDATION_FAILED`, detail: `path=blobStorage.bucket`, `reason=blobStorage.bucket is required when paths.modulePackedPath is configured.` | Istnieje: `backend/test/unit/runtime-settings.schemas.spec.ts` |
| A06 | packed off -> bucket optional | `modulePackedPath == ""`, `blobStorage.bucket == ""` | `200` | brak | Istnieje: `backend/test/unit/runtime-settings.schemas.spec.ts` (A01) |
| A07 | required path field | `paths.vanillaDataPath = ""` | `422` | `code=VALIDATION_FAILED`, detail `path=paths.vanillaDataPath` | Brak (do dodania unit schema) |
| A08 | required path field | `paths.hakDirectoryPath = ""` | `422` | `code=VALIDATION_FAILED`, detail `path=paths.hakDirectoryPath` | Brak (do dodania unit schema) |
| A09 | required path field | `paths.tlkBasePath = ""` | `422` | `code=VALIDATION_FAILED`, detail `path=paths.tlkBasePath` | Brak (do dodania unit schema) |
| A10 | enum | `telemetryDebugMode = "verbose"` | `422` | `code=VALIDATION_FAILED`, detail `path=telemetryDebugMode` | Brak (do dodania unit schema) |
| A11 | typ pola | np. `blobStorage.bucket = true` | `422` | `code=VALIDATION_FAILED`, detail `path=blobStorage.bucket` | Brak (do dodania unit schema) |
| A12 | required object | usuniete `sources.sound` | `422` | `code=VALIDATION_FAILED`, detail `path=sources.sound` | Brak (do dodania unit schema) |
| A13 | authz role (GET) | uzytkownik nie-admin | `403` | `code=FORBIDDEN_ROLE` | Istnieje: `backend/test/runtime-settings.e2e-spec.ts` |
| A14 | authz role (PUT) | uzytkownik rola `dm` | `403` | `code=FORBIDDEN_ROLE` | Istnieje: `backend/test/runtime-settings.e2e-spec.ts` |
| A15 | authz permission (PUT) | admin bez `admin.config.write` | `403` | `code=FORBIDDEN_PERMISSION` | Brak (do dodania e2e/guard-level integration) |

## 3. Matrix B: Source Lists (hakProfile/hakPriorityList) + `haks/resolved`

| ID | Obszar | Wejscie / warunek | Endpoint/faza | Oczekiwany wynik | Expected API error | Pokrycie testowe |
|---|---|---|---|---|---|---|
| B01 | profile existence | `sources.placeable.hakProfileId = "unknown_profile"` | `PUT` | `422` | `code=VALIDATION_FAILED`, detail: `path=sources.placeable.hakProfileId`, reason: `hakProfileId "unknown_profile" does not exist in hakProfiles.` | Istnieje: `backend/test/unit/runtime-settings.schemas.spec.ts` |
| B02 | hakPriorityList entry validation | np. `sources.area.hakPriorityList = ["", "ok"]` | `PUT` | `422` | `code=VALIDATION_FAILED`, detail `path=sources.area.hakPriorityList.0` | Brak (do dodania unit schema) |
| B03 | mode=disabled | `includeHaks=false` | `GET /haks/resolved` | `mode=disabled`, puste `hakPriorityList`, puste `hakPaths` | brak | Istnieje: `backend/test/unit/runtime-settings.application.service.spec.ts` |
| B04 | inline precedence | `includeHaks=true`, `hakPriorityList` niepuste, `hakProfileId` ustawione | `GET /haks/resolved` | `mode=inline`; inline wygrywa nad profilem | brak | Czesc. Istnieje unit dla `inline`; brak testu konfliktu inline+profile |
| B05 | inline dedupe/order | `hakPriorityList=["a","a","b"," a "]` | `GET /haks/resolved` | wynik `["a","b"]` (trim+dedupe, kolejnosc zachowana) | brak | Czesc. Istnieje dedupe test dla tiles; brak testu trim kolizji |
| B06 | profile fallback | `includeHaks=true`, inline puste, `hakProfileId` istnieje | `GET /haks/resolved` | `mode=profile`, lista z `hakProfiles[hakProfileId]` | brak | Istnieje: `backend/test/unit/runtime-settings.application.service.spec.ts` |
| B07 | mode=none | `includeHaks=true`, inline puste, `hakProfileId=""` | `GET /haks/resolved` | `mode=none`, puste listy | brak | Brak (do dodania unit) |
| B08 | hakPaths absolutne/relatywne | profil z `["relative/one.hak","D:/external/two.hak"]` | `GET /haks/resolved` | relatywne rozwiazane do `hakDirectoryPath`, absolutne bez zmian | brak | Istnieje: `backend/test/unit/runtime-settings.application.service.spec.ts` |
| B09 | admin role gate | user nie-admin | `GET /haks/resolved` | `403` | `code=FORBIDDEN_ROLE` | Brak dedykowanego e2e (do dodania) |

## 4. Matrix C: Priorytet zrodel modulu (D/P)

Definicje:
1. `D = trim(paths.moduleDecompiledPath)`
2. `P = trim(paths.modulePackedPath)`

| ID | Warunek | Oczekiwany outcome | API impact | Bootstrap impact | Pokrycie |
|---|---|---|---|---|---|
| C01 | `D!=empty && P!=empty` | `DECOMPILED_PRIMARY` | `PUT` przechodzi, brak bledu | sync packed pomijany | Istnieje: unit bootstrap (`prefers decompiled...`) |
| C02 | `D!=empty && P==empty` | `DECOMPILED_ONLY` | `PUT` przechodzi | sync packed pomijany | Istnieje: unit bootstrap (`skips packed-module sync...`) |
| C03 | `D==empty && P!=empty` + bucket | `PACKED_SYNC_REQUIRED` | `PUT` przechodzi | extract + blob sync wymagane | Istnieje: unit bootstrap (`extracts packed module...`) |
| C04 | `D==empty && P==empty` | `FAIL_FAST` | `PUT` odrzuca (`422`) | startup fail-fast | Istnieje: unit schema + unit bootstrap |

## 5. Matrix D: Fail-fast bootstrap (nie-HTTP)

| ID | Scenariusz | Faza | Oczekiwane zachowanie | Oczekiwany blad/komunikat | Pokrycie |
|---|---|---|---|---|---|
| D01 | Brak obu sciezek modulu | startup | zatrzymanie bootstrap | `Runtime settings invalid: either paths.moduleDecompiledPath or paths.modulePackedPath must be configured.` | Istnieje: unit bootstrap |
| D02 | `D` ustawione, `P` puste | startup | bootstrap przechodzi, brak sync | brak bledu | Istnieje: unit bootstrap |
| D03 | `D` i `P` ustawione | startup | bootstrap przechodzi, preferencja `D`, brak sync | brak bledu (log informacyjny) | Istnieje: unit bootstrap |
| D04 | packed-only + brak ktoregos z: endpoint/region/bucket/modulePrefix/accessKeyId/secretAccessKey | startup | zatrzymanie bootstrap | `Runtime settings invalid for packed module sync. Missing: ...` | Brak dedykowanego testu unit (do dodania) |
| D05 | packed-only + extractor rzuca blad | startup | zatrzymanie bootstrap | propagacja bledu extractora | Brak dedykowanego testu unit (do dodania) |
| D06 | packed-only + blob sync rzuca blad | startup | zatrzymanie bootstrap | propagacja bledu storage adaptera | Brak dedykowanego testu unit (do dodania) |

## 6. Expected API error catalogue (dla admin runtime settings)

| HTTP | error.code | Kiedy |
|---|---|---|
| 422 | `VALIDATION_FAILED` | Payload `PUT` nie przechodzi `runtimeSettingsPayloadSchema` |
| 403 | `FORBIDDEN_ROLE` | User nie ma wymaganej roli `admin` |
| 403 | `FORBIDDEN_PERMISSION` | User ma role, ale nie ma `admin.config.write` dla `PUT` |
| 401 | `UNAUTHORIZED` | Brak/niepoprawny bearer token |
| 401 | `INVALID_SESSION` | Token nie mapuje do aktywnej sesji |

## 7. Test matrix (co jest vs co dopisac)

## 7.1 Testy istniejace (potwierdzone)
1. `backend/test/unit/runtime-settings.schemas.spec.ts`
- A01, A04, A05, B01.
2. `backend/test/unit/runtime-settings.application.service.spec.ts`
- B03, B05 (dedupe baseline), B06, B08.
3. `backend/test/unit/runtime-settings-bootstrap.service.spec.ts`
- C01, C02, C03, C04, D01, D02, D03.
4. `backend/test/runtime-settings.e2e-spec.ts`
- A13, A14 + happy-path `GET/PUT`.

## 7.2 Brakujace testy (rekomendowane do R67)
1. Unit schema:
- `rejects empty vanillaDataPath/hakDirectoryPath/tlkBasePath` (A07-A09)
- `rejects invalid telemetryDebugMode` (A10)
- `rejects wrong primitive type for string fields` (A11)
- `rejects empty hakPriorityList entry` (B02)
- `rejects missing sources.sound object` (A12)
2. Unit application:
- `returns mode=none when includeHaks=true and no inline/profile` (B07)
- `inline list wins over hakProfileId when both set` (B04)
- `dedupe trims canonical duplicates` (B05 trim wariant)
3. Unit bootstrap:
- `fails when packed-only and blob config incomplete` (D04)
- `fails when extractor throws` (D05)
- `fails when blob storage sync throws` (D06)
4. E2E authz:
- `GET /settings/runtime/haks/resolved denies non-admin role` (B09)
- `PUT /settings/runtime returns FORBIDDEN_PERMISSION for admin without admin.config.write` (A15; wymaga fixture usera/permission override)
5. E2E validation:
- A07-A12 jako request-level cases na endpoint `PUT`.

## 8. Minimalny gate regresji dla runtime settings

1. `npm run test:unit -- runtime-settings.schemas.spec.ts runtime-settings.application.service.spec.ts runtime-settings-bootstrap.service.spec.ts`
2. `npm run test:e2e -- runtime-settings.e2e-spec.ts`
3. Rozszerzenie po dopisaniu brakow:
- `runtime-settings.validation.e2e-spec.ts` (A07-A12 + A15 + B09)
- `runtime-settings.bootstrap.failfast.spec.ts` (D04-D06)

## 9. Status AS-IS vs target R67

1. AS-IS:
- Core walidacje cross-field (module gate + packed->bucket), profile existence, priorytety D/P i podstawowe HAK mode sa wdrozone.
2. Target R67:
- Domknac komplet walidacji negatywnych na poziomie API, brakujace scenariusze authz permission i komplet fail-fast storage/extractor.

