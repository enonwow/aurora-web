# Reverse Implementation Starter Pack R82 (Agent R14)

Data: 2026-05-24  
Cel: uruchomic implementacje backendu od razu na najmocniej potwierdzonych kontraktach reverse, bez wchodzenia w obszary HOLD.

## 1) Artefakty wejsciowe z reverse (obowiazkowe inputy)

1. `backend/docs/aurora-reverse/reverse-backend-decision-closure-r81.md`  
   - source of truth: co implementujemy teraz vs co pozostaje na HOLD.
2. `backend/docs/aurora-reverse/reverse-executive-summary-r81.md`  
   - szybki kontekst 90%/70% pewnosci i priorytet ruchow.
3. `backend/docs/aurora-reverse/reverse-final-evidence-pack-r81.md`  
   - 20 cytowalnych dowodow adresowych do decyzji architektury.
4. `backend/docs/aurora-reverse/reverse-validation-matrix-r79.md`  
   - potwierdzenia/hipotezy/braki + checklist implementacyjny.
5. `backend/docs/aurora-reverse/reverse-high-value-function-dossiers-r80.md`  
   - dossier funkcji krytycznych (IFO, TLK/HAK, 2DA, lane parserow).
6. `backend/docs/aurora-reverse/execution-plan-first-3-prs-r68.md`  
   - sekwencja wdrozenia i scope pierwszych PR.

## 2) Konkretne 3 pierwsze kroki kodowe

### Krok 1. Runtime settings + path security gate (implementowac teraz)

Zakres kodowy:
1. Rozszerzyc model runtime settings o `pathSecurity` + walidacje canonical path.
2. Wymusic fail-fast przy niezgodnej konfiguracji w bootstrap i `PUT /api/v1/settings/runtime`.
3. Rozdzielic permission dla zmian path-sensitive (`admin.runtime_paths.write`) oraz audit event.

Pliki startowe (pierwsze do ruszenia):
1. `backend/src/modules/runtime-settings/domain/runtime-settings.types.ts`
2. `backend/src/modules/runtime-settings/domain/runtime-settings.schema.ts`
3. `backend/src/modules/runtime-settings/application/runtime-settings.application.service.ts`
4. `backend/src/modules/runtime-settings/application/runtime-settings-bootstrap.service.ts`
5. `backend/src/modules/runtime-settings/adapters/inbound/http/runtime-settings.controller.ts`

Definition of done (minimum):
1. `GET/PUT /api/v1/settings/runtime` dziala bez zmiany URL.
2. Zla konfiguracja path zwraca jawny blad domenowy i blokuje bootstrap.
3. Zmiana sciezek zapisuje audit event.

### Krok 2. Source resolver core (deterministyczny chain + provenance)

Zakres kodowy:
1. Dodac izolowany modul resolvera zrodel z deterministycznym winner selection.
2. Wymusic policy: `ARE/GIT` module-bound; dla `UTC/UTP/2DA/TLK` pelny chain.
3. Dodac diagnostyke i trace (`SOURCE_RESOLVE_MISS`, `SOURCE_TIEBREAK_APPLIED`, `SOURCE_POLICY_VIOLATION`).

Pliki startowe (pierwsze do ruszenia):
1. `backend/src/modules/processing/source-resolver/application/source-resolver.service.ts`
2. `backend/src/modules/processing/source-resolver/application/resource-candidate-catalog.service.ts`
3. `backend/src/modules/processing/source-resolver/application/hak-priority-sorter.ts`
4. `backend/src/modules/processing/source-resolver/domain/source-resolution.policy.ts`
5. `backend/src/modules/processing/source-resolver/domain/source-diagnostics.ts`

Definition of done (minimum):
1. Ten sam input zawsze daje tego samego winnera (determinism).
2. Resolver zwraca provenance (warstwa + powod wyboru/odrzutu).
3. Brak publicznych endpointow w tym kroku (modul wewnetrzny).

### Krok 3. Processing jobs control-plane (enqueue/status/cancel/retry)

Zakres kodowy:
1. Wystawic minimalne API jobs: enqueue, status, cancel, retry, list.
2. Dodac state machine status/phase + idempotency store.
3. Dodac retry policy i pola `cancelRequested/cancelHonored`.

Pliki startowe (pierwsze do ruszenia):
1. `backend/src/modules/processing/adapters/inbound/http/processing.controller.ts`
2. `backend/src/modules/processing/adapters/inbound/http/processing-jobs.controller.ts`
3. `backend/src/modules/processing/jobs/domain/job-status.state-machine.ts`
4. `backend/src/modules/processing/jobs/application/processing-job.service.ts`
5. `backend/src/database/schema.ts`

Definition of done (minimum):
1. Endpointy jobs dzialaja z kontraktem statusow i code path `PIPELINE_*`.
2. Idempotency zapobiega duplikacji joba przy replay requestu.
3. `cancel` i `retry` respektuja dozwolone przejscia stanu.

## 3) Ryzyka na start (z mapowaniem na reverse)

1. Ryzyko: overfit do pojedynczego call-path `ARE/GIT`.  
   - Zrodlo: `reverse-validation-matrix-r79.md` (C10, G7), `reverse-backend-decision-closure-r81.md` (HOLD strict area).
2. Ryzyko: bledna polityka aliasow/duplikatow `LoadScreenID/LoadScreenId`, `LinkedToFlags`.  
   - Zrodlo: `reverse-validation-matrix-r79.md` (G2), `reverse-backend-decision-closure-r81.md` (HOLD alias policy).
3. Ryzyko: niepelne odwzorowanie fallbackow TLK/HAK (`FUN_00ABCFEC` czesciowo posrednie).  
   - Zrodlo: `reverse-high-value-function-dossiers-r80.md` (Dossier 04), `reverse-final-evidence-pack-r81.md` (#4).
4. Ryzyko: drift runtime vs toolset semantics (ten sam eksport, rozne intencje).  
   - Zrodlo: `reverse-validation-matrix-r79.md` (G3).

## 4) Testy na start (pierwsza brama CI)

Testy priorytet P0:
1. Unit: runtime settings schema + path security + bootstrap fail-fast.
2. Unit: `hak-priority-sorter` i deterministyczny winner resolvera.
3. Unit: job state machine (`allowed/disallowed transitions`) + retry policy.
4. Integration: source resolver provenance + policy enforcement (`ARE/GIT` module-bound).
5. Integration: idempotency store (`same fingerprint -> same jobId`).
6. E2E: `GET/PUT /api/v1/settings/runtime` + processing jobs happy path (`enqueue -> status -> cancel/retry`).

Minimalne komendy gate:
1. `npm run build`
2. `npm run test:unit`
3. `npm run test:e2e`

## 5) Czego nie robic w tym starcie (explicit hold)

1. Nie wlaczac strict `POST /api/v1/processing/area` z pelna walidacja lane/cardinality.
2. Nie hardcodowac policy aliasow transition keys (`last-wins` itp.) bez dodatkowego dowodu.
3. Nie dodawac hard `HAK_V1.0` gate jako warunku blokujacego.

## 6) Exit criteria dla Starter Pack R82

1. Kroki 1-3 sa zakodowane i przechodza bazowy gate testow.
2. Obszary HOLD pozostaja za feature flag lub poza zakresem API publicznego.
3. Kazda decyzja implementacyjna ma odwolanie do artefaktu reverse z sekcji 1.
