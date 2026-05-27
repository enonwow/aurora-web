# Ghidra Export Checklist (R72)

Data: 2026-05-24  
Zakres: checklista przekazania artefaktow eksportu z Ghidry do repo (R72).  
Statusy: `PASS` / `FAIL` / `N/A`.

## 1. Konwencja docelowa (R72)

- Root runu w repo: `<repo_root>/backend/docs/aurora-reverse/exports/ghidra/<project_slug>/<binary_slug>/<run_id>/`
- Regex `project_slug`: `^[a-z0-9]+(?:-[a-z0-9]+)*$`
- Regex `binary_slug`: `^[a-z0-9]+(?:-[a-z0-9]+)*$`
- Regex `run_id`: `^run_[0-9]{8}T[0-9]{6}Z_[a-z0-9]{6,12}$`
- `standard_version` w `manifest.json`: `r72`
- Kodowanie plikow tekstowych: UTF-8, LF (`\n`), bez BOM.

## 2. Checklista artefaktow

| # | Co (artefakt) | Gdzie w repo (relatywnie od root runu) | Nazwa | Format | Walidacja kompletnosci |
|---|---|---|---|---|---|
| 1 | Manifest runu | `./` | `manifest.json` | JSON | `PASS` gdy plik istnieje, jest poprawnym JSON i ma pola: `standard_version`, `project_slug`, `binary_slug`, `run_id`, `created_at_utc`, `ghidra_version`, `export_types`, `record_counts`, `checksums`. |
| 2 | Metadane toolchain | `./_meta/` | `toolchain.json` | JSON | `PASS` gdy sa pola: `ghidra_version`, `analyzer_profile`, `os`, `export_script_version`. |
| 3 | Suma kontrolna plikow | `./_meta/` | `checksums.sha256` | SHA256SUM text | `PASS` gdy kazdy wpis ma postac `<sha256><2 spacje><relative_path>` i obejmuje wszystkie pliki danych + metadane runu. |
| 4 | Inwentarz dekompilacji | `./decompile/` | `functions.ndjson` | NDJSON | `PASS` gdy kazda linia to poprawny JSON i ma pola: `function_key`, `entry_va`, `name`, `signature`, `file`, `size_bytes`, `sha256`. |
| 5 | Ciala funkcji | `./decompile/files/` | `<function_key>.c` | C (text) | `PASS` gdy dla kazdego rekordu z `decompile/functions.ndjson` istnieje odpowiadajacy plik, a `file` wskazuje poprawna relatywna sciezke. |
| 6 | Cross-reference edges | `./xref/` | `edges.ndjson` | NDJSON | `PASS` gdy rekord ma: `src_function_key`, `src_va`, `dst_type`, `dst_ref`, `xref_kind`, `at_va` i brak duplikatow po kluczu `(src_function_key, at_va, dst_ref, xref_kind)`. |
| 7 | Corpus stringow | `./strings/` | `strings.ndjson` | NDJSON | `PASS` gdy rekord ma: `string_id`, `va`, `length`, `encoding`, `value`, `is_printable`; `string_id` pasuje do `^str_[0-9a-f]{8,16}$`. |
| 8 | Wezly callgraph | `./callgraph/` | `nodes.ndjson` | NDJSON | `PASS` gdy rekord ma: `node_id`, `kind`, `label`, `entry_va` i `kind` nalezy do `function|external`. |
| 9 | Krawedzie callgraph | `./callgraph/` | `edges.ndjson` | NDJSON | `PASS` gdy rekord ma: `src_node_id`, `dst_node_id`, `callsite_va`, `edge_kind`; brak duplikatow po `(src_node_id, dst_node_id, callsite_va, edge_kind)`; kazdy `src/dst` istnieje w `nodes.ndjson`. |
| 10 | Shardy (opcjonalnie) | folder typu (`decompile/xref/strings/callgraph`) | `<base>.part-<NNNNN>.ndjson` | NDJSON | `PASS` gdy numeracja shardow jest ciagla od `00001`, bez luk, a suma rekordow zgadza sie z `record_counts` w `manifest.json`. |

## 3. Checklista walidacji kompletnego runu

| # | Kontrola | Kryterium PASS |
|---|---|---|
| 1 | Spojnosc sciezki runu | Katalog runu istnieje i odpowiada schematowi: `exports/ghidra/<project_slug>/<binary_slug>/<run_id>/`. |
| 2 | Spojnosc wersji standardu | `manifest.json.standard_version == "r72"`. |
| 3 | Zgodnosc `export_types` vs pliki | Dla kazdego typu z `export_types` istnieja wszystkie wymagane pliki z sekcji 2. |
| 4 | Parsowalnosc | Wszystkie `*.json`, `*.ndjson` sa poprawnie parsowalne. |
| 5 | Integralnosc referencji | `decompile.file` wskazuje istniejacy plik; `callgraph.edges` odwoluje sie do istniejacych node; brak osieroconych referencji. |
| 6 | Integralnosc checksum | Kazdy plik z runu ma zgodny SHA-256 z `manifest.checksums` oraz `_meta/checksums.sha256`. |
| 7 | Zgodnosc licznikow | `record_counts` zgadza sie z realna liczba rekordow NDJSON (sumarycznie po shardach, jesli sa). |
| 8 | Unikalnosc runu | Brak kolizji `run_id` (katalog o tym samym `run_id` nie zawiera innego zestawu hashy). |
| 9 | Brak plikow nadmiarowych krytycznych | W runie nie ma nieudokumentowanych formatow binarnych/tymczasowych, ktore nie sa opisane w `manifest`. |
| 10 | Odbior koncowy | Wszystkie punkty 1-9 = `PASS`; inaczej run oznaczony jako `FAIL` i blokada ingestu. |

## 4. Szybki protokol odbioru (do wypelnienia)

- `project_slug`: `________________`
- `binary_slug`: `________________`
- `run_id`: `________________`
- `reviewer`: `________________`
- `reviewed_at_utc`: `________________`

| Obszar | Wynik |
|---|---|
| Artefakty wymagane | `PASS / FAIL` |
| Parsowanie i schema | `PASS / FAIL` |
| Referencyjna integralnosc | `PASS / FAIL` |
| Checksum i liczniki | `PASS / FAIL` |
| Final gate | `PASS / FAIL` |

## 5. Definicja gotowosci (DoD)

- Wszystkie pozycje z sekcji 2 i 3 maja status `PASS`.
- Run moze byc ingestowany przez backend bez heurystyk i bez recznych poprawek.
- W przypadku `FAIL` nalezy poprawic eksport i wygenerowac nowy `run_id`.
