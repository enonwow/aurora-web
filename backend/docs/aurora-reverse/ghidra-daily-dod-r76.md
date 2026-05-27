# Definition of Done (Daily Reverse DoD)

## Cel
Uznajemy dzienną sesję reverse engineering za produktywną tylko wtedy, gdy na koniec dnia istnieje **zweryfikowany, używalny przyrost wiedzy**, który może być od razu wykorzystany przez backend/docs/implementację.

## Minimalny zakres "Done" (wszystkie punkty obowiązkowe)

1. Zrealizowano i zamknięto **jeden konkretny cel dnia** (np. analiza jednego flow, modułu albo grupy funkcji) wraz z jednozdaniowym wynikiem.
2. Udokumentowano **co najmniej 5 istotnych ustaleń technicznych** (fakty, nie hipotezy), każde z krótkim uzasadnieniem/skąd wynika.
3. Dla każdej nowej hipotezy dodano status: `potwierdzona` / `do weryfikacji` / `obalona`.
4. Powstał **Evidence Pack** z referencjami (adresy funkcji, nazwy symboli/stringów, zrzuty/dekompilat), umożliwiający odtworzenie wniosków bez pamięci autora.
5. Zaktualizowano artefakt roboczy sesji (log/notatkę) o:
   - zakres wykonanej analizy,
   - decyzje i odrzucone tropy,
   - ryzyka i luki.
6. Wskazano **co najmniej 1 decyzję implementacyjną** lub wpływ na backend (kontrakt, walidacja, edge case, bezpieczeństwo, wydajność).
7. Utworzono **Backlog Next**: minimum 3 następne kroki na kolejny dzień, z priorytetem (`P1/P2/P3`) i kryterium startu.
8. Wykonano szybki self-QA: spójność nazw, brak sprzeczności, źródło dla każdego kluczowego wniosku.

## Kryteria jakości (Definition of Good)

- Wnioski są testowalne i możliwe do mapowania na kod lub dokumentację.
- Notatka odróżnia fakty od założeń.
- Inny członek zespołu może przejąć temat bez dodatkowego handoveru synchronicznego.

## Kiedy dzień **nie** jest "Done"

- Praca zakończyła się tylko eksploracją bez trwałych artefaktów.
- Brak ścieżki dowodowej (brak referencji do funkcji/stringów/adresów).
- Brak decyzji lub implikacji dla backendu.
- Brak jasno zdefiniowanego planu na następny dzień.

## Checklist zamknięcia dnia

- [ ] Cel dnia zamknięty i opisany w 1 zdaniu.
- [ ] >=5 ustaleń technicznych zapisanych.
- [ ] Hipotezy mają statusy.
- [ ] Evidence Pack kompletny.
- [ ] Wpływ na backend/kontrakt opisany.
- [ ] Backlog Next (>=3 kroki z priorytetem).
- [ ] Self-QA wykonany.
