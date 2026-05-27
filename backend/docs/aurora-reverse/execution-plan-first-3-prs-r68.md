# Execution Plan: First 3 PRs (R66-R68) - Agent F6

Data: 2026-05-24
Status: Ready for implementation
Zakres: pierwsze 3 PR-y implementacyjne tak, aby backend mogl ruszyc kodowo bez konfliktow merge i bez blokad testowych.

## 1. Zalozenia i kolejnosc

1. Plan oparty na `r66` (implementation slices + ADR bundle) oraz `r67` (ADR->code mapping + test matrix/corpus/examples).
2. W repo nie ma osobnego artefaktu nazwanego `r68`; traktujemy `r68` jako warstwe execution sequencing dla startu implementacji.
3. Kolejnosc merge: PR-1 -> PR-2 -> PR-3 (bez rownoleglego merge do tych samych plikow).
4. Zasada antykonfliktowa:
   - PR-1 dotyka tylko `runtime-settings` + `auth` (istniejace moduly).
   - PR-2 dodaje nowy modul `processing/source-resolver` bez zmian API i bez zmian DB.
   - PR-3 dodaje `processing api/jobs` + DB + podpiecie do `AppModule`, bazujac na PR-2.

---

## PR-1: Runtime Settings Security Foundation

Powiazanie: ADR-66-02, Slice 1 (pakiety A/B/C), Slice 4 (SEC-01, SEC-02, SEC-05, SEC-07), mapping R67: `A02-T1`, `A02-T2`, `A02-T3`.

### Scope

1. Rozszerzenie kontraktu runtime settings o `pathSecurity` i migracje legacy rekordu.
2. Dodanie wspolnej walidacji/canonicalizacji path (PathSecurityGuard na poziomie runtime settings).
3. Wymuszenie fail-fast dla niezgodnej konfiguracji path w `PUT /settings/runtime` i bootstrap.
4. Split permission dla mutacji path-sensitive (`admin.runtime_paths.write`) + audit event `runtime_paths_changed`.
5. Utrzymanie zgodnosci obecnych endpointow (`GET/PUT runtime`, `GET haks/resolved`) bez zmiany URL.

### Files (target)

1. `backend/src/modules/runtime-settings/domain/runtime-settings.types.ts`
2. `backend/src/modules/runtime-settings/domain/runtime-settings.schema.ts`
3. `backend/src/modules/runtime-settings/domain/runtime-settings.defaults.ts`
4. `backend/src/modules/runtime-settings/adapters/outbound/file/file-runtime-settings.repository.ts`
5. `backend/src/modules/runtime-settings/application/runtime-settings-path-security.service.ts` (new)
6. `backend/src/modules/runtime-settings/application/runtime-settings.application.service.ts`
7. `backend/src/modules/runtime-settings/application/runtime-settings-bootstrap.service.ts`
8. `backend/src/modules/runtime-settings/adapters/inbound/http/runtime-settings.controller.ts`
9. `backend/src/modules/runtime-settings/adapters/inbound/http/runtime-settings.schemas.ts`
10. `backend/src/modules/auth/domain/auth.policy.ts`

### Tests

1. Unit:
   - `backend/test/unit/runtime-settings.schemas.spec.ts`
   - `backend/test/unit/runtime-settings.application.service.spec.ts`
   - `backend/test/unit/runtime-settings-bootstrap.service.spec.ts`
   - `backend/test/unit/runtime-settings-path-security.service.spec.ts` (new)
   - `backend/test/unit/auth.policy.spec.ts`
2. E2E:
   - `backend/test/runtime-settings.e2e-spec.ts`
   - `backend/test/e2e/runtime-settings.security.e2e-spec.ts` (new)
3. Gate:
   - `npm run build`
   - `npm run test:unit`
   - `npm run test:e2e`
   - `npm run test:mutation` (P1)

### Rollback

1. Natychmiastowy rollback: `git revert` calego PR (single revert commit).
2. Operacyjny fallback (tymczasowy): `pathSecurity.enforce=false` w runtime settings dla awaryjnego odblokowania (tylko do czasu poprawki).
3. Jesli rollout permission powoduje 403: tymczasowo dopisac `admin.runtime_paths.write` do roli admin w seed/policy i ponowic deploy.
4. Kryterium cofniecia: wzrost bledow `RUNTIME_PATH_*` lub blokada startup (`RUNTIME_PATH_SECURITY_BOOTSTRAP_FAILED`) na produkcyjnych konfiguracjach.

---

## PR-2: Source Resolver Core (Deterministic + Module-Bound)

Powiazanie: ADR-66-01, Slice 2, mapping R67: `A01-T1`, `A01-T2`, `A01-T3`.

### Scope

1. Dodanie nowego modulu resolvera zrodel z deterministycznym chainem i tie-break.
2. Egzekucja policy per typ:
   - `ARE/GIT` jako module-bound,
   - pelny chain dla `UTC/UTP/models/textures/2DA/TLK`.
3. Immutable candidate catalog + sorter HAK (`hakPriorityEffective`, stable remisy).
4. Provenance/trace/diagnostics (`SOURCE_RESOLVE_MISS`, `SOURCE_LAYER_BLOCKED`, `SOURCE_TIEBREAK_APPLIED`, `SOURCE_POLICY_VIOLATION`).
5. Bez podpinania publicznych endpointow i bez migracji DB w tym PR.

### Files (target)

1. `backend/src/modules/processing/source-resolver/application/source-resolver.service.ts` (new)
2. `backend/src/modules/processing/source-resolver/application/resource-candidate-catalog.service.ts` (new)
3. `backend/src/modules/processing/source-resolver/application/hak-priority-sorter.ts` (new)
4. `backend/src/modules/processing/source-resolver/application/resolution-trace.builder.ts` (new)
5. `backend/src/modules/processing/source-resolver/domain/source-resolution.policy.ts` (new)
6. `backend/src/modules/processing/source-resolver/domain/source-resolution.types.ts` (new)
7. `backend/src/modules/processing/source-resolver/domain/source-diagnostics.ts` (new)

### Tests

1. Unit:
   - `backend/test/unit/source-resolver/source-resolver.service.spec.ts` (new)
   - `backend/test/unit/source-resolver/hak-priority-sorter.spec.ts` (new)
2. Integration:
   - `backend/test/integration/source-resolver/source-catalog.integration.spec.ts` (new)
3. Contract:
   - `backend/test/contract/source-resolver/source-diagnostics.contract.spec.ts` (new)
4. Gate:
   - `npm run build`
   - `npm run test:unit`
   - `npm run test:e2e` (smoke, bez nowego endpointu)

### Rollback

1. Natychmiastowy rollback: `git revert` calego PR (modul jest izolowany, bez zmian DB i API).
2. Jesli ryzyko driftu policy `ARE/GIT`: revert tylko PR-2 i pozostawienie backendu na dotychczasowym zachowaniu bez integracji resolvera.
3. Kryterium cofniecia: niestabilny winner (non-determinism) albo falszywe resolution dla `ARE/GIT` wykryte w testach `U4/U5/I2/C4/C5`.

---

## PR-3: Processing API + Jobs Foundation (Enqueue/Status/Cancel/Retry)

Powiazanie: ADR-66-05, ADR-66-06, Slice 3, mapping R67: `A05-T1`, `A05-T2`, `A05-T3`, `A06-T1`, `A06-T2`.

### Scope

1. Dodanie minimalnego pionu processing jobs:
   - `POST /api/v1/processing/{type}` (enqueue + idempotency),
   - `GET /api/v1/processing/jobs/{jobId}`,
   - `POST /api/v1/processing/jobs/{jobId}:cancel`,
   - `POST /api/v1/processing/jobs/{jobId}:retry`.
2. Implementacja state machine `status + phase` z atomowymi przejsciami.
3. Idempotency store + request fingerprint + conflict handling.
4. Retry policy (bounded attempts/backoff) i pola `cancelRequested/cancelHonored`.
5. Dodanie tabel do DB schema i podpiecie modulu processing do `AppModule`.
6. Publiczny envelope zgodny z kontraktami R67 examples (kody: `PIPELINE_*`).

### Files (target)

1. `backend/src/database/schema.ts`
2. `backend/src/modules/processing/processing.module.ts` (new)
3. `backend/src/modules/processing/adapters/inbound/http/processing.controller.ts` (new)
4. `backend/src/modules/processing/adapters/inbound/http/processing-jobs.controller.ts` (new)
5. `backend/src/modules/processing/adapters/inbound/http/processing.schemas.ts` (new)
6. `backend/src/modules/processing/jobs/domain/job-status.state-machine.ts` (new)
7. `backend/src/modules/processing/jobs/domain/retry.policy.ts` (new)
8. `backend/src/modules/processing/jobs/application/processing-job.service.ts` (new)
9. `backend/src/modules/processing/jobs/application/processing-lifecycle.engine.ts` (new)
10. `backend/src/modules/processing/jobs/application/retry-scheduler.service.ts` (new)
11. `backend/src/modules/processing/jobs/adapters/outbound/postgres/processing-idempotency.repository.ts` (new)
12. `backend/src/app.module.ts`

### Tests

1. Unit:
   - `backend/test/unit/processing/jobs/job-status.state-machine.spec.ts` (new)
   - `backend/test/unit/processing/jobs/retry.policy.spec.ts` (new)
2. Integration:
   - `backend/test/integration/processing/idempotency-store.integration.spec.ts` (new)
   - `backend/test/integration/processing/jobs/retry-exhausted.integration.spec.ts` (new)
3. E2E:
   - `backend/test/e2e/processing-api.e2e-spec.ts` (new)
   - `backend/test/e2e/processing-jobs.e2e-spec.ts` (new)
4. Gate:
   - `npm run build`
   - `npm run test:unit`
   - `npm run test:e2e`
   - `npm run test:mutation` (P1, bo lifecycle/guards/idempotency)

### Rollback

1. Natychmiastowy rollback: `git revert` PR-3.
2. Bezpiecznik rollout: endpointy processing pod feature flag (domyslnie off na prod do czasu przejscia e2e + smoke operacyjnego).
3. DB rollback:
   - jesli migracje sa additive (zalecane), przy rollbacku aplikacji zostawic tabele i tylko wylaczyc routing endpointow,
   - nie usuwac danych idempotency/jobs w trybie awaryjnym (audit trail).
4. Kryterium cofniecia: bledy stanu (`PIPELINE_JOB_STATE_CONFLICT` poza oczekiwanym matrix), duplikacja jobow przy replay, problemy startup po podpieciu `ProcessingModule`.

---

## 2. Warunki wejscia/wyjscia miedzy PR-ami (bez konfliktow)

1. PR-2 startuje dopiero po merge PR-1.
2. PR-3 startuje dopiero po merge PR-2.
3. Kazdy PR ma osobny ownership katalogow i osobne testy akceptacyjne.
4. Jedyny plik wspolny miedzy PR-2 i PR-3 to `backend/src/app.module.ts`; zmieniany wylacznie w PR-3.
5. Jesli PR-1 zmieni policy auth, PR-3 nie powiela zmian w `auth.policy.ts` (unikamy konfliktu logicznego).

## 3. Definition of Ready dla startu kodowania

1. Potwierdzony branch order: `pr1-runtime-security` -> `pr2-source-resolver-core` -> `pr3-processing-jobs-api`.
2. Potwierdzone ownership testow i gate P1 dla PR-1 oraz PR-3.
3. Brak rownoleglego edytowania tych samych plikow przez inne strumienie prac.
