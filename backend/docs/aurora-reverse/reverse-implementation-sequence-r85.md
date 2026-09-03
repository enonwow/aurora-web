# Reverse Implementation Sequence R85 (Agent R24)

Data: 2026-05-24  
Status bazowy: **CONDITIONAL GO** (zgodnie z `reverse-go-no-go-r85.md`)  
Cel: finalna sekwencja wdrozenia backendu oparta o pakiet reverse `r63-r85`, z jednoznacznymi wejsciami/wyjsciami na krok.

## Krok 1. Brama konwergencji i freeze zakresu

**Wejscia**
- `backend/docs/aurora-reverse/reverse-convergence-checklist-r84.md`
- `backend/docs/aurora-reverse/reverse-go-no-go-r85.md`
- `backend/docs/aurora-reverse/reverse-master-index-r83.md`
- `backend/docs/aurora-reverse/reverse-backend-decision-closure-r81.md`
- `backend/docs/aurora-reverse/reverse-coverage-audit-r82.md`

**Dzialania**
- Potwierdzic komplet artefaktow must-have i spojny werdykt `GO` dla zakresu "implementowac teraz".
- Zamrozic scope iteracji 1: runtime settings, source control-plane, processing jobs control-plane, benchmark gates.
- Potwierdzic HOLD: strict `processing/area`, strict alias/duplicate policy transitions, hard `HAK_V1.0` gate, strict UT* mapping.

**Wyjscia**
- Podpisana decyzja scope v1 (`GO-CONDITIONAL`) z jawna lista `IN` i `HOLD`.
- Tabela mapowania `decyzja -> dowod reverse -> test owner` dla calego scope v1.

## Krok 2. Minimalny pakiet reverse przed kodowaniem (MRM)

**Wejscia**
- `backend/docs/aurora-reverse/reverse-minimal-remaining-work-r85.md`
- `backend/docs/aurora-reverse/reverse-unknowns-resolution-queue-r80.md`
- `backend/docs/aurora-reverse/reverse-open-questions-burndown-r82.md`
- `backend/docs/aurora-reverse/reverse-final-evidence-pack-r81.md`

**Dzialania**
- Domknac MRM `R85-01..R85-04` (call-chain minimum, alias policy minimum, bounds/overflow minimum, golden fixtures).
- Ograniczyc reverse tylko do zakresu, ktory bezposrednio redukuje ryzyko pierwszych PR.

**Wyjscia**
- Skonsolidowany pakiet MRM:
  - `adres -> rola -> dowod` dla call-chain minimum,
  - decyzja alias/duplikat `accept/reject/normalize`,
  - tabela `field -> reject/normalize/warn`,
  - paczka 8-12 golden fixtures z expected outcomes.

## Krok 3. Implementacja runtime settings + path security gate

**Wejscia**
- `backend/docs/aurora-reverse/reverse-implementation-starter-pack-r82.md`
- `backend/docs/aurora-reverse/reverse-backend-readiness-r79.md`
- `backend/docs/aurora-reverse/runtime-settings-validation-matrix-r67.md`
- `backend/docs/aurora-reverse/path-security-hardening-spec-r63.md`
- `backend/docs/aurora-reverse/security-controls-acceptance-tests-r69.md`

**Dzialania**
- Wdrozyc `GET/PUT /api/v1/settings/runtime` z walidacja i fail-fast bootstrap.
- Dodac split permission dla zmian path-sensitive i audit event.
- Utrzymac zgodnosc kontraktu bledow i zachowania e2e.

**Wyjscia**
- Dzialajacy runtime settings API bez zmiany URL.
- Blokada startu przy zlej konfiguracji path + komplet zdarzen audit.
- Zielone testy P0 runtime/security (unit + e2e dla krytycznych scenariuszy).

## Krok 4. Implementacja source resolver core z provenance

**Wejscia**
- `backend/docs/aurora-reverse/reverse-findings-resource-pipeline-r78.md`
- `backend/docs/aurora-reverse/resolver-interfaces-contract-r69.md`
- `backend/docs/aurora-reverse/resource-precedence-matrix-r65.md`
- `backend/docs/aurora-reverse/module-source-priority-spec-r63.md`
- `backend/docs/aurora-reverse/reverse-validation-matrix-r79.md`

**Dzialania**
- Wdrozyc deterministyczny chain resolvera z policy enforcement.
- Dla `ARE/GIT` utrzymac module-bound; dla `UTC/UTP/2DA/TLK` stosowac zatwierdzony chain fallback.
- Emitowac provenance i diagnostyke decyzji (`winner`, `rejected reasons`, policy events).

**Wyjscia**
- Wewnetrzny resolver zwracajacy stabilny wynik dla identycznego wejscia.
- Telemetria resolvera gotowa do regression/differential tests.
- Brak ekspozycji strict parser behavior poza zatwierdzonym zakresem.

## Krok 5. Implementacja processing jobs control-plane

**Wejscia**
- `backend/docs/aurora-reverse/reverse-backend-decision-closure-r81.md`
- `backend/docs/aurora-reverse/processing-api-shape-spec-r63.md`
- `backend/docs/aurora-reverse/processing-job-lifecycle-spec-r63.md`
- `backend/docs/aurora-reverse/job-state-machine-invariants-r69.md`
- `backend/docs/aurora-reverse/code-skeleton-processing-jobs-r68.md`

**Dzialania**
- Wystawic API jobs: enqueue/status/cancel/retry/list.
- Zaimplementowac state machine, idempotency i kontrolowane retry/cancel transitions.
- Powiazac statusy i kody bledow z kontraktami processing.

**Wyjscia**
- Stabilny control-plane jobs niezalezny od strict `ARE/GIT`.
- Udokumentowane i przetestowane inwarianty przejsc stanu.
- Zielone testy P0 lifecycle + idempotency.

## Krok 6. Brama testowo-ryzykowa i benchmark release gate

**Wejscia**
- `backend/docs/aurora-reverse/reverse-to-test-matrix-r83.md`
- `backend/docs/aurora-reverse/reverse-implementation-risk-register-r84.md`
- `backend/docs/aurora-reverse/security-controls-acceptance-tests-r69.md`
- `backend/docs/aurora-reverse/benchmark-harness-api-contract-r69.md`
- `backend/docs/aurora-reverse/benchmark-harness-contract-spec-r63.md`
- `backend/docs/aurora-reverse/benchmark-data-collection-contract-r67.md`

**Dzialania**
- Uruchomic gate CI: testy `P0` (runtime, security, jobs, IFO/TLK fail-fast) + differential/golden tests.
- Uruchomic benchmark gate (`datasetFingerprint`, artefakty raportowe, progi regresji).
- Egzekwowac top-ryzyka R84 jako release blockers.

**Wyjscia**
- Raport gate `PASS/FAIL` z rozbiciem na unit/integration/e2e/differential.
  Opcjonalny wynik mutation można dołączyć tylko po wyraźnym żądaniu użytkownika.
- Benchmark baseline + porownanie P50/P95/P99 z decyzja release.
- Aktualizacja rejestru ryzyk (status mitigacji per release).

## Krok 7. Odblokowanie HOLD i rozszerzenie scope (warunkowe)

**Wejscia**
- `backend/docs/aurora-reverse/reverse-final-gaps-sanity-check-r83.md`
- `backend/docs/aurora-reverse/reverse-go-no-go-r85.md`
- `backend/docs/aurora-reverse/reverse-backend-decision-closure-r81.md`
- Artefakty MRM z kroku 2 + wyniki gate z kroku 6

**Dzialania**
- Sprawdzic warunki przejscia HOLD: domkniete P0 (`MH-01..MH-08` dla zakresu strict), potwierdzona alias policy, zielone round-trip/bounds tests.
- Jesli warunki spelnione: planowac strict `processing/area` i strict parser lanes jako kolejny increment.
- Jesli warunki niespelnione: utrzymac HOLD i kontynuowac tylko hardening obszaru v1.

**Wyjscia**
- Decyzja `UNLOCK HOLD` albo `KEEP HOLD` z uzasadnieniem dowodowym.
- Przy `UNLOCK`: backlog strict area/parser z mapowaniem `decyzja -> dowod -> test`.
- Przy `KEEP HOLD`: lista brakow i plan domkniecia kolejnej paczki reverse.

## Kryterium koncowe sekwencji R85

Sekwencja jest wykonana poprawnie, gdy:
1. Scope v1 jest wdrozony i przechodzi stale gate testowo-ryzykowe.
2. Wszystkie decyzje maja ciag `decyzja -> dowod reverse -> test`.
3. HOLD nie jest zdejmowany bez spelnienia warunkow P0 i zielonych testow kontraktowych.
