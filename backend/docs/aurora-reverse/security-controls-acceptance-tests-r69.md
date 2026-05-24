# Security Controls Acceptance Tests R69 (Agent D7)

Data: 2026-05-24  
Status: Draft (acceptance test pack)  
Zakres: `path hardening`, `permission gates`, `partition filters`.

## 1. Cel

Zdefiniowac wykonywalny zestaw acceptance testow dla security controls oraz jednoznaczne kryteria `PASS/FAIL`, z mapowaniem do istniejacych suite'ow testowych backendu.

## 2. Referencje

1. `backend/docs/aurora-reverse/path-security-hardening-spec-r63.md`
2. `backend/docs/aurora-reverse/access-partition-rules-spec-r63.md`
3. `backend/docs/aurora-reverse/security-test-playbook-r67.md`
4. `backend/docs/aurora-reverse/code-skeleton-security-controls-r68.md`
5. `backend/docs/aurora-reverse/decision-test-gate-standard-r64.md`

## 3. Gate execution

1. `P0`: `npm run build`, `npm run test:unit`, `npm run test:e2e`
2. `P1`: `P0 + npm run test:mutation`
3. `P2`: `P1 + release/hardening sign-off`

## 4. Acceptance Tests

### 4.1 Path Hardening

| ID | Scenario | PASS | FAIL | Gate | Mapa do suite |
|---|---|---|---|---|---|
| R69-PATH-01 | `PUT /api/v1/settings/runtime` z traversal w `hakPriorityList` lub `hakProfiles` (np. `../x.hak`). | `422`, `error.code=RUNTIME_PATH_TRAVERSAL_DETECTED`, `retryable=false`; brak zapisu nowej rewizji; emit `path_security_validation_failed`. | Inny status/kod, zapis konfiguracji mimo traversal, brak eventu security. | P1 | Rozszerzyc `backend/test/runtime-settings.e2e-spec.ts`; uzupelnic `backend/test/unit/runtime-settings.application.service.spec.ts`. |
| R69-PATH-02 | Absolute path poza allowlist root (`modulePackedPath`/`hakDirectoryPath`/HAK entry). | `422`, `RUNTIME_PATH_OUTSIDE_ALLOWED_ROOT`; brak fallback do `process.cwd()`. | Akceptacja pathu poza root lub cichy fallback. | P1 | Rozszerzyc `backend/test/runtime-settings.e2e-spec.ts`; uzupelnic `backend/test/unit/runtime-settings.application.service.spec.ts`. |
| R69-PATH-03 | `PUT` z control char/NUL w path fields. | `422`, `RUNTIME_PATH_INVALID_FORMAT`; fail-fast. | Walidacja przepuszcza payload albo mapuje na niesprawdzony blad. | P1 | Rozszerzyc `backend/test/runtime-settings.e2e-spec.ts`; uzupelnic `backend/test/unit/runtime-settings.application.service.spec.ts`. |
| R69-PATH-04 | Absolute HAK entry przy `allowAbsoluteHakEntries=false`. | `422`, `RUNTIME_HAK_ABSOLUTE_ENTRY_FORBIDDEN`; brak rewizji++; brak side effect. | Entry zaakceptowany albo zapisany bez bledu. | P1 | Rozszerzyc `backend/test/runtime-settings.e2e-spec.ts`; zmienic oczekiwania w `backend/test/unit/runtime-settings.application.service.spec.ts` (obecnie dopuszcza absolute). |
| R69-PATH-05 | Symlink/junction escape poza root przy `symlinkPolicy=deny`. | `422`, `RUNTIME_PATH_SYMLINK_FORBIDDEN` lub `RUNTIME_PATH_OUTSIDE_ALLOWED_ROOT`; event `path_security_symlink_blocked`. | Path zaakceptowany albo brak telemetry dla blokady. | P1 | Nowy unit dla policy/serwisu + rozszerzenie `backend/test/runtime-settings.e2e-spec.ts`. |
| R69-PATH-06 | Bootstrap z niepoprawnym path config. | Start zablokowany (`RUNTIME_PATH_SECURITY_BOOTSTRAP_FAILED`), API nie przechodzi readiness. | API startuje mimo naruszenia policy albo fallback uruchamia system. | P1 | Rozszerzyc `backend/test/unit/runtime-settings-bootstrap.service.spec.ts`; opcjonalny e2e bootstrap smoke. |
| R69-PATH-07 | `GET /api/v1/settings/runtime/haks/resolved` nigdy nie zwraca pathow poza allowlist. | Wszystkie `hakPaths` canonical i `withinRoot`; brak entry spoza allowlist. | Choc jedna zwrocona sciezka poza allowlist. | P1 | Rozszerzyc `backend/test/runtime-settings.e2e-spec.ts`; uzupelnic `backend/test/unit/runtime-settings.application.service.spec.ts`. |
| R69-PATH-08 | TOCTOU: podmiana symlinku miedzy validate i open. | Odczyt zablokowany; `RUNTIME_PATH_SECURITY_TOCTOU_DETECTED`; event `path_security_toctou_detected`. | Odczyt przechodzi do podmienionego targetu lub brak detekcji. | P1/P2 | Nowy unit/integration suite dla secure-open; brak obecnego pokrycia. |

### 4.2 Permission Gates

| ID | Scenario | PASS | FAIL | Gate | Mapa do suite |
|---|---|---|---|---|---|
| R69-PERM-01 | `PUT /api/v1/settings/runtime` bez tokenu. | `401`, `UNAUTHORIZED`. | Inny status lub endpoint przepuszcza request. | P0 | Rozszerzyc `backend/test/runtime-settings.e2e-spec.ts`; guard bazowy juz pokryty w `backend/test/unit/access.guard.spec.ts`. |
| R69-PERM-02 | `PUT /api/v1/settings/runtime` rola nieadmin. | `403`, `FORBIDDEN_ROLE`. | Write dopuszczony dla roli spoza policy. | P0 | Juz pokryte w `backend/test/runtime-settings.e2e-spec.ts` (utrzymac jako acceptance). |
| R69-PERM-03 | Admin bez `admin.runtime_paths.write` (ma np. tylko `admin.config.write`) mutuje path fields. | `403`, `FORBIDDEN_PERMISSION`; brak zapisu rewizji. | Mutacja przechodzi bez dedykowanej permission. | P1 | Rozszerzyc `backend/test/runtime-settings.e2e-spec.ts`; uzupelnic `backend/test/unit/access.guard.spec.ts` + `backend/test/unit/auth.policy.spec.ts`. |
| R69-PERM-04 | Matrix uprawnien: tylko podmiot z kompletem guardow endpointu moze zapisac path fields. | Tylko kombinacja zgodna z policy zwraca `200`; pozostale `403`. | Co najmniej jedna niedozwolona kombinacja przechodzi. | P1 | Rozszerzyc `backend/test/runtime-settings.e2e-spec.ts` i `backend/test/unit/access.guard.spec.ts`. |
| R69-PERM-05 | `PUT` poprawny security-wise emituje audit metadata (`updatedBy`, `revision`, diff path fields). | Odpowiedz i audit event zawieraja kompletne pola korelacyjne; rewizja zwiekszona o 1. | Brak metadanych audytu albo niespojna rewizja. | P1 | Rozszerzyc `backend/test/runtime-settings.e2e-spec.ts`; uzupelnic `backend/test/unit/runtime-settings.application.service.spec.ts`. |
| R69-PERM-06 | Defense-in-depth: service layer blokuje path mutation bez permission nawet przy obejsciu HTTP guard (test unit). | Rzutowany blad `FORBIDDEN_PERMISSION`; brak `repository.save`. | Service zapisuje dane bez dodatkowej weryfikacji permission. | P1 | Rozszerzyc `backend/test/unit/runtime-settings.application.service.spec.ts` (brak obecnie). |

### 4.3 Partition Filters

| ID | Scenario | PASS | FAIL | Gate | Mapa do suite |
|---|---|---|---|---|---|
| R69-PART-01 | `viewer` listuje `areas`/`catalog` i nie widzi `FOREIGN_PRIVATE`. | Brak rekordow spoza partycji; `total/items/objectCounts` liczone po filtrze. | Widoczne rekordy obce lub leakage przez `total/counts`. | P1 | Rozszerzyc `backend/test/areas.e2e-spec.ts`, `backend/test/catalog.e2e-spec.ts`; uzupelnic `backend/test/unit/areas.application.service.spec.ts`, `backend/test/unit/catalog.application.service.spec.ts`. |
| R69-PART-02 | `builder` bez DM permission nie widzi `dm_sensitive creature`. | Brak rekordow `dm_sensitive creature` w list/preview; deterministyczne deny semantics. | Rekord widoczny dla nieuprawnionego buildera. | P1 | Rozszerzyc `backend/test/catalog.e2e-spec.ts`; uzupelnic `backend/test/unit/catalog.application.service.spec.ts`. |
| R69-PART-03 | `dm` z `dm.spawn_creature` widzi `dm_sensitive creature` w dozwolonych partycjach. | Rekord zwracany tylko przy spelnionym ownership/public/shared + permission. | Rekord ukryty mimo poprawnych uprawnien albo ujawniony poza partycja. | P1 | Rozszerzyc `backend/test/catalog.e2e-spec.ts`; nowy/rozszerzony unit policy partition. |
| R69-PART-04 | `admin` widzi wszystkie rekordy nieusuniete (`isDeleted=false`). | Pelna widocznosc rekordow nieusunietych; `isDeleted=true` zawsze odfiltrowane. | Brak dostepu do legalnych rekordow admina albo leak usunietych rekordow. | P1 | Rozszerzyc `backend/test/areas.e2e-spec.ts` i `backend/test/catalog.e2e-spec.ts`; unit policy partition. |
| R69-PART-05 | `GET /areas/:areaId` poza partycja ownership zwraca `404 AREA_NOT_FOUND`. | `404`, `AREA_NOT_FOUND`, bez potwierdzenia istnienia zasobu. | `403`/`200` z sygnalem o istnieniu obcej area. | P1 | Rozszerzyc `backend/test/areas.e2e-spec.ts`; uzupelnic `backend/test/unit/areas.application.service.spec.ts`. |
| R69-PART-06 | Filtry query (`query/tag/biome/subtype/benchmark`) nie omijaja partition gating. | Wyniki po query nadal ograniczone przez ACL; brak cross-partition leak. | Query zwraca dane spoza partycji mimo ACL. | P1 | Rozszerzyc `backend/test/areas.e2e-spec.ts` i `backend/test/catalog.e2e-spec.ts`. |
| R69-PART-07 | Brak metadanych ACL na rekordzie => fallback admin-only. | `viewer/builder/dm` nie widzi rekordu; `admin` widzi. | Rekord bez ACL trafia do ról nieadmin. | P1 | Nowy unit policy partition + rozszerzenie e2e area/catalog. |

## 5. Mapa do istniejacych test suites (stan biezacy)

| Suite | Typ | Powiazane acceptance IDs | Stan pokrycia |
|---|---|---|---|
| `backend/test/runtime-settings.e2e-spec.ts` | e2e | R69-PATH-01..07, R69-PERM-01..05 | `partial`: obecnie pokrywa glownie role gate (`FORBIDDEN_ROLE`) i happy path; brak path hardening + permission split. |
| `backend/test/unit/runtime-settings.application.service.spec.ts` | unit | R69-PATH-01..05,07; R69-PERM-05..06 | `partial`: obecnie dopuszcza absolute HAK entry; brak enforce path policy/permission defense-in-depth. |
| `backend/test/unit/runtime-settings-bootstrap.service.spec.ts` | unit | R69-PATH-06 | `partial`: sprawdza tylko brak obu pathow; brak walidacji allowlist/symlink/fail-fast security codes. |
| `backend/test/unit/access.guard.spec.ts` | unit | R69-PERM-01..04 | `partial`: silne pokrycie bearer/role/permission generic; brak nowej dedykowanej permission `admin.runtime_paths.write`. |
| `backend/test/auth.e2e-spec.ts` | e2e | R69-PERM-01..04 (posrednio) | `partial`: pokrywa ogolne auth/permission endpointy, nie runtime path mutation matrix. |
| `backend/test/areas.e2e-spec.ts` | e2e | R69-PART-01,04,05,06 | `gap`: obecnie brak scenariuszy ACL partition/securityLabel. |
| `backend/test/unit/areas.application.service.spec.ts` | unit | R69-PART-01,05 | `gap`: obecnie brak principal-aware filtration i anti-leak counts. |
| `backend/test/catalog.e2e-spec.ts` | e2e | R69-PART-01..04,06 | `gap`: obecnie brak ACL partition/securityLabel tests. |
| `backend/test/unit/catalog.application.service.spec.ts` | unit | R69-PART-01..04,07 | `gap`: obecnie brak filtration by principal + securityLabel gates. |
| `backend/test/unit/auth.policy.spec.ts` | unit | R69-PERM-03..04 | `partial`: do rozszerzenia o nowy permission split. |

## 6. Kryteria zamkniecia (PASS calego pakietu R69)

1. Wszystkie testy `R69-PERM-*` i `R69-PATH-*` przechodza w gate `P1`.
2. Wszystkie testy `R69-PART-*` przechodza w gate `P1` i nie wykazuja leakow `total/counts/preview`.
3. Testy `R69-PATH-08` (TOCTOU) przechodza w co najmniej jednym suite uruchamianym w `P2`.
4. Brak otwartych regresji security o priorytecie `A0/A1` z mapowania R67.

## 7. Kryteria odrzucenia (FAIL calego pakietu R69)

1. Jakikolwiek test `R69-PATH-*` lub `R69-PERM-*` zwraca status/code niezgodny z kontraktem.
2. Wykryty cross-partition leak danych (rekordy, metadane, `total`, `objectCounts`, preview).
3. Mutacje path fields mozliwe bez kompletu wymaganych permission gates.
4. Bootstrap przechodzi mimo konfiguracji path naruszajacej policy.
