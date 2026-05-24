# Ghidra Export QA Rules (R73)

## 1. Cel i zakres
Ten dokument definiuje reguly QA dla eksportow z Ghidra tak, aby zapewnic:
- kompletnosc danych,
- spojna i przewidywalna nomenklature,
- powtarzalnosc wynikow miedzy uruchomieniami,
- brak uszkodzonych lub nieczytelnych artefaktow.

Zakres obejmuje wszystkie artefakty eksportowe produkowane w pipeline Aurora Reverse (np. listingi, dekompilacje, symbole, raporty, metadane, pakiety archiwalne).

## 2. Definicje
- Artefakt: pojedynczy plik wyjsciowy z eksportu Ghidra.
- Bundle eksportowy: komplet artefaktow z jednego przebiegu eksportu.
- Manifest: plik opisujacy bundle (lista plikow, sumy kontrolne, metadane wykonania).
- Run ID: unikalny identyfikator przebiegu eksportu.

## 3. Bramka QA (pass/fail)
Eksport przechodzi QA tylko jesli wszystkie sekcje 4-7 maja status PASS.
Kazdy FAIL blokuje publikacje artefaktow i wymaga ponownego eksportu lub naprawy.

## 4. Kontrola kompletnosci

### 4.1 Wymagane pliki i struktura
Dla kazdego Run ID musza istniec:
- katalog glowny bundle,
- manifest (np. `manifest.json` lub `manifest.yaml`),
- log eksportu,
- komplet plikow wynikowych wymaganych przez spec pipeline.

Regula PASS:
- 100% wymaganych pozycji obecne,
- brak brakujacych plikow wskazanych w manifeście.

### 4.2 Zgodnosc liczebnosci
- Liczba artefaktow na dysku == liczbie artefaktow zadeklarowanej w manifeście.
- Dla plikow wieloczesciowych (shards/chunks): liczba czesci i ich indeksy musza byc kompletne, bez luk.

Regula PASS:
- zero roznic ilosciowych,
- zero luk indeksow (np. brak `part-003` przy istnieniu `part-002` i `part-004`).

### 4.3 Minimalna jakosc zawartosci
- Pliki tekstowe: niepuste, wiecej niz naglowek.
- Pliki JSON/YAML/CSV: syntaktycznie poprawne.
- Archiwa: daja sie otworzyc i odczytac.

Regula PASS:
- brak pustych artefaktow (0 B),
- brak bledow parsera,
- brak bledow odczytu archiwum.

## 5. Spojnosc nazw

### 5.1 Konwencja nazewnicza
Kazdy artefakt musi spelniac uzgodniony wzorzec, np.:
`{project}-{binary}-{arch}-{run_id}-{artifact_type}.{ext}`

Wymagania:
- stale separatory (`-` i `_` zgodnie ze spec),
- brak niedozwolonych znakow (`<>:"/\\|?*`),
- brak spacji na poczatku/koncu nazwy,
- rozszerzenie zgodne z typem artefaktu.

### 5.2 Spojnosc miedzy plikiem i metadanymi
- Nazwa pliku, wpis w manifeście i metadane wewnetrzne (jesli sa) musza wskazywac ten sam `run_id`, `binary`, `arch` i `artifact_type`.

Regula PASS:
- 0 niespojnosci nazewnictwa,
- 0 konfliktow `run_id`.

## 6. Powtarzalnosc eksportu

### 6.1 Powtorzony eksport kontrolny
Dla tego samego wejscia (ta sama probka, konfiguracja, wersja Ghidra, skrypty):
- wykonac co najmniej 2 przebiegi kontrolne,
- porownac artefakty i metadane.

### 6.2 Kryteria porownania
- Pliki deterministyczne: identyczne hash (SHA-256).
- Pola niedeterministyczne (np. timestamp): musza byc jawnie oznaczone i wykluczone z porownania tresci.
- Liczba i typy artefaktow: identyczne.

Regula PASS:
- 100% plikow deterministycznych ma zgodne hash,
- roznice tylko w dozwolonych polach niedeterministycznych.

### 6.3 Tolerancja roznic
Kazda roznica poza lista dozwolona = FAIL.
Lista dozwolona musi byc wersjonowana i jawna.

## 7. Brak uszkodzonych artefaktow

### 7.1 Integrity check
- Dla kazdego artefaktu wyliczyc SHA-256.
- Porownac z sumami w manifeście.

Regula PASS:
- brak mismatch hash,
- brak brakujacych sum kontrolnych.

### 7.2 Walidacja odczytu
- Kazdy plik da sie otworzyc narzedziem docelowym.
- Teksty: poprawne kodowanie (preferowane UTF-8).
- JSON/YAML: parse bez bledow.
- Archiwa: test integralnosci (brak CRC/stream errors).

Regula PASS:
- 0 artefaktow z bledem odczytu,
- 0 artefaktow z bledem integralnosci.

### 7.3 Sentinel corruption tests
- Losowo wybrac probke artefaktow (np. min. 10% lub 20 plikow, co wieksze) i wykonac pelny read-through.

Regula PASS:
- brak ukrytych uszkodzen wykrytych probkowaniem.

## 8. Dowody QA (audit trail)
Po kazdym QA run zapisac:
- `qa-report-r73.json` (statusy sekcji, liczby PASS/FAIL, lista niezgodnosci),
- `qa-hashes-r73.csv` (plik, hash, wynik porownania),
- `qa-repeatability-r73.md` (porownanie run-to-run),
- timestamp, wersje narzedzi (Ghidra, JDK, skrypty), identyfikator operatora/CI job.

Wymaganie:
- raporty musza byc reprodukowalne i przypisane do konkretnego Run ID.

## 9. Checklista operacyjna (skrcona)
1. Zweryfikuj komplet wymaganych plikow i manifest.
2. Sprawdz zgodnosc liczebnosci (disk vs manifest).
3. Waliduj formaty i niepustosc artefaktow.
4. Sprawdz konwencje nazw i zgodnosc metadanych.
5. Porownaj hash oraz wykonaj test powtarzalnosci (min. 2 runy).
6. Uruchom integrity/readability checks.
7. Zapisz raporty dowodowe i oznacz finalny status PASS/FAIL.

## 10. Krytyczne niezgodnosci (auto-FAIL)
- Brak manifestu lub logu eksportu.
- Jakikolwiek mismatch hash bez uzasadnienia w liscie dozwolonej.
- Uszkodzone archiwum lub nieparsowalny artefakt strukturalny.
- Niespojne `run_id` miedzy artefaktami.
- Roznice run-to-run wykraczajace poza pola niedeterministyczne.

## 11. Wymagania utrzymaniowe
- Reguly i lista dozwolonych roznic musza byc wersjonowane.
- Kazda zmiana reguly wymaga aktualizacji wersji (np. R74) i changelogu.
- QA runner powinien konczyc sie kodem != 0 przy FAIL.
