# Ghidra Post-Analyze Next Steps (R74)

Data: 2026-05-24  
Zakres: co robic po pierwszym Auto Analyze, dla poczatkujacego, pod Aurora reverse.  
Rola: Agent B11 (Post-Analyze Next Steps).

## Checklista (max 10 krokow)

1. Zapisz punkt startowy sesji
- Zanotuj: nazwe binarki, hash, timestamp i profil analyzera.
- Cel: kazdy kolejny krok ma byc odtwarzalny.

2. Zrob szybki sanity check wyniku Auto Analyze
- Sprawdz, czy nie ma krytycznych bledow loadera/mapowania.
- Jesli sa bledy krytyczne: oznacz sesje jako `BLOCKED` i nie idz dalej w szczegoly.

3. Ustaw porzadek roboczy w projekcie
- Dodaj bookmarki: `ENTRY`, `STRINGS`, `XREF_P0`, `CALLGRAPH`, `EXPORT`.
- Ustal prefixy nazw: `AURORA_`, `UNK_`, `LIB_`.

4. Zrob triage stringow pod nasz use-case
- Wyszukaj: `module`, `hak`, `tlk`, `2da`, `area`, `door`, `transition`, `cache`, `setting`.
- Wybierz shortliste stringow o najwyzszym sygnale (nie wszystko naraz).

5. Przejdz po xrefach i oznacz kandydatow P0
- Od kazdego mocnego stringa wejdz w xrefy i callerow.
- Oznacz funkcje powiazane z: loaderem zasobow, transitions, runtime settings, parserami 2DA/TLK/HAK.

6. Zmien roboczo nazwy najwazniejszych funkcji
- Nadaj sensowne rename min. kilku funkcjom P0 (np. `AURORA_Load*`, `AURORA_Parse*`).
- Dodaj 1-2 zdania komentarza: wejscie, wyjscie, efekt uboczny.

7. Oddziel fakty od hipotez
- Przy kazdej notatce dopisz `FACT` albo `HYP`.
- Dla `HYP` dopisz jak ja potwierdzisz (jaki xref/funkcja/test dekompilacji).

8. Uloz mala kolejke dekompilacji
- Zrob Top-10 funkcji do dalszej dekompilacji (priorytet `P0`/`P1`).
- Kolejnosc: najpierw funkcje spinajace przeplyw (orchestratory), potem helpery.

9. Przygotuj paczke do eksportu i mapowania backend
- Oznacz, co pojdzie do eksportu zgodnie z namingiem i QA (funkcje, xref/call-edges, stringi, decomp).
- Dla kazdego artefaktu dopisz, gdzie trafi po stronie backend (`resolver`, `settings`, `jobs`, `security`, `benchmark`).

10. Zamknij sesje handoffem
- Zapisz: status `PASS/FAIL/BLOCKED`, 3 najwieksze ryzyka, i plan "next 90 min".
- Kryterium done: kolejna osoba moze wejsc bez ustnego przekazania kontekstu.
