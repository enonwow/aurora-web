# Reverse Convergence Checklist R84 (Agent R20)

Data: 2026-05-24  
Cel: jednoznaczna brama konwergencji wiedzy reverse - kiedy zakres uznajemy za "wystarczajacy do implementacji", jakie kryteria musza byc spelnione i jakie artefakty sa obowiazkowe.

## 1) Definicja "wystarczajace do implementacji"

Zakres jest "wystarczajacy do implementacji" tylko wtedy, gdy:
1. Ma potwierdzony kontrakt zachowania (co system robi), a nie tylko hipoteze nazewnicza.
2. Ma domkniete ryzyko krytyczne dla danego scope (brak nierozstrzygnietego P0, ktory moze zmienic publiczny kontrakt).
3. Daje sie przelozyc na testowalne wymagania (unit/integration/e2e) bez zgadywania semantyki.
4. Decyzja "GO teraz" jest spojna z aktualnymi decyzjami reverse (R79-R83) i nie narusza obszaru HOLD.

## 2) Brama GO/NO-GO (checklista konwergencji)

Kazdy punkt musi byc "TAK", aby uznac konwergencje za wystarczajaca do implementacji.

### A. Granica zakresu
- [ ] Zakres zmiany jest jawnie sklasyfikowany jako "implementowac teraz" (nie HOLD).
- [ ] Granice scope sa zapisane: co wchodzi teraz, co jest odroczone i dlaczego.
- [ ] Publiczny kontrakt API nie zalezy od nierozstrzygnietych unknowns P0.

### B. Jakosc dowodu reverse
- [ ] Dla kluczowych zachowan istnieje min. 1 dowod pierwotny (adres/funkcja/branch evidence), nie tylko inferencja.
- [ ] Dla kazdej decyzji implementacyjnej jest mapowanie "decyzja -> dowod -> konsekwencja w kodzie".
- [ ] Brak konfliktu miedzy raportami reverse; konflikty sa jawnie rozstrzygniete.
- [ ] Poziom pewnosci jest wystarczajacy dla danego ryzyka (wysoki dla kontraktu publicznego i walidacji granicznej).

### C. Ryzyko i unknowns
- [ ] Wszystkie unknowns P0 dla danego zakresu sa zamkniete albo zakres jest od nich odciety technicznie (feature flag / brak ekspozycji API).
- [ ] Istnieje aktualny rejestr ryzyk implementacyjnych z triggerami i planem reakcji.
- [ ] Dla obszarow niepewnych jest jawna strategia fail-safe/fail-fast.

### D. Testowalnosc i weryfikacja
- [ ] Powstala matryca "reverse claim -> test" dla calego scope.
- [ ] Sa zdefiniowane testy graniczne dla walidacji i parsingu (duplikaty, bounds, overflow, precedence).
- [ ] Istnieje minimalny zestaw testow bramkujacych merge (co najmniej unit + integration dla scope).
- [ ] Kryteria DONE sa mierzalne i mozliwe do automatycznej walidacji.

### E. Gotowosc implementacyjna
- [ ] Istnieje starter plan pierwszych krokow implementacji (kolejnosc i zaleznosci).
- [ ] Wskazano artefakty referencyjne, na ktorych opiera sie implementacja i code review.
- [ ] Zespol ma wspolne rozumienie "czego nie implementujemy teraz" (HOLD list).

## 3) Kryteria akceptacji konwergencji (minimum formalne)

Konwergencja jest zaakceptowana, gdy spelnione sa wszystkie warunki:
1. **Spojnosc decyzji:** brak sprzecznosci miedzy readiness, closure, sanity-check i starter pack.
2. **Pokrycie dowodowe:** wszystkie decyzje "GO teraz" maja wskazane dowody reverse.
3. **Brak blokera P0 w scope:** nie ma aktywnego P0, ktory moze zmienic zachowanie wdrazanego API/serwisu.
4. **Pokrycie testami:** kazde wymaganie wynikajace z reverse ma przypisany test albo uzasadnione odroczenie.
5. **Jawny HOLD:** wszystko poza konwergencja "GO" jest wpisane do HOLD z warunkiem odblokowania.

## 4) Obowiazkowe artefakty (must-have)

Ponizszy zestaw jest wymagany, aby zamknac konwergencje reverse dla implementacji backendu:

1. `reverse-backend-readiness-r79.md` - granica "wdrazamy teraz" vs "wymaga dalszych dowodow".
2. `reverse-validation-matrix-r79.md` - mapa potwierdzen i poziomow pewnosci per obszar.
3. `reverse-backend-decision-closure-r81.md` - finalne decyzje implementacyjne i HOLD.
4. `reverse-final-evidence-pack-r81.md` - skondensowany pakiet dowodow do decyzji.
5. `reverse-open-questions-burndown-r82.md` - status domykania pytan otwartych.
6. `reverse-coverage-audit-r82.md` - audyt pokrycia i ewentualnych luk.
7. `reverse-implementation-starter-pack-r82.md` - kolejnosc pierwszych krokow wdrozenia.
8. `reverse-final-gaps-sanity-check-r83.md` - finalny werdykt GO/NO-GO dla startu.
9. `reverse-implementation-risk-register-r84.md` - aktywne ryzyka implementacyjne i mitigacje.
10. `reverse-master-index-r83.md` - indeks zrodel, aby review mogl sledzic lancuch dowodowy.

Bez kompletu artefaktow 1-10 status konwergencji pozostaje **NO-GO**.

## 5) Artefakty pomocnicze (zalecane)

- `reverse-to-test-matrix-r83.md` - bezposrednie mapowanie reverse na scenariusze testowe.
- `reverse-onboarding-pack-r84.md` - szybkie wdrozenie nowej osoby bez utraty kontekstu.
- `reverse-next-targeted-decomp-plan-r78.md` - plan domkniecia obszarow HOLD/P0.

## 6) Warunki automatycznego NO-GO

Jesli zajdzie dowolny przypadek ponizej, konwergencja automatycznie spada do NO-GO:
1. Pojawia sie nowy unknown P0 dotykajacy publicznego kontraktu scope.
2. Brakuje mapowania "decyzja -> dowod -> test" dla dowolnego elementu krytycznego.
3. Wystepuje konflikt miedzy artefaktami decyzyjnymi bez formalnego rozstrzygniecia.
4. Implementacja wymaga zgadywania semantyki parsera lub walidacji dla obszaru bez dowodu.

## 7) Protokol decyzji R20 (do odhaczenia przed startem kodu)

1. [ ] Zweryfikowano komplet artefaktow must-have (1-10).
2. [ ] Potwierdzono brak blokera P0 w zakresie "implementowac teraz".
3. [ ] Potwierdzono testowalnosc wszystkich decyzji implementacyjnych.
4. [ ] Zatwierdzono jawna liste HOLD + warunki odblokowania.
5. [ ] Nadano werdykt koncowy: **GO** albo **NO-GO** (z uzasadnieniem 3-5 zdan).

Po przejsciu punktow 1-5 zakres mozna uznac za "wystarczajacy do implementacji".
