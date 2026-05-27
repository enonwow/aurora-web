# Bulk Ghidra Export Plan (r71) dla `nwtoolset.exe`

## 1. Cel i zasady
- Celem jest hurtowy, powtarzalny eksport artefaktów reverse-engineering z Ghidry tak, aby:
- najpierw uzyskać dane o najwyższej wartości analitycznej,
- zachować stabilne identyfikatory między kolejnymi przebiegami,
- zminimalizować ilość szumu (thunks, auto-generated wrappers, śmieciowe stringi, duble).
- Zakładamy, że analiza binarki w Ghidrze ma już wykonane:
- Auto Analysis,
- podstawowe typowanie funkcji kluczowych,
- nadane namespace tam, gdzie to możliwe.

## 2. Priorytet eksportu (kolejność)
1. **Manifest binarki i metadane PE**
- Dlaczego pierwsze: stabilny punkt odniesienia dla wszystkich kolejnych dumpów.
- Co: image base, sections, timestamp, compiler hints, checksum/hash, entry point, imported DLL/functions.

2. **Import/Export table + external symbols**
- Dlaczego: szybkie mapowanie zależności runtime i granic odpowiedzialności.
- Co: importy per DLL, eksporty (jeśli istnieją), ordinale, forwardery.

3. **Function inventory (globalny spis funkcji)**
- Dlaczego: indeks do chunkingu i śledzenia postępu.
- Co: address, length, calling convention, namespace/class guess, demangled name, flags (thunk, external, no-return).

4. **Call graph (minimum: caller/callee edges)**
- Dlaczego: umożliwia priorytetyzację dekompilacji na podstawie centralności i reachability od entry/UI handlers.
- Co: edge list + stopień wejścia/wyjścia.

5. **Data symbols i typed globals**
- Dlaczego: stan globalny i konfiguracje często dają szybkie odczytanie logiki narzędzia.
- Co: global vars, vtables, function pointer tables, RTTI-like blobs (jeśli wykryte).

6. **String corpus (filtrowany)**
- Dlaczego: szybkie heurystyki funkcjonalne (UI, błędy, ścieżki, formaty plików).
- Co: string, encoding, address, xref count, nearest function.

7. **Decompiled functions (chunkowane)**
- Dlaczego: najcięższy eksport; robimy po przygotowaniu indeksów i filtrów.
- Co: pseudocode + signature + lokalne zmienne + xref summary.

8. **Raw disassembly fallback (tylko dla nieudanej dekompilacji)**
- Dlaczego: zachowanie coverage tam, gdzie dekompilator nie daje sensownego wyniku.
- Co: listing asm + bytes + CFG note.

## 3. Format eksportu (co i w jakiej postaci)
- **`jsonl`** jako format bazowy dla danych tabelarycznych/rekordowych:
- łatwy merge, streamowanie, walidacja schematu, przetwarzanie skryptami.
- 1 obiekt na linię dla: function inventory, imports, strings, call-edges.

- **`md`** dla raportów czytelnych dla człowieka:
- podsumowania per chunk, metryki jakości, anomaly report.

- **`c`/`txt` (decompiler output)** dla treści funkcji:
- jedna funkcja = jeden plik (preferowane) lub paczki per chunk.
- zawsze z nagłówkiem metadanych (address, symbol, confidence flags).

- **`csv`** opcjonalnie jako wtórny eksport dla szybkiej inspekcji:
- tylko jeśli potrzebny dla arkuszy/BI; źródłem prawdy pozostaje `jsonl`.

## 4. Naming convention
- Wspólny prefiks przebiegu:
- `nwtoolset_r71_<artifact>_<scope>_<chunk>.ext`

- Konwencje identyfikatorów:
- Address canonical: `0x%08X` (uppercase, stała szerokość).
- Function key: `<addr>__<sanitized_symbol>`
- Sanitizacja symboli:
- dozwolone: `[a-z0-9_]+` po transliteracji do lowercase,
- separatory (`::`, `.`, spacje, `-`) -> `_`,
- maks 80 znaków nazwy symbolicznej; reszta obcięta + suffix hash8.

- Przykłady:
- `nwtoolset_r71_functions_all_0001.jsonl`
- `nwtoolset_r71_decomp_ui_0003_0x0045A120__mainwnd_oncommand.c`
- `nwtoolset_r71_strings_all_0002.jsonl`
- `nwtoolset_r71_report_quality_0001.md`

## 5. Chunking strategy
- Chunking musi być **deterministyczny**: ten sam input -> te same granice chunków.
- Domyślny podział dla dekompilacji funkcji:
- sortowanie po adresie rosnąco,
- `N=300` funkcji/chunk (start),
- limit miękki: ~20 MB/chunk (po przekroczeniu zamknij chunk wcześniej).

- Dodatkowe profile chunków:
- `hot-path`: funkcje osiągalne z entry/UI callbacków, chunk `N=150` (gęstsza kontrola jakości).
- `long-func`: funkcje > 2,000 linii pseudokodu osobno (1 funkcja/chunk).
- `failed-decomp`: osobny strumień retry/fallback asm.

- Schemat numeracji:
- 4 cyfry, od `0001`.
- Nigdy nie renumerować istniejących chunków w tym samym runie; tylko dopisywać.

## 6. Jak unikać śmieciowych danych (filtry)
1. **Filtr symboli niskiej wartości**
- Odrzucać/flagować:
- `FUN_XXXXXXXX` bez xref i bez ciała,
- auto-thunki (`thunk_*`, `jmp [import]`) bez lokalnej logiki,
- duplikaty aliasów wskazujące ten sam address.

2. **Filtr stringów**
- Odrzucać:
- długość < 4 (poza whitelistą: `"%d"`, `"%s"`, `UI`, `OK`),
- wysoki udział nieprintable (>20%),
- entropy skrajnie niska (np. `AAAAAA`) lub skrajnie wysoka (losowe bloby),
- brak xref (chyba że string jest w sekcji zasobów świadomie eksportowanej).

3. **Filtr dekompilacji**
- Oznaczać jako low-confidence, gdy:
- >30% linii to `/* WARNING */` / `undefinedX`,
- dekompilacja pusta lub wyłącznie `return;`,
- konflikt sygnatury między przebiegami.
- Dla low-confidence: automatycznie do kolejki `failed-decomp`.

4. **Dedup i canonicalizacja**
- Dedup po `(address, normalized_symbol, hash(pseudocode_normalized))`.
- Normalizacja pseudokodu przed hashowaniem:
- usunięcie whitespace-only różnic,
- normalizacja numeracji tymczasowych zmiennych (jeśli możliwe),
- stabilizacja końców linii do LF.

5. **Whitelisty/blacklisty sekcji**
- Preferować `.text`, wybrane `.rdata`, struktury `.data`.
- Ostrożnie z dużymi blobami `.rsrc` i paddingiem; eksportować tylko powiązane przez xref.

## 7. Pipeline wykonania (operacyjny)
1. **Preflight**
- Snapshot metadanych projektu Ghidry i hash `nwtoolset.exe`.
- Walidacja, że Auto Analysis zakończone bez krytycznych błędów.

2. **Pass A (lekki)**
- exports/imports/functions/call-edges/strings (bez ciężkiej dekompilacji).
- Generacja indeksów i metryk szumu.

3. **Pass B (decomp hot-path)**
- Chunki `hot-path`, szybka ręczna kontrola 5-10% próbek.

4. **Pass C (decomp full)**
- Pozostałe funkcje wg adresu.

5. **Pass D (retry/fallback)**
- Re-run nieudanych funkcji po korekcie typów/sygnatur.
- Jeśli dalej fail: eksport asm fallback.

6. **Pass E (QA i freeze)**
- Raport pokrycia, quality flags, lista braków.
- Oznaczenie runu jako zamknięty (`r71-final`).

## 8. Minimalne metryki jakości runu
- `function_coverage = exported_functions / total_candidate_functions`
- `decomp_success_rate = decompiled_ok / decomp_attempted`
- `high_confidence_rate = high_confidence / decompiled_ok`
- `string_signal_ratio = kept_strings / extracted_strings`
- `dedup_savings = 1 - (unique_records / raw_records)`

- Progi startowe (do kalibracji):
- `function_coverage >= 0.95`
- `decomp_success_rate >= 0.85`
- `high_confidence_rate >= 0.70`

## 9. Reproducibility i versioning
- Każdy plik eksportu zawiera nagłówek metadanych:
- `run_id`, data/czas UTC, hash binarki (SHA-256), wersja skryptu eksportu, wersja Ghidry.
- Nie nadpisywać wyników historycznych bez archiwizacji.
- Dla kolejnych przebiegów (`r72+`) zachować ten sam schemat nazw i formatów, aby diff był mechaniczny.

## 10. Zakres „najpierw eksportować” (TL;DR)
1. metadane PE + import/export,
2. inventory funkcji + call graph,
3. global data symbols,
4. filtrowane stringi,
5. dekompilacja: hot-path -> full -> retry/fallback,
6. raport jakości i zamknięcie runu.
