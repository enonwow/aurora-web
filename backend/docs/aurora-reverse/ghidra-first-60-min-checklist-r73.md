# Ghidra First 60 Minutes Checklist (R73)

Data: 2026-05-24  
Zakres: checklista pierwszej godziny pracy w Ghidrze dla use-case Aurora reverse.  
Rola: Agent B10 (First 60 Minutes Checklist).  
Statusy: `PASS` / `FAIL` / `BLOCKED` / `N/A`.

## 1. Cel pierwszych 60 minut

- Potwierdzic, ze binarka i projekt Ghidry sa gotowe do analizy bez szumu krytycznego.
- Zlokalizowac i oznaczyc P0 obszary pod Aurora reverse (loader zasobow, transitions, settings, parse 2DA/TLK/Hak).
- Wyjsc z godziny z minimalnym, ale uzytecznym pakietem artefaktow: nazwy funkcji, komentarze, bookmarks, shortlist do eksportu.

## 2. Wejscie i preflight (przed startem timera)

| # | Wejscie | Kryterium PASS |
|---|---|---|
| 1 | Binarka docelowa | Znana sciezka, hash (co najmniej SHA-256), rozmiar i wersja builda zanotowane. |
| 2 | Projekt Ghidry | Projekt istnieje i ma oddzielny folder dla tej binarki (bez mieszania z innymi buildami). |
| 3 | Baseline dokumentacyjny | Dostepne co najmniej: `ghidra-p0-function-hunt-r72.md`, `ghidra-export-naming-standard-r71.md`, `ghidra-common-pitfalls-r72.md`. |
| 4 | Konwencja notatek | Ustalony prefix tagow, np. `AURORA_`, oraz sposob oznaczania hipotez (`HYP`) vs faktow (`FACT`). |

## 3. Plan minutowy (0-60)

| Okno czasu | Co robimy | Artefakt po oknie | Gate |
|---|---|---|---|
| 00-10 | Import binarki, ustawienie compiler spec/language, uruchomienie Auto Analyze z profilem bazowym (bez agresywnych eksperymentow). | Projekt sie otwiera, analiza konczy sie bez crasha; log analyzera zapisany. | `PASS` gdy brak bledow krytycznych analyzera. |
| 10-20 | Szybki noise-reduction: odfiltrowanie bibliotek/szablonowego kodu, ustawienie listingu i bookmarkow roboczych. | Lista wyciszonych obszarow + min. 5 bookmarkow orientacyjnych. | `PASS` gdy nawigacja do punktow P0 zajmuje <30s kazdy. |
| 20-30 | Recon stringow i xref: wyszukiwanie tokenow zwiazanych z Aurora (module, hak, tlk, 2da, area, door, transition, cache, settings). | Shortlista min. 15 stringow i ich xrefow z priorytetami P0/P1. | `PASS` gdy co najmniej 5 xrefow trafia do potencjalnej logiki backendowej. |
| 30-40 | Wejscie w callgraph od 2-3 najmocniejszych xrefow; oznaczanie funkcji kandydatow. | Min. 8 funkcji z roboczym rename (`AURORA_*`) i krotkim komentarzem celu. | `PASS` gdy istnieje ciag przyczynowy string -> caller -> logika. |
| 40-50 | Szybka walidacja hipotez: parametry, struktury, punkty wejscia I/O; oddzielenie parserow od UI/noise. | Notatki `FACT/HYP`, min. 3 potwierdzone fakty i 3 hipotezy testowalne. | `PASS` gdy kazda hipoteza ma wskazana funkcje do dalszej dekompilacji. |
| 50-60 | Triage i handoff: ranking funkcji do eksportu/dekompilacji, lista ryzyk, nastepny krok dla kolejnej sesji. | Top-10 funkcji (P0/P1), 3 ryzyka, plan "next 90 min". | `PASS` gdy kolejny agent moze zaczac bez dodatkowego kontekstu ustnego. |

## 4. Checklista operacyjna (odznaczana w trakcie)

## 4.1 Minuta 0-10

- [ ] Zalozony/otwarty dedykowany projekt dla builda.
- [ ] Zaimportowana binarka i zweryfikowany format/architektura.
- [ ] Auto Analyze uruchomione z ustawieniami bazowymi.
- [ ] Brak krytycznych warningow typu invalid language map / broken loader.

## 4.2 Minuta 10-20

- [ ] Oznaczone segmenty/libraries o niskiej wartosci dla Aurora reverse.
- [ ] Ustawione bookmarki: `ENTRY`, `STRINGS`, `XREF_P0`, `CALLGRAPH`, `EXPORT_CANDIDATE`.
- [ ] Ujednolicone nazewnictwo robocze (`AURORA_*`, `UNK_*`, `LIB_*`).

## 4.3 Minuta 20-30

- [ ] Przejrzane stringi dla slow kluczowych: `module`, `hak`, `tlk`, `2da`, `door`, `transition`, `area`, `cache`, `setting`.
- [ ] Zanotowane xrefy do stringow z najwyzszym signalem.
- [ ] Nadany priorytet: `P0` (backend critical), `P1` (supporting), `P2` (nice-to-have).

## 4.4 Minuta 30-40

- [ ] Otwarty callgraph/funkcje od co najmniej 2 xrefow P0.
- [ ] Zmienione nazwy min. 8 funkcji kandydatow.
- [ ] Dodane komentarze: wejscie, wyjscie, efekt uboczny, zaleznosci.

## 4.5 Minuta 40-50

- [ ] Oddzielone funkcje parserowe od helperow UI/diagnostyki.
- [ ] Oznaczone potencjalne struktury danych (nawet jesli tymczasowo).
- [ ] Kazda hipoteza ma wskazany sposob falsyfikacji (jaki xref/funkcja to potwierdzi).

## 4.6 Minuta 50-60

- [ ] Lista Top-10 funkcji do eksportu/dekompilacji gotowa.
- [ ] Zidentyfikowane min. 3 ryzyka (np. obfuskacja, inlining, false positive xref).
- [ ] Spisane "next 90 min": co dekompilowac i w jakiej kolejnosci.

## 5. Minimalny pakiet wyjsciowy po 60 minutach

| Artefakt | Minimum |
|---|---|
| Funkcje oznaczone | >= 8 rename + komentarze |
| Bookmarks | >= 10 (w tym min. 5 dla P0) |
| String->xref shortlist | >= 15 wpisow |
| Fakty vs hipotezy | >= 3 `FACT`, >= 3 `HYP` |
| Top funkcji do eksportu | 10 pozycji z priorytetem P0/P1 |
| Ryzyka | >= 3 z impactem i proposed mitigation |

## 6. Kryteria FAIL/BLOCKED (wczesna eskalacja)

- `BLOCKED` gdy Auto Analyze nie konczy sie poprawnie albo loader daje niespojne mapowanie.
- `BLOCKED` gdy brak sygnalu P0 po 30 min (brak sensownych xrefow od stringow domenowych).
- `FAIL` gdy po 60 min nie ma shortlisty funkcji i nie da sie wskazac kolejnego kroku dekompilacji.
- W `BLOCKED/FAIL` nalezy zapisac przyczyne i decyzje: zmiana profilu analyzera, inny build, dodatkowe symbole, lub pivot na inny punkt wejscia.

## 7. Szablon podsumowania sesji (wypelnic na koniec)

- `binary_id`: `________________`
- `analyst`: `________________`
- `started_at_utc`: `________________`
- `ended_at_utc`: `________________`
- `overall_status`: `PASS / FAIL / BLOCKED`

| Obszar | Wynik | Notatka |
|---|---|---|
| Import + Analyze | `PASS/FAIL/BLOCKED` |  |
| String/Xref Recon | `PASS/FAIL/BLOCKED` |  |
| Function Triage | `PASS/FAIL/BLOCKED` |  |
| Handoff Readiness | `PASS/FAIL/BLOCKED` |  |

## 8. Definicja gotowosci po 60 minutach (DoD)

- Kolejna osoba w zespole moze kontynuowac reverse bez synchronizacji ustnej.
- Istnieje konkretna lista funkcji do dekompilacji i eksportu zgodna z priorytetem Aurora backend.
- Ryzyka i niepewnosci sa jawne, oznaczone i przypiete do konkretnych funkcji/xrefow.
