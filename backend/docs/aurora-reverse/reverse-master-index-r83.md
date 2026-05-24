# Reverse Master Index R83 (Agent R17)

Data: 2026-05-24
Zakres: master index raportow `reverse-*` z rund `r78-r83`.
Uwaga: w katalogu jest 14 raportow `reverse-*` dla `r78-r82`; nie znaleziono osobnego pliku `reverse-*-r83.md`.

## Jak czytac
- "Co wnosi": najkrotszy opis wartosci raportu.
- "Najwazniejsze decyzje": sekcje, gdzie zapadaja decyzje implementacyjne/priorytety.
- "Najwazniejsze dowody": sekcje, gdzie sa twarde adresy, xrefy, kontrakty lub macierze walidacyjne.

## Indeks raportow reverse r78-r83

### R78

1. `reverse-findings-resource-pipeline-r78.md`
- Co wnosi: rekonstrukcje end-to-end pipeline zasobow (alias/bootstrap -> Module.IFO -> TLK/HAK -> 2DA -> write-back).
- Najwazniejsze decyzje: "Syntetyczny przeplyw koncowy" i granice pewnosci (`:114`, `:122`).
- Najwazniejsze dowody: sekcje krokow 1-6 z adresami i confidence (`:11`, `:13`, `:29`, `:44`, `:73`, `:84`) oraz tabela "Kluczowe funkcje" (`:99`).

2. `reverse-findings-area-object-contracts-r78.md`
- Co wnosi: mapowanie kandydatow parserow ARE/GIT/UTC/UTP i wskazanie luk blokujacych strict contracts.
- Najwazniejsze decyzje: priorytety P0/P1 i minimalny pakiet dalszej dekompilacji (`:98`, `:100`, `:115`, `:129`) + konkluzja (`:136`).
- Najwazniejsze dowody: lista kandydatow string->xref (`:9`) i mapa "string -> funkcja -> rola" (`:80`).

3. `reverse-next-targeted-decomp-plan-r78.md`
- Co wnosi: operacyjny plan kolejnej rundy dekompilacji (TOP-25 funkcji, workflow, DoD).
- Najwazniejsze decyzje: lista TOP-25 i priorytety P0/P1/P2 (`:12`) oraz rytm sprintow (`:51`).
- Najwazniejsze dowody: kryteria weryfikacji per funkcja (`:42`) i "Definition of Done" (`:57`).

### R79

4. `reverse-backend-readiness-r79.md`
- Co wnosi: decyzje "wdrazamy teraz" vs "hold do dalszych dowodow" przelozone na endpointy i serwisy.
- Najwazniejsze decyzje: sekcja gotowosci teraz (`:7`), sekcja hold (`:18`), finalna decyzja R6 (`:29`).
- Najwazniejsze dowody: kolumny "Dowod reverse" w tabelach sekcji 1 i 2 (`:7`, `:18`).

5. `reverse-findings-binary-format-clues-r79.md`
- Co wnosi: shortlist parser/deserializer i kontrakty serializacji z ocenami pewnosci.
- Najwazniejsze decyzje: shortlist operacyjny Priorytet A/B/C (`:70`) oraz konkluzja (`:100`).
- Najwazniejsze dowody: tabela kandydatow (`:26`) i kontrakty serializacji Module.IFO/UT*/ARE-GIT (`:53`, `:55`, `:60`, `:65`).

6. `reverse-validation-matrix-r79.md`
- Co wnosi: najbardziej przekrojowa macierz "potwierdzone/hipotezy/braki" pod implementacje backendu.
- Najwazniejsze decyzje: checklist implementacyjny backendu (`:57`) i granice czego nie usztywniac.
- Najwazniejsze dowody: sekcja POTWIERDZONE (`:16`), HIPOTEZY (`:34`), BRAKI (`:44`).

### R80

7. `reverse-unknowns-resolution-queue-r80.md`
- Co wnosi: kolejke open unknowns (MH/NH) z konkretnym planem domykania w Ghidrze i kryteriami CLOSED.
- Najwazniejsze decyzje: priorytety Must-have vs Nice-to-have (`:7`, `:94`) i kolejnosc realizacji (`:144`).
- Najwazniejsze dowody: dla kazdego punktu "Domkniecie w Ghidrze" + "Kryterium CLOSED" (`:9` do `:136`) oraz wymagany pakiet artefaktow (`:160`).

8. `reverse-high-value-function-dossiers-r80.md`
- Co wnosi: 12 dossier funkcji o najwyzszej wartosci (rola, evidence, ryzyko, wplyw na backend).
- Najwazniejsze decyzje: "Uwagi koncowe" o najmocniejszej parze kontraktowej i glownej luce (`:138`).
- Najwazniejsze dowody: sekcje Dossier 01-12 z punktami "Evidence" (`:6` do `:127`).

### R81

9. `reverse-backend-decision-closure-r81.md`
- Co wnosi: finalne domkniecie decyzji backendowych: co implementowac teraz i co trzymac na HOLD.
- Najwazniejsze decyzje: "implementowac teraz" (`:17`), "odlozyc (HOLD)" (`:39`), finalny werdykt (`:91`), brama wyjscia z HOLD (`:97`).
- Najwazniejsze dowody: "Podstawa decyzji" (`:6`) i uzasadnienia przy kazdej decyzji (`:19`, `:28`, `:41`, `:50`, `:57`, `:64`).

10. `reverse-executive-summary-r81.md`
- Co wnosi: syntetyczne 90% vs 70% pewnosci i 5 ruchow najszybszego progresu.
- Najwazniejsze decyzje: "Co wiemy na 90%" (`:6`) + "5 ruchow" (`:33`).
- Najwazniejsze dowody: "Co wiemy na 70%" (`:17`) i "Ryzyka blednej interpretacji" (`:25`) jako granice decyzyjne.

11. `reverse-final-evidence-pack-r81.md`
- Co wnosi: finalny pakiet 20 cytowalnych dowodow adresowych do ADR/architektury.
- Najwazniejsze decyzje: "Szybki wniosek architektoniczny" (`:31`).
- Najwazniejsze dowody: tabela "Top 20 Evidence" (`:6`).

### R82

12. `reverse-open-questions-burndown-r82.md`
- Co wnosi: burn-down pytan open; rozdzial na zamykane decyzyjnie vs wymagajace nowej dekompilacji.
- Najwazniejsze decyzje: bilans i zamkniecia bez dekompilacji (`:14`, `:20`) oraz kolejnosc dalszego burn-down (`:44`).
- Najwazniejsze dowody: tabela pytan wymagajacych Ghidry (`:27`) i warunek zamkniecia P0 (`:51`).

13. `reverse-coverage-audit-r82.md`
- Co wnosi: audyt pokrycia wiedzy reverse wzgledem potrzeb backendu (COMPLETE/PARTIAL/GAP).
- Najwazniejsze decyzje: wynik zbiorczy statusow (`:11`) i finalna konkluzja (`:72`).
- Najwazniejsze dowody: sekcja "Dowody" per obszar (`:21`) wraz z odwolaniami do konkretnych dokumentow i linii (`:23`-`:64`).

14. `reverse-implementation-starter-pack-r82.md`
- Co wnosi: praktyczny starter implementacyjny (3 pierwsze kroki kodowe, ryzyka, test-gate, explicit hold).
- Najwazniejsze decyzje: kroki kodowe 1-3 (`:21`, `:23`, `:42`, `:61`), "Czego nie robic" (`:106`), exit criteria (`:112`).
- Najwazniejsze dowody: lista obowiazkowych inputow reverse (`:6`) i mapowanie ryzyk/testow do artefaktow (`:80`, `:91`).

## Podsumowanie przekrojowe
- Najwazniejsza os decyzyjna: `reverse-backend-decision-closure-r81.md` + `reverse-backend-readiness-r79.md`.
- Najwazniejsza os dowodowa: `reverse-final-evidence-pack-r81.md` + `reverse-validation-matrix-r79.md` + `reverse-findings-resource-pipeline-r78.md`.
- Najwazniejsza os domykania luk: `reverse-unknowns-resolution-queue-r80.md` + `reverse-open-questions-burndown-r82.md` + `reverse-coverage-audit-r82.md`.
