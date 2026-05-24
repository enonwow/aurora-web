# Aurora R72: Ghidra Minimal Scripts Spec (E9)

Cel: 5 małych skryptów wspierających szybki eksport danych do analizy Aurora.
Zakres: tylko spec wejście/wyjście, bez implementacji.

## 1) `export_funcs_minimal`
Krótki opis: eksport podstawowej listy funkcji z programu.

Wejście:
- `program` (aktywny program w Ghidrze)
- `output_path` (ścieżka pliku wynikowego)
- `format` (`csv` albo `jsonl`)
- `include_thunks` (`true/false`)

Wyjście:
- Plik z rekordami funkcji.
- Minimalny rekord:
  - `entry_va` (adres startowy)
  - `name` (nazwa funkcji)
  - `size_bytes` (rozmiar)
  - `is_thunk` (flaga)
  - `namespace` (przestrzeń nazw)

## 2) `export_xrefs_for_functions`
Krótki opis: eksport xrefów dla funkcji (kto woła i kogo wołamy).

Wejście:
- `program`
- `functions_source` (opcjonalny plik z listą funkcji; brak = wszystkie)
- `output_path`
- `direction` (`incoming`, `outgoing`, `both`)
- `deduplicate` (`true/false`)

Wyjście:
- Plik relacji xref między funkcjami.
- Minimalny rekord:
  - `src_va` (adres źródłowy)
  - `dst_va` (adres docelowy)
  - `ref_type` (np. call, jump, data)
  - `src_func` (nazwa funkcji źródłowej)
  - `dst_func` (nazwa funkcji docelowej)

## 3) `export_strings_minimal`
Krótki opis: eksport stringów z kontekstem i podstawową klasyfikacją.

Wejście:
- `program`
- `output_path`
- `min_length` (domyślnie 4)
- `encodings` (np. `ascii`, `utf16le`)
- `only_referenced` (`true/false`)

Wyjście:
- Plik listy stringów.
- Minimalny rekord:
  - `str_va` (adres stringa)
  - `value` (treść)
  - `length`
  - `encoding`
  - `ref_count`
  - `first_ref_func` (pierwsza funkcja referująca, jeśli istnieje)

## 4) `export_segments_overview`
Krótki opis: eksport mapy segmentów/sekcji pamięci.

Wejście:
- `program`
- `output_path`
- `include_permissions` (`true/false`)
- `include_file_offsets` (`true/false`)

Wyjście:
- Plik mapy segmentów.
- Minimalny rekord:
  - `segment_name`
  - `start_va`
  - `end_va`
  - `size_bytes`
  - `permissions` (R/W/X, jeśli dostępne)
  - `file_offset_start` (opcjonalnie)

## 5) `export_joined_func_string_xref_index`
Krótki opis: mały indeks łączący funkcje ze stringami przez referencje (pod szybkie triage).

Wejście:
- `program`
- `output_path`
- `functions_source` (opcjonalny filtr funkcji)
- `max_strings_per_func` (limit, np. 200)
- `sort_by` (`func_va`, `string_count`, `name`)

Wyjście:
- Plik indeksu funkcja -> stringi (z podstawowym xref kontekstem).
- Minimalny rekord:
  - `func_va`
  - `func_name`
  - `string_va`
  - `string_value`
  - `xref_site_va` (miejsce referencji w funkcji)
- Dodatkowo (opcjonalnie) sekcja podsumowania:
  - `total_functions`
  - `functions_with_strings`
  - `total_links`

## Ujednolicenie formatu (wspólne dla wszystkich 5)
Wejście wspólne:
- `output_path`
- `format` (`csv` albo `jsonl`, rekomendowane `jsonl`)

Wyjście wspólne:
- Kod zakończenia: `0` sukces, `>0` błąd.
- Plik wynikowy + krótki log końcowy:
  - `records_written`
  - `duration_ms`
  - `program_name`
  - `program_sha256` (jeśli dostępny)
