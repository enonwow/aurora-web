# Ghidra Export Naming Standard (R71)

## 1. Cel
Ten dokument definiuje jednolity standard nazewnictwa i struktury folderow dla eksportow z Ghidry:
- `decompile`
- `xref`
- `strings`
- `callgraph`

Celem jest deterministyczny ingest po stronie backendu (bez heurystyk i bez zgadywania formatu).

## 2. Zakres i zasady normatywne
- Slowa `MUST`, `MUST NOT`, `SHOULD`, `MAY` sa normatywne.
- Wszystkie nazwy plikow i folderow `MUST` byc lowercase ASCII.
- Separator w nazwach `MUST` byc `-` dla slugow i `_` dla tokenow technicznych.
- Dane masowe `MUST` byc w `NDJSON` (`.ndjson`) z UTF-8 i `\\n`.
- Adresy `MUST` byc hex lowercase z prefixem `0x`.
- Czasy `MUST` byc w UTC, format `YYYYMMDDThhmmssZ`.

## 3. Kanoniczna struktura katalogow

```text
<export_root>/
  ghidra/
    <project_slug>/
      <binary_slug>/
        <run_id>/
          manifest.json
          _meta/
            toolchain.json
            checksums.sha256
          decompile/
            functions.ndjson
            files/
              <function_key>.c
          xref/
            edges.ndjson
          strings/
            strings.ndjson
          callgraph/
            nodes.ndjson
            edges.ndjson
```

## 4. Semantyka segmentow sciezki

### 4.1 `<export_root>`
- `MUST` byc konfigurowalne po stronie backendu.
- `MUST NOT` byc kodowane na sztywno w nazwach artefaktow.

### 4.2 `<project_slug>`
- Reprezentuje projekt reverse-engineering.
- `MUST` pasowac do regex:
  - `^[a-z0-9]+(?:-[a-z0-9]+)*$`
- Przyklad: `nwn-ee`.

### 4.3 `<binary_slug>`
- Reprezentuje analizowany binarny modul.
- `MUST` byc stabilny miedzy runami dla tego samego pliku logicznego.
- Regex:
  - `^[a-z0-9]+(?:-[a-z0-9]+)*$`
- Przyklad: `nwserver-linux-x64`.

### 4.4 `<run_id>`
- Jednoznaczna instancja eksportu.
- `MUST` miec format:
  - `run_<utc_ts>_<suffix>`
- Gdzie:
  - `<utc_ts>`: `YYYYMMDDThhmmssZ`
  - `<suffix>`: `^[a-z0-9]{6,12}$` (np. skrot commita, hash sesji)
- Regex calosci:
  - `^run_[0-9]{8}T[0-9]{6}Z_[a-z0-9]{6,12}$`
- Przyklad: `run_20260524T091500Z_a17c9f2d`.

## 5. Nazewnictwo wspolne artefaktow

### 5.1 `function_key`
Klucz funkcji uzywany w plikach decompilacji:
- `MUST` byc:
  - `fn_<entry_va>`
- Gdzie `<entry_va>` to hex lowercase bez prefiksu `0x`, min 8 znakow, max 16.
- Regex:
  - `^fn_[0-9a-f]{8,16}$`
- Przyklad: `fn_00000001403fa120`.

### 5.2 Identyfikatory wezlow grafowych
- `node_id` `MUST` byc rowny `function_key` dla funkcji.
- Dla wezlow niefunkcyjnych `MAY` uzyc prefiksu:
  - `ext_<slug>` (np. API zewnetrzne).

### 5.3 Sharding (opcjonalny)
Przy duzych danych pliki `MAY` byc shardowane:
- Format nazwy:
  - `<base>.part-<NNNNN>.ndjson`
- Przyklad:
  - `edges.part-00001.ndjson`
- Jesli sharding wlaczony, wszystkie party `MUST` miec staly rozmiar logiczny poza ostatnia.

## 6. Wymagane pliki i kontrakty per typ eksportu

## 6.1 `manifest.json` (wymagany)
`manifest.json` `MUST` istniec w katalogu runa i zawierac minimum:
- `standard_version` (np. `r71`)
- `project_slug`
- `binary_slug`
- `run_id`
- `created_at_utc` (ISO-8601, np. `2026-05-24T09:15:00Z`)
- `ghidra_version`
- `export_types` (lista z podzbioru: `decompile`, `xref`, `strings`, `callgraph`)
- `record_counts` (mapa licznikow per plik logiczny)
- `checksums` (mapa `relative_path -> sha256`)

Backend `MUST` rozpoczynac ingest od `manifest.json`.

## 6.2 `decompile/`
Wymagane:
- `decompile/functions.ndjson`
- `decompile/files/<function_key>.c`

`decompile/functions.ndjson` (1 rekord = 1 funkcja):
- Pola wymagane:
  - `function_key` (string)
  - `entry_va` (string hex z `0x`)
  - `name` (string, nazwa z Ghidry)
  - `signature` (string)
  - `file` (string, relatywna sciezka do `.c`)
  - `size_bytes` (int)
  - `sha256` (string)

Reguly:
- `file` `MUST` wskazywac `decompile/files/<function_key>.c`.
- Kod C `MUST` byc UTF-8, `\\n`, bez BOM.

## 6.3 `xref/`
Wymagane:
- `xref/edges.ndjson`

Rekord `xref edge`:
- `src_function_key` (string)
- `src_va` (string hex `0x...`)
- `dst_type` (enum: `function|data|string|external|unknown`)
- `dst_ref` (string; np. `fn_...`, `str_...`, `ext_...`, `data_...`)
- `xref_kind` (enum: `call|jump|read|write|addr-taken|unknown`)
- `at_va` (string hex `0x...`)

Reguly:
- Backend `MUST` traktowac `src_function_key + at_va + dst_ref + xref_kind` jako klucz deduplikacji.

## 6.4 `strings/`
Wymagane:
- `strings/strings.ndjson`

Rekord stringa:
- `string_id` (format: `str_<va_hex_no_prefix>`)
- `va` (string hex `0x...`)
- `length` (int)
- `encoding` (enum: `ascii|utf8|utf16le|utf16be|unknown`)
- `value` (string)
- `is_printable` (bool)

Reguly:
- `string_id` regex:
  - `^str_[0-9a-f]{8,16}$`
- `value` `MUST` byc escaped zgodnie z JSON.

## 6.5 `callgraph/`
Wymagane:
- `callgraph/nodes.ndjson`
- `callgraph/edges.ndjson`

`nodes.ndjson` rekord:
- `node_id` (string)
- `kind` (enum: `function|external`)
- `label` (string)
- `entry_va` (string hex `0x...` lub `null` dla external)

`edges.ndjson` rekord:
- `src_node_id` (string)
- `dst_node_id` (string)
- `callsite_va` (string hex `0x...` lub `null`)
- `edge_kind` (enum: `direct|indirect|thunk|unknown`)

Reguly:
- Kazda krawedz `MUST` wskazywac na istniejace `src_node_id` i `dst_node_id`.
- Krawedzie duplikaty `MUST NOT` wystepowac po kluczu:
  - `src_node_id + dst_node_id + callsite_va + edge_kind`.

## 7. Pliki metadanych

## 7.1 `_meta/toolchain.json`
`MUST` zawierac:
- `ghidra_version`
- `analyzer_profile` (nazwa profilu analiz)
- `os`
- `export_script_version`

## 7.2 `_meta/checksums.sha256`
- Format zgodny z `sha256sum`:
  - `<sha256><2 spacje><relative_path>`
- `MUST` obejmowac wszystkie pliki danych i metadanych runa.

## 8. Reguly kompatybilnosci backendu
- Backend `MUST` odrzucic run gdy:
  - brakuje `manifest.json`,
  - `standard_version != r71`,
  - checksum sie nie zgadza,
  - wymagane pliki typu eksportu nie istnieja.
- Backend `SHOULD` wspierac partial ingest na poziomie `export_types` z manifestu.
- Backend `MUST` logowac bledy walidacji z pelna sciezka i kodem bledu.

## 9. Kody bledow walidacji (zalecane)
- `GHX001` brak `manifest.json`
- `GHX002` nieobsługiwana `standard_version`
- `GHX003` niepoprawny `run_id`
- `GHX004` brak wymaganego pliku
- `GHX005` checksum mismatch
- `GHX006` invalid NDJSON line
- `GHX007` referential integrity error (np. callgraph edge -> missing node)

## 10. Przyklad kompletnej sciezki

```text
<export_root>/ghidra/nwn-ee/nwserver-linux-x64/run_20260524T091500Z_a17c9f2d/
```

Przyklad pliku dekompilacji funkcji:

```text
<export_root>/ghidra/nwn-ee/nwserver-linux-x64/run_20260524T091500Z_a17c9f2d/decompile/files/fn_00000001403fa120.c
```

## 11. Minimalny checklist producenta eksportu
- Wygenerowano `manifest.json` z `standard_version: r71`.
- Wszystkie wymagane foldery istnieja.
- Wszystkie wymagane pliki `.ndjson` istnieja i sa parsowalne liniowo.
- Wszystkie referencje miedzy plikami sa spojne.
- Wygenerowano i zweryfikowano checksumy.

## 12. Stabilnosc i ewolucja
- Zmiana kontraktu pola, nazwy pliku, lub regexu identyfikatora `MUST` podbijac rewizje standardu (`r72+`).
- Dodanie nowych pol opcjonalnych `MAY` byc kompatybilne w ramach `r71`, o ile nie lamie parsera liniowego NDJSON.

