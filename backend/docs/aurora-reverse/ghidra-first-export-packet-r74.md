# Ghidra First Export Packet (R74)

Data: 2026-05-24
Rola: Agent F11 (First Export Packet)
Status: Proposed standard (minimalny pakiet po pierwszej analizie)

## 1. Cel

Zdefiniowac najmniejszy zestaw eksportow z Ghidry, ktory po pierwszej analizie daje najwyzsza wartosc dla backendu Aurora:
- szybki, deterministyczny ingest,
- priorytetyzacje funkcji do dalszej dekompilacji,
- mozliwosc mapowania logiki binarki na domeny backendowe bez czekania na pelny bulk export.

## 2. Zakres

Ten pakiet jest "first packet", nie pelnym zrzutem projektu.
Ma byc wykonywalny po pierwszym przejsciu analizy i triage (pierwsze 60-90 min), a nie po pelnej, kosztownej dekompilacji wszystkiego.

## 3. Minimalny pakiet eksportow (must-have)

Root runu (kanonicznie):
`backend/docs/aurora-reverse/exports/ghidra/<project_slug>/<binary_slug>/<run_id>/`

| # | Plik | Format | Minimum zawartosci | Dlaczego to jest high-value dla backendu |
|---|---|---|---|---|
| 1 | `manifest.json` | JSON | `standard_version`, `project_slug`, `binary_slug`, `run_id`, `created_at_utc`, `ghidra_version`, `export_types`, `record_counts`, `checksums` | Punkt startowy ingestu, fail-fast walidacja i kontrakt wersji. |
| 2 | `_meta/toolchain.json` | JSON | `ghidra_version`, `analyzer_profile`, `os`, `export_script_version` | Rozroznienie driftu narzedzi od realnych roznic w danych. |
| 3 | `_meta/checksums.sha256` | SHA256SUM text | Hash dla kazdego artefaktu z runu | Integralnosc danych i blokada ingestu uszkodzonych plikow. |
| 4 | `functions/functions.ndjson` | NDJSON | 1 rekord/funkcja: `function_key`, `entry_va`, `name`, `signature`, `size_bytes`, `priority` (`P0/P1/P2`) | Glowny indeks pracy backendu (`source-resolver`, kolejkowanie, coverage). |
| 5 | `callgraph/edges.ndjson` | NDJSON | `src_function_key`, `dst_ref`, `edge_kind`, `at_va` | Najtanszy sposob odtworzenia przeplywu i zaleznosci funkcji. |
| 6 | `strings/strings.ndjson` | NDJSON | `string_id`, `va`, `value`, `encoding`, `xref_count`, `top_ref_function_keys[]` | Szybki sygnal domenowy (settings, paths, errors, transitions, module/hak/tlk/2da). |
| 7 | `decompile/functions.ndjson` | NDJSON | Tylko shortlista P0/P1 (np. Top-10/Top-30): `function_key`, `entry_va`, `name`, `file`, `sha256`, `confidence` | Najwyzsza wartosc semantyczna przy ograniczonym koszcie eksportu. |
| 8 | `decompile/files/<function_key>.c` | C (UTF-8, LF) | Ciala funkcji dla pozycji z `decompile/functions.ndjson` | Material do mapowania logiki na kontrakty backendowe i ADR-y. |
| 9 | `decompile/failed.ndjson` | NDJSON | `function_key`, `entry_va`, `reason`, `fallback_file` (opcjonalnie) | Jawne braki coverage i plan retry/fallback bez cichych dziur. |

## 4. Co celowo pomijamy w first packet

Aby pakiet byl minimalny i szybki, nie wymagamy na tym etapie:
- pelnego `callgraph/nodes.ndjson` (mozna odtworzyc z inventory + edges),
- pelnej dekompilacji wszystkich funkcji,
- ciezkich raportow porownawczych run-to-run,
- eksportow niskiej wartosci (szum/thunki bez lokalnej logiki).

## 5. Kontrakty jakosci (gate PASS/FAIL)

First packet jest `PASS` tylko gdy:
1. Wszystkie 9 plikow/typow z sekcji 3 istnieje (z uwzglednieniem wielu plikow `.c` dla shortlisty).
2. `manifest.json.standard_version == "r74"`.
3. Wszystkie `*.json` i `*.ndjson` sa parsowalne liniowo.
4. `checksums` zgadzaja sie z rzeczywistymi hashami.
5. Kazdy rekord `decompile/functions.ndjson` ma odpowiadajacy plik `decompile/files/<function_key>.c` albo wpis w `decompile/failed.ndjson`.
6. `functions/functions.ndjson` zawiera co najmniej 1 funkcje `P0` i co najmniej 10 funkcji lacznie.

## 6. Minimalne progi sygnalu (po pierwszej analizie)

- `functions_total >= 10`
- `p0_or_p1_functions >= 5`
- `call_edges_total >= 20`
- `strings_total >= 30`
- `decompile_success_total >= 5`

Progi sa celowo niskie: maja gwarantowac szybki start backendu, nie pelne pokrycie binarki.

## 7. Mapping na domeny backendowe (skrót)

- `manifest` + `_meta/*` + `checksums` -> `processing-jobs` + `runtime-settings` + `security`
- `functions/*` + `callgraph/edges.ndjson` -> `source-resolver` + `processing-jobs`
- `strings/strings.ndjson` -> `source-resolver` + `security`
- `decompile/*` -> `source-resolver` (primary), `processing-jobs` (secondary)

## 8. Definition of Done (First Export Packet R74)

Pakiet jest gotowy do przekazania, gdy:
- przechodzi gate z sekcji 5,
- daje backendowi material do uruchomienia ingestu i priorytetyzacji bez dodatkowego handoffu ustnego,
- identyfikuje jawnie luki (`failed.ndjson`) zamiast ukrywac brakujace dane.
