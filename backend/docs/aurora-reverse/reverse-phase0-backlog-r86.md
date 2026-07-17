# Reverse Phase-0 Backlog R86 (Agent R25)

Data: 2026-05-24
Zakres: 12 najwazniejszych zadan implementacyjnych backendu do realizacji w Phase-0, wynikajacych bezposrednio z pakietu reverse R79-R85.
Regula: strict `processing/area`, strict alias policy oraz hard `HAK_V1.0` pozostaja HOLD zgodnie z R81/R85.

## 1) Runtime settings API contract (`GET/PUT /api/v1/settings/runtime`)
Powiazanie reverse: `reverse-backend-readiness-r79.md`, `reverse-backend-decision-closure-r81.md`, `runtime-settings-validation-matrix-r67.md`.
Definition of Done: endpointy `GET/PUT` dzialaja bez zmiany URL, waliduja payload wg kontraktu runtime settings i zwracaja stabilne kody bledow domenowych.
Test akceptacyjny: `backend/test/runtime-settings.e2e-spec.ts` przechodzi scenariusze `GET -> PUT(valid) -> GET` oraz `PUT(invalid)` z oczekiwanymi kodami 2xx/4xx i niezmiennym ksztaltem odpowiedzi.

## 2) Path security + bootstrap fail-fast
Powiazanie reverse: `reverse-to-test-matrix-r83.md` (R83-UNIT-001/002, R83-REG-001), `reverse-coverage-audit-r82.md`, `path-security-hardening-spec-r63.md`.
Definition of Done: bootstrap blokuje start przy niespojnej konfiguracji sciezek/TLK; canonical path validation odrzuca traversal/NUL/symlink-escape.
Test akceptacyjny: testy unit bootstrap + walidator sciezek oraz e2e runtime settings potwierdzaja fail-fast i bledy typed (`FORBIDDEN_*` / walidacyjne) dla payloadow negatywnych.

## 3) Split uprawnien i audit dla zmian path-sensitive
Powiazanie reverse: `reverse-implementation-starter-pack-r82.md`, `security-controls-acceptance-tests-r69.md`, `threat-model-decompile-blob-pipeline-r65.md`.
Definition of Done: zmiany path-sensitive wymagaja `admin.runtime_paths.write`, a kazda skuteczna zmiana zapisuje audit event z actor/action/before-after.
Test akceptacyjny: e2e authz matrix potwierdza `403` bez uprawnienia i `200` z uprawnieniem; test audytu potwierdza zapis eventu po udanym `PUT`.

## 4) `GET /api/v1/settings/runtime/haks/resolved` (deterministyczny resolved set)
Powiazanie reverse: `reverse-backend-readiness-r79.md`, `reverse-backend-decision-closure-r81.md`, `reverse-to-test-matrix-r83.md` (R83-UNIT-005, R83-REG-003).
Definition of Done: endpoint zwraca deterministyczna liste HAK wraz z provenance i tie-break reason; ten sam input zawsze daje ten sam wynik.
Test akceptacyjny: fixture z kolizjami HAK uruchomiony wielokrotnie zwraca identyczny `winner` i identyczny porzadek resolved listy.

## 5) ModuleIfoMetadataService read/write round-trip
Powiazanie reverse: `reverse-backend-readiness-r79.md`, `reverse-to-test-matrix-r83.md` (R83-UNIT-003/004, R83-REG-002), `reverse-final-evidence-pack-r81.md`.
Definition of Done: read/write `Module.IFO` zachowuje `Mod_CustomTlk`, `Mod_HakList`, `Mod_Entry_*`, `Mod_Expan_List`; polityka nieznanych kluczy jest jawna i stabilna.
Test akceptacyjny: round-trip `parse -> write -> parse` na tym samym IFO nie zmienia wartosci kluczowych pol i nie gubi kluczy objetych polityka passthrough.

## 6) TlkResolverService (open gate + typed errors)
Powiazanie reverse: `reverse-backend-readiness-r79.md`, `reverse-to-test-matrix-r83.md` (R83-UNIT-002), `reverse-validation-matrix-r79.md`.
Definition of Done: resolver poprawnie rozwiazuje lokalizacje `dialog.tlk`, rozroznia success/fallback/missing i zwraca typed error dla brakujacego zasobu.
Test akceptacyjny: testy unit pokrywaja scenariusze `primary hit`, `fallback hit`, `missing`, a regression test potwierdza zgodny kod bledu przy braku `dialog.tlk`.

## 7) Source resolver core policy (`module-bound` + precedence chain)
Powiazanie reverse: `reverse-coverage-audit-r82.md`, `resolver-interfaces-contract-r69.md`, `adr-bundle-r66.md`, `reverse-backend-decision-closure-r81.md`.
Definition of Done: resolver wymusza policy `ARE/GIT` jako module-bound oraz pelny chain precedence dla `UTC/UTP/2DA/TLK`; zwraca powod wyboru i odrzutu kandydatow.
Test akceptacyjny: integration test `source-resolver.provenance.e2e` przechodzi macierz fallback-order i policy-enforcement bez niejawnych branch override.

## 8) Diagnostyka resolvera i telemetry event taxonomy
Powiazanie reverse: `reverse-implementation-starter-pack-r82.md`, `observability-event-taxonomy-spec-r63.md`, `reverse-implementation-risk-register-r84.md` (R84-11).
Definition of Done: zaimplementowane eventy co najmniej `SOURCE_RESOLVE_MISS`, `SOURCE_TIEBREAK_APPLIED`, `SOURCE_POLICY_VIOLATION` z trace/correlation id.
Test akceptacyjny: test integration potwierdza emisje wymaganych eventow i komplet obowiazkowych pol telemetry dla sukcesu i bledu resolvera.

## 9) Processing jobs API control-plane
Powiazanie reverse: `reverse-backend-readiness-r79.md`, `reverse-backend-decision-closure-r81.md`, `code-skeleton-processing-jobs-r68.md`.
Definition of Done: endpointy `POST /api/v1/processing/{type}`, `GET /api/v1/processing/jobs/{jobId}`, `POST :cancel`, `POST :retry`, `GET /api/v1/processing/{type}` sa dostepne i zgodne z kontraktem.
Test akceptacyjny: e2e `enqueue -> status -> list` przechodzi dla co najmniej jednego typu processing i zwraca zgodne `jobId/status/phase`.

## 10) Job state machine invariants + idempotency + cancel/retry semantics
Powiazanie reverse: `job-state-machine-invariants-r69.md`, `reverse-to-test-matrix-r83.md` (R83-UNIT-016, R83-REG-014, R83-MUT-012), `reverse-coverage-audit-r82.md`.
Definition of Done: dozwolone i zabronione przejscia stanu sa wymuszone; `cancelRequested/cancelHonored` dziala; replay requestu nie tworzy duplikatu joba.
Test akceptacyjny: unit + e2e potwierdzaja blokade niedozwolonych przejsc, poprawne `retry` tylko z dozwolonych stanow terminalnych i idempotentny `jobId` dla tego samego fingerprintu.

## 11) Security negative-path gate (authz/partition/path)
Powiazanie reverse: `reverse-coverage-audit-r82.md`, `security-controls-acceptance-tests-r69.md`, `reverse-to-test-matrix-r83.md` (R83-REG-010..012).
Definition of Done: wdrozone kontrole authz, access partition i path hardening sa zautomatyzowane jako stale testy gate CI.
Test akceptacyjny: pakiet scenariuszy `R69-PATH-01..08`, `R69-PERM-01..06`, `R69-PART-01..07` przechodzi i blokuje merge przy regresji.

## 12) Benchmark harness release gate
Powiazanie reverse: `reverse-coverage-audit-r82.md`, `benchmark-harness-api-contract-r69.md`, `benchmark-harness-contract-spec-r63.md`, `benchmark-data-collection-contract-r67.md`.
Definition of Done: backend generuje deterministyczny `datasetFingerprint`, wymagane artefakty (`benchmark-report.json`, `benchmark-events.jsonl`, `benchmark-summary.md`) i egzekwuje progi regresji vs baseline.
Test akceptacyjny: powtorzony run na tym samym corpus daje identyczny fingerprint; suite benchmarkowa waliduje komplet artefaktow i failuje przy przekroczeniu progow regresji.

## Brama zakonczenia Phase-0
1. Zadania 1-12 maja zielone testy akceptacyjne w CI (`npm run test:unit`, `npm run test:e2e`, `npm run test:mutation` dla zakresu wdrozonego).
2. Wszystkie obszary HOLD z R81/R85 pozostaja nieaktywne w publicznym API.
3. Kazdy merge mapuje `decyzja -> dowod reverse -> test` (wymog R84/R85).
