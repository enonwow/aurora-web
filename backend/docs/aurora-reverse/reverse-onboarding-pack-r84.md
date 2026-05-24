# Reverse Onboarding Pack R84 (Agent R19)

Data: 2026-05-24  
Rola: nowy deweloper backendu, start od reverse findings do pierwszego kodu.

## 1) Od których raportów zacząć (kolejność 60-90 min)

1. `reverse-executive-summary-r81.md`  
   Po co: szybki obraz 90% vs 70% pewności i priorytety.
2. `reverse-backend-decision-closure-r81.md`  
   Po co: twarda granica „implementować teraz” vs „HOLD”.
3. `reverse-implementation-starter-pack-r82.md`  
   Po co: gotowa sekwencja pierwszych 3 kroków kodowych.
4. `reverse-validation-matrix-r79.md`  
   Po co: co jest potwierdzone, a czego nie wolno usztywniać.
5. `reverse-final-gaps-sanity-check-r83.md`  
   Po co: finalny werdykt GO i lista luk krytycznych tylko dla strict area.

## 2) Czego nie pomijać (must-have checklist)

1. Zawsze sprawdź, czy zmiana wpada w zakres „implementować teraz” (R81), a nie HOLD.
2. Każdą decyzję w kodzie podeprzyj artefaktem reverse (plik + sekcja).
3. Nie wdrażaj strict `POST /api/v1/processing/area` bez domknięcia luk P0 (ARE/GIT chain, alias policy, bounds).
4. Utrzymaj deterministykę source resolvera i pełne provenance decyzji wyboru źródła.
5. Traktuj testy jako bramę wiedzy reverse, nie formalność (unit + integration + e2e dla startowego zakresu).

## 3) Jak szybko przejść od findings do pierwszego kodu (plan 1-2 dni)

1. Dzień 1 (rano): przeczytaj 5 raportów z sekcji 1 i wypisz 6-10 decyzji implementacyjnych „TAK teraz”.
2. Dzień 1 (południe): otwórz branch i zacznij Krok 1 ze starter packa: runtime settings + path security + fail-fast.
3. Dzień 1 (koniec): dodaj testy P0 dla Krok 1 i przejdź lokalny gate (`build`, `test:unit`).
4. Dzień 2 (rano): rozpocznij Krok 2: source resolver core (determinism, policy, diagnostics/provenance).
5. Dzień 2 (południe): domknij minimalne testy integracyjne resolvera i przygotuj PR #1 lub #2 zgodnie z sekwencją z planu wdrożenia.

## 4) Najkrótsza ścieżka do pierwszego PR

1. Scope PR: tylko Runtime Settings + Path Security (bez strict area/parser).
2. Done: API runtime działa bez zmiany URL, błędna konfiguracja blokuje bootstrap, audit event jest emitowany.
3. Evidence w opisie PR: odwołania do `reverse-backend-decision-closure-r81.md`, `reverse-validation-matrix-r79.md`, `reverse-implementation-starter-pack-r82.md`.

## 5) Reguła bezpieczeństwa na start

Jeśli nie masz twardego dowodu reverse dla zachowania parsera/aliasu: zostaw to za feature flag albo poza publicznym API i oznacz jako HOLD.
