# Ghidra -> Backend Domains Crosswalk (R71)

## Zakres
Dokument mapuje typy artefaktow Ghidry na domeny backendowe:
- `runtime-settings`
- `source-resolver`
- `processing-jobs`
- `security`

## Reguly przypisania
1. Kazdy artefakt ma `primary_domain` i opcjonalne `secondary_domains`.
2. Jesli artefakt zawiera dane wrazliwe (klucze, tokeny, slady uzytkownika, ACL), priorytet ma `security`.
3. Jesli artefakt opisuje uruchomienie analizy, stan pipeline lub retry, priorytet ma `processing-jobs`.
4. Jesli artefakt opisuje semantyke kodu/binarki, symbole, typy, xref lub dekompilacje, priorytet ma `source-resolver`.
5. Jesli artefakt steruje parametrami wykonania narzedzi, priorytet ma `runtime-settings`.

## Crosswalk
| Ghidra artifact type | Primary domain | Secondary domains | Uzasadnienie backendowe |
|---|---|---|---|
| Project metadata (nazwa projektu, owner, toolchain profile) | `runtime-settings` | `security` | Kontekst sesji i konfiguracji pracy; wlasciciel/tenant moze wplywac na polityki dostepu. |
| Program import descriptor (format, loader, image base, endian, arch) | `source-resolver` | `runtime-settings` | Definiuje jak binarka jest interpretowana i mapowana do modelu zrodlowego. |
| Memory map / blocks / segments / sections | `source-resolver` | `security` | Fundament adresacji dla symboli i dekompilacji; moze ujawniac chronione obszary. |
| Auto-analysis options (analizatory, heurystyki, timeouty) | `runtime-settings` | `processing-jobs` | To parametry wykonania, ktore steruja jobem analitycznym. |
| Auto-analysis results summary (co uruchomiono, co wykryto) | `processing-jobs` | `source-resolver` | Jest wynikiem pipeline; zawiera tez sygnaly jakosci danych zrodlowych. |
| Symbol table (functions, labels, namespaces, externals) | `source-resolver` |  | Glowny zasob do rozwiazywania nazw i semantyki kodu. |
| Function signatures (ABI, calling convention, parametry, return) | `source-resolver` | `runtime-settings` | Uzywane do rekonstrukcji semantyki; czesc ustawien moze byc wymuszana profilem runtime. |
| Data types (struct/enum/union/typedef) | `source-resolver` |  | Model typow jest rdzeniem rekonstrukcji warstwy zrodlowej. |
| Decompiler output (pseudokod C, lokalne zmienne) | `source-resolver` | `processing-jobs` | To produkt koncowy resolvera; czesto materializowany jako wynik etapu joba. |
| Disassembly listing (instrukcje, adresy, mnemoniki) | `source-resolver` |  | Niskopoziomowa reprezentacja zrodla wykonywalnego. |
| Xrefs / call graph / CFG | `source-resolver` | `processing-jobs` | Semantyczna siec zaleznosci; czesto budowana asynchronicznie jako etap grafowy. |
| Strings (ASCII/Unicode, refs) | `source-resolver` | `security` | Dane analityczne i IOC; moga zawierac sekrety lub PII wymagajace klasyfikacji. |
| Imports / exports / external libraries | `source-resolver` | `security` | Rozwiazywanie zaleznosci binarki; lista API bywa sygnalem ryzyka. |
| Relocations | `source-resolver` |  | Kluczowe dla poprawnej rekonstrukcji adresow i referencji. |
| Equates / constants annotations | `source-resolver` |  | Wzbogacaja semantyke instrukcji i typow. |
| Comments / bookmarks / manual annotations | `source-resolver` | `security` | Wiedza analityka osadzona przy kodzie; komentarze moga zawierac dane poufne. |
| Function ID / signature matches | `source-resolver` | `security` | Korelacja z baza sygnatur; istotne dla klasyfikacji malware i trust scoring. |
| Script definitions (Ghidra scripts) | `runtime-settings` | `security` | Definiuja automatyzacje srodowiska; wymagaja kontroli zrodla i uprawnien wykonania. |
| Script execution output (stdout, artifacts, metrics) | `processing-jobs` | `security` | Telemetria uruchomien i produkty posrednie; potencjalny nosnik danych wrazliwych. |
| Headless analyzer logs | `processing-jobs` | `runtime-settings`, `security` | Operacyjny slad przebiegu pipeline i konfiguracji; audyt i diagnostyka. |
| Program diff artifacts (A vs B, delta funkcji/typow) | `processing-jobs` | `source-resolver` | Wynik porownania realizowanego jako job, konsumowany przez resolver zmian. |
| Patched bytes / patch history | `security` | `source-resolver`, `processing-jobs` | Modyfikacje binarki wymagaja integralnosci, audytu i sledzenia pochodzenia. |
| Project sharing/ACL (Ghidra Server) | `security` | `runtime-settings` | Kontrola dostepu, role, izolacja tenantow i polityki wspoldzielenia. |
| User activity trail (kto/co/kiedy: rename, retype, patch) | `security` | `processing-jobs` | Audyt operacji i nienaruszalnosc dziennika zmian. |
| Export bundles (XML/JSON/CSV/archives) | `security` | `source-resolver`, `processing-jobs` | Kanal exfiltracji i wymiany danych; wymaga klasyfikacji, podpisu i polityk retencji. |

## Normalizacja kontraktow (zalecenie)
Kazdy rekord artefaktu powinien miec spojne pola:
- `artifact_type`
- `primary_domain`
- `secondary_domains`
- `source_program_id`
- `job_id` (jesli dotyczy)
- `sensitivity` (`public`, `internal`, `restricted`, `secret`)
- `provenance` (narzedzie, wersja, timestamp, operator)
- `integrity` (hash, signature, chain_id)

## Szybkie reguly routingu
1. `artifact_type in {analysis_options, project_profile, script_definition}` -> `runtime-settings`
2. `artifact_type in {symbol, type, function, xref, decompile, disassembly, import_export, relocation}` -> `source-resolver`
3. `artifact_type in {analysis_run, log, script_output, diff_result, queue_event}` -> `processing-jobs`
4. `artifact_type in {acl, audit, patch, secret_like_string, signed_export}` -> `security`

## Uwagi implementacyjne
- Dopuszczalne jest wielodomenowe tagowanie (`primary` + `secondary`) bez duplikacji payloadu.
- `security` powinno moc nakladac polityki maskowania na artefakty z innych domen.
- `processing-jobs` powinno utrzymywac status lineage: `queued -> running -> completed|failed|canceled`.
