# Runtime Settings ADR Consistency Check (R69, Agent A7)

Data: 2026-05-24  
Zakres: spojnosc runtime settings miedzy ADR bundle r66, decision docs r64/r65 oraz code skeleton r68 + aktualny skeleton kodu.

## 1) Wynik ogolny

Status: **czesciowo spojne**.

1. Warstwa normatywna r66/r64/r65 ma wspolny kierunek (path-security fail-fast, split permission, P0/P1/P2).
2. W r68 wystepuja **4 rozjazdy dokumentacyjne**.
3. W aktualnym kodzie runtime-settings wystepuja **4 rozjazdy implementacyjne** wzgledem r66/r68.

## 2) Rozjazdy dokumentacyjne (ADR/decision vs r68 docs)

### D1 (KRYTYCZNY): sprzeczna semantyka split permission dla `PUT /settings/runtime`

- Dowod A: `code-skeleton-runtime-settings-r68.md:44,263` -> `admin.runtime_paths.write` tylko dla mutacji high-risk.
- Dowod B: `code-skeleton-security-controls-r68.md:169` -> endpoint ma zawsze `@Permissions("admin.config.write", "admin.runtime_paths.write")`.
- Dowod C: `adr-bundle-r66.md:37` + `threat-model-decompile-blob-pipeline-r65.md:66,103,118` -> dedykowana permission dla zmian path fields.

Jednoznaczna korekta:
1. Przyjac jako SSOT: `admin.config.write` zawsze, a `admin.runtime_paths.write` **warunkowo** tylko gdy mutacja dotyka path-sensitive fields.
2. Zmienic `code-skeleton-security-controls-r68.md` sekcje 4.2 tak, aby nie wymagac stale obu permission na decoratorze endpointu.

### D2 (WYSOKI): konflikt zrodla polityki path security (`env` vs `runtime settings payload`)

- Dowod A: `implementation-slice-runtime-settings-r66.md:51,62,64,69,70` -> `pathSecurity` jest czescia runtime payload + migracja legacy.
- Dowod B: `code-skeleton-runtime-settings-r68.md:30,32,59,224` -> to samo zalozenie.
- Dowod C: `code-skeleton-security-controls-r68.md:61-65` -> polityka path security jako zestaw `PATH_SECURITY_*` w `env`.

Jednoznaczna korekta:
1. Ustalic jedno zrodlo prawdy: `runtime-settings.json` (`payload.pathSecurity`).
2. `PATH_SECURITY_*` zostawic tylko jako opcjonalny bootstrap fallback dla migracji/dev (nigdy jako rownolegly runtime override).

### D3 (WYSOKI): niespojny kontrakt bledu `422` dla walidacji path policy

- Dowod A: `implementation-slice-runtime-settings-r66.md:98,188` -> `422` + `code=VALIDATION_FAILED` + `details[].reasonCode`.
- Dowod B: `code-skeleton-runtime-settings-r68.md:31,53,236,264` -> ten sam kontrakt.
- Dowod C: `code-skeleton-security-controls-r68.md:135,278,291` -> `422` z top-level `code=RUNTIME_PATH_*`.

Jednoznaczna korekta:
1. Utrzymac top-level `code=VALIDATION_FAILED`.
2. `RUNTIME_PATH_*` przeniesc do `details[].reasonCode`.
3. Top-level kody security zostawic dla startup-fatal / observability, nie dla HTTP PUT walidacji payloadu.

### D4 (WYSOKI): gate `P0` w r68 niezgodny z decyzja r64

- Dowod A: `decision-test-gate-standard-r64.md:6-8,34-36` -> P0 = `build + test:unit + test:e2e`.
- Dowod B: `code-skeleton-runtime-settings-r68.md:246` -> P0 = `npm run build` + runtime-settings unit subset.

Jednoznaczna korekta:
1. Historyczna rekomendacja (wycofana 2026-08-19): w `code-skeleton-runtime-settings-r68.md` podmienic sekcje 6.6 na literalny standard r64:
   - P0: `npm run build`, `npm run test:unit`, `npm run test:e2e`
   - P1/P2: P0 + `npm run test:mutation` (nieobowiązujące; mutation testing jest obecnie opcjonalne i wymaga wyraźnego żądania użytkownika)
2. "unit subset" oznaczyc jako etap lokalny TDD pre-gate, nie jako gate P0.

## 3) Rozjazdy implementacyjne (r66/r68 vs aktualny kod skeleton)

### I1 (KRYTYCZNY): brak `pathSecurity` w aktualnym kontrakcie runtime settings

- Dowod: `runtime-settings.types.ts:70-75`, `runtime-settings.schema.ts:81-92`, `runtime-settings.json:5,13,22,23,29,63` (brak pola `pathSecurity`).

Jednoznaczna korekta:
1. Dodac `pathSecurity` do `RuntimeSettingsPayload` + schema + defaults + pliku config.
2. Dodac migracje legacy read/write w repository (normalizacja rekordu bez `pathSecurity`).

### I2 (KRYTYCZNY): brak egzekucji split permission i brak actor-context w service

- Dowod: `runtime-settings.controller.ts:51` ma tylko `@Permissions("admin.config.write")`.
- Dowod: `runtime-settings.application.service.ts:45` przyjmuje tylko `updatedBy: string`.
- Dowod: `auth.policy.ts:11-12,26-27` brak `admin.runtime_paths.write`.

Jednoznaczna korekta:
1. Rozszerzyc `PERMISSIONS` o `admin.runtime_paths.write` i przypisac do roli `admin`.
2. Przekazywac do `replaceRuntimeSettings` pelny `actor` (username + permissions).
3. W service: klasyfikowac zmiany path-sensitive; wymagac `admin.runtime_paths.write` tylko dla tych zmian.

### I3 (WYSOKI): `haks/resolved` nie egzekwuje path policy (canonical/allowlist/symlink)

- Dowod: `runtime-settings.application.service.ts:137-138` -> absolute HAK entry przechodzi bez walidacji (`isAbsolute(entry) ? entry : resolve(...)`).

Jednoznaczna korekta:
1. Wprowadzic `RuntimeSettingsPathSecurityService`.
2. Kazdy `hakEntry` walidowac (`traversal`, `allowAbsoluteHakEntries`, `hakRoots`, `symlinkPolicy`) przed zwrotem w `hakPaths`.

### I4 (WYSOKI): bootstrap fail-fast ma generic `Error`, bez kanonicznej taksonomii kodow

- Dowod: `runtime-settings-bootstrap.service.ts:58,82,110` -> `throw new Error(...)`.
- Dowod normatywny: `admin-runtime-settings-contract-spec-r63.md:217,221` + `code-skeleton-runtime-settings-r68.md:230`.

Jednoznaczna korekta:
1. Zmapowac startup failures na jawne kody (`RUNTIME_SETTINGS_INVALID_MODULE_SOURCE`, `RUNTIME_SETTINGS_INVALID_PACKED_SYNC_CONFIG`, `RUNTIME_PATH_SECURITY_BOOTSTRAP_FAILED`, itd.).
2. Ujednolicic mapowanie kod->log/event/test assertions.

## 4) Priorytet wdrozenia korekt (kolejnosc)

1. D1 + I2 (autoryzacja path-sensitive)  
2. D2 + I1 (jedno zrodlo policy + kontrakt `pathSecurity`)  
3. D3 + I3 (spojny 422 envelope + realna walidacja HAK paths)  
4. D4 + I4 (gate r64 + bootstrap error taxonomy)

## 5) Stan po korektach (docelowy, jednoznaczny)

1. `PUT /settings/runtime`: stale `admin.config.write`; dodatkowo `admin.runtime_paths.write` tylko przy mutacji path-sensitive.
2. Jedno zrodlo policy path security: `payload.pathSecurity` (z migracja legacy).
3. API walidacja: `422 VALIDATION_FAILED`, `details[].reasonCode` dla path violations.
4. Bootstrap: fail-fast z kanonicznymi kodami bledow.
5. Verify gates: P0/P1/P2 zgodnie literalnie z decyzja r64.
