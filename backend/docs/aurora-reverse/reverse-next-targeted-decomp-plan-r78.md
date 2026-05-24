# Reverse Next Targeted Decomp Plan R78

Data: 2026-05-24
Rola: Agent R3 (Actionable Next Decomp Plan)
Zakres: praktyczny plan kolejnej dekompilacji celowanej na bazie aktualnych artefaktow (`xrefs_domain_mapped.tsv`, `reverse-findings-area-object-contracts-r78.md`, `function-prioritization-catalog-r71.md`).

## Cel rundy
1. Domknac mape adresowa dla sciezki `ARE/GIT/UTC/UTP`.
2. Potwierdzic lacznik `resource resolve -> parser -> object lane`.
3. Odfiltrowac resztki szumu i zostawic tylko funkcje z realnym impactem kontraktowym.

## TOP-25 funkcji do recznego review w Ghidrze

| # | Priorytet | Adres | Funkcja | Dlaczego teraz | Spodziewany efekt |
|---|---|---|---|---|---|
| 1 | P0 | `0x0072691c` | `FUN_0072691c` | Jedyny mocny sygnal `are` (`DefaultAreaProperties`) w aktualnym mapowaniu. | Twardy punkt wejscia do lane `ARE` i dojscie do callerow `LoadArea/LoadProperties`. |
| 2 | P0 | `0x004a3714` | `FUN_004a3714` | Wspolny sygnal `*.UTC` + `*.UTP`; kandydat dispatcher UT*. | Potwierdzenie centralnego brancha `creature vs placeable` albo wykluczenie go. |
| 3 | P0 | `0x00591a9c` | `FUN_00591a9c` | Wysoki sygnal dualny `UTC/UTP` w srodku pipeline. | Mapowanie etapu resolve/selection zasobu UT* i jego wejsc/wyjsc. |
| 4 | P0 | `0x00593848` | `FUN_00593848` | Kolejny wspolny etap `UTC/UTP`, dobry do callchain continuity. | Spiecie callchainu miedzy wczesnym i pozniejszym etapem lane UT*. |
| 5 | P0 | `0x0059b858` | `FUN_0059b858` | Wspolny sygnal `UTC/UTP`; potencjalny etap post-parse. | Ustalenie gdzie zaczyna sie materializacja obiektu runtime. |
| 6 | P0 | `0x005c675c` | `FUN_005c675c` | Wspolna funkcja UT* o wiekszym rozmiarze; mozliwy orchestrator pod-lane. | Potwierdzenie petli po rekordach/strukturach i mapowania pol. |
| 7 | P0 | `0x005f5494` | `FUN_005f5494` | Sygnal `UTC/UTP` blizej downstream; wazne dla domkniecia E2E. | Jasny handoff z parsera do konstruktora obiektu. |
| 8 | P0 | `0x007347f8` | `FUN_007347f8` | Pozna faza UT* wspolna dla obu rozszerzen. | Weryfikacja finalizacji lane i ewentualnych walidacji koncowych. |
| 9 | P0 | `0x007338c4` | `FUN_007338c4` | Sygnal tylko `*.UTC`; idealny kandydat na creature-only branch. | Dowod rozdzialu logiki `UTC` od `UTP` i mapowanie do `creature lane`. |
| 10 | P0 | `0x007342e8` | `FUN_007342e8` | Sygnal tylko `*.UTP`; kandydat na placeable-only branch. | Dowod rozdzialu logiki `UTP` i mapowanie do `placeable/door lane`. |
| 11 | P1 | `0x00638644` | `FUN_00638644` | `utc` + sygnal zapisu/ladowania palety; moze byc etap enrichmentu creature. | Potwierdzenie czy to domena obiektowa czy narzedziowy side-path. |
| 12 | P0 | `0x00abcfec` | `FUN_00abcfec` | Najsilniejszy hub xref (`tlk/hak`, 25 trafien), duzy rozmiar. | Odtworzenie gatekeepingu instalacji/lookupu zasobow i fallbackow. |
| 13 | P0 | `0x0057f8b8` | `FUN_0057f8b8` | Wysokie trafienia `hak/tlk`; mocny kandydat resolver path. | Potwierdzenie sciezki wyboru katalogu/rozszerzenia zasobu. |
| 14 | P1 | `0x005b5bc4` | `FUN_005b5bc4` | `Mod_HakList` / `Mod_Hak` / `Mod_CustomTlk` - semantyka konfiguracji modulu. | Jasna mapa precedence HAK/TLK dla backendowego source-resolvera. |
| 15 | P1 | `0x005bb574` | `FUN_005bb574` | 20 trafien, mix `2da/hak/tlk`; modulowe pola `Mod_Entry_*`. | Potwierdzenie parsera metadanych modulu i mapowania pol runtime. |
| 16 | P1 | `0x005ce044` | `FUN_005ce044` | Sygnal `ResourceInHak`; wysoki potencjal na reguly rozstrzygania zasobu. | Twarda regulka `resource-in-hak` do kontraktu resolvera. |
| 17 | P2 | `0x004af534` | `FUN_004af534` | Sygnal `HAK_V1.0`; szybki test wersjonowania kontenera HAK. | Potwierdzenie brancha walidacji naglowka HAK (lub jego brak). |
| 18 | P1 | `0x005888f0` | `FUN_005888f0` | Sygnal bledu `could not open dialog.tlk`; newralgiczne fallbacki TLK. | Zmapowanie error path i warunkow awarii otwarcia TLK. |
| 19 | P1 | `0x00612a44` | `FUN_00612a44` | Sygnal `Equip2DA`; laczy 2DA z runtime (ekwipunek). | Potwierdzenie lookupu kolumn i wplywu na model obiektu. |
| 20 | P1 | `0x004818b0` | `FUN_004818b0` | Silny sygnal `2DAName`; podstawowy loader tabel 2DA. | Odtworzenie schematu odczytu 2DA i walidacji nazwy/tabeli. |
| 21 | P1 | `0x0052ede0` | `FUN_0052ede0` | Duza funkcja 2DA; prawdopodobny parser z petlami. | Potwierdzenie mapowania rekordow 2DA -> struktury runtime. |
| 22 | P1 | `0x00532174` | `FUN_00532174` | Duza funkcja 2DA (11581 B), wysoki potencjal semantyczny. | Wyodrebnienie branchy lookup/fallback i reguly normalizacji danych. |
| 23 | P1 | `0x0045978c` | `FUN_0045978c` | Sygnal `TdlgCreatureEdit::LoadClasses`; istotne dla warstwy creature data. | Potwierdzenie czy lane klas creature korzysta z tego samego parsera 2DA. |
| 24 | P1 | `0x00463d54` | `FUN_00463d54` | Sygnal `ModelType_for_appearance_not_fou`; wazne dla appearance fallback. | Zmapowanie polityki fallbacku modelu/appearance przy brakach danych. |
| 25 | P2 | `0x004d3e74` | `FUN_004d3e74` | Sygnal formatu `pmh0_%s_%03d`; kandydat na generator/maper nazw zasobu. | Potwierdzenie czy funkcja buduje klucze pomocnicze istotne dla resolvera. |

## Szybkie kroki weryfikacji (na kazda funkcje, 5-8 min)

1. Otworz funkcje po adresie i potwierdz sygnal kotwiczny (string/import) z `xrefs_domain_mapped.tsv`.
2. Zrob `Xrefs To` + 2 poziomy callerow; oznacz czy funkcja jest `dispatcher`, `parser`, `helper`, czy `noise`.
3. Sprawdz `Xrefs From` i zanotuj max 3 krytyczne callees (szczegolnie resource/GFF/object constructors).
4. W dekompilatorze zapisz 3 dowody: warunek decyzyjny, petla/iteracja, miejsce mapowania pola.
5. Nadaj robocza nazwe (`r78_*`) i tag (`P0`/`P1`/`P2` + `confidence`).
6. Ocen impact: `hard-gate` (blokuje kontrakt) albo `preserve-first` (uzupelniajace).

## Szybki rytm wykonania (praktyczny)

1. Sprint A (P0, pozycje 1-13): cel to domkniecie callchainu `ARE/GIT/UT* + resolver`.
2. Sprint B (P1, pozycje 14-24): doprecyzowanie semantyki modul/2DA/TLK i branchy obiektowych.
3. Sprint C (P2, pozycje 17 i 25): szybkie domkniecie edge-case i generatorow pomocniczych.

## Definition of Done tej rundy

1. Dla kazdej z TOP-25 jest wpis: `adres -> rola -> 2 dowody -> decyzja (keep/drop/noise)`.
2. Co najmniej 8 funkcji P0 ma potwierdzony caller-chain do funkcji wyzej poziomu.
3. Powstaje jedna krotka mapa `resource -> parser -> object lane` z adresami (bez luk P0 krytycznych).
