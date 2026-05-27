# Reverse Validation Matrix R79 (Agent R5)

Data: 2026-05-24  
Zakres: walidacja wiedzy pod implementację backendu na podstawie wszystkich `reverse-findings-*.md` oraz eksportów z `C:\Projects\New Folder\export`.

## Źródła
- `backend/docs/aurora-reverse/reverse-findings-area-object-contracts-r78.md`
- `backend/docs/aurora-reverse/reverse-findings-resource-pipeline-r78.md`
- `C:\Projects\New Folder\export\decompiled_all.c`
- `C:\Projects\New Folder\export\functions.tsv`
- `C:\Projects\New Folder\export\imports.tsv`
- `C:\Projects\New Folder\export\strings.tsv`
- `C:\Projects\New Folder\export\strings_2da.tsv`
- `C:\Projects\New Folder\export\xrefs_domain.txt`

## 1) POTWIERDZONE (adres/funkcja/evidence)

| ID | Obszar | Adres / funkcja | Evidence | Wniosek dla backendu |
|---|---|---|---|---|
| C1 | Bootstrap aliasów i ścieżek zasobów (`[Alias]`, `nwn.ini`, `\\hak`, `\\tlk`) | `FUN_0057f8b8` (`0x0057F8B8`) | `reverse-findings-resource-pipeline-r78.md:22`; `xrefs_domain.txt` adresy `0058105a..00581131` (`\\hak`) i `00584de0..00584eb7` (`\\tlk`); `functions.tsv:2686` | Konfiguracja search path jest pierwszą fazą pipeline i musi poprzedzać resolve zasobów. |
| C2 | Resolver ścieżek TLK/HAK | `FUN_00abcfec` (`0x00ABCFEC`) | `reverse-findings-resource-pipeline-r78.md:49`; `functions.tsv:19540`; `xrefs_domain.txt` `00ac44b8..00ac7314` (`data\\tlk`, `\\data\\tlk`) | Resolve katalogów instalacyjnych/fallback jest aktywną częścią ścieżki ładowania TLK. |
| C3 | Otwieranie TLK i obsługa błędu | `FUN_005888f0` (`0x005888F0`) | `reverse-findings-resource-pipeline-r78.md:51`; `xrefs_domain.txt:0058a781` -> `Error: could not open dialog.tlk`; `functions.tsv:2690` | Backend powinien mieć jawny error-path dla braku `dialog.tlk`/custom TLK. |
| C4 | Read `Module.IFO` (w tym `Mod_CustomTlk`, `Mod_HakList`) | `FUN_005b5bc4` (`0x005B5BC4`) | `decompiled_all.c:262330` (`Mod_CustomTlk`), `262516` (`Mod_HakList`); `functions.tsv:2996`; `reverse-findings-resource-pipeline-r78.md:33` | Metadane modułu (TLK/HAK) są czytane z IFO przed dalszym resolve zasobów. |
| C5 | Write `Module.IFO` (round-trip) | `FUN_005bb574` (`0x005BB574`) | `decompiled_all.c:264309`, `264464`; `functions.tsv:3000`; `reverse-findings-resource-pipeline-r78.md:85` | Istnieje pełny round-trip IFO; backend powinien utrzymać spójność read/write kluczy modułu. |
| C6 | Diagnostyka/warstwa HAK (`ResourceInHak`) | `FUN_005ce044` (`0x005CE044`) | `decompiled_all.c:274234`; `xrefs_domain.txt:005ce620`; `functions.tsv:3087` | HAK jest osobną warstwą w resolve i ma własny sygnał konfliktowy. |
| C7 | Lookup 2DA | `FUN_004818b0`, `FUN_0052ede0`, `FUN_00532174`, `FUN_00612a44` | `xrefs_domain.txt` wpisy `2DAName` (`00482d63..`, `0052fcdc..`, `00533d45..`) i `Equip2DA` (`00612b81..`); `functions.tsv:942,2145,2150,3498`; `reverse-findings-resource-pipeline-r78.md:74` | 2DA lookup działa po zbudowaniu resource stack; backend powinien traktować to jako etap zależny od pipeline zasobów. |
| C8 | GIT list parse: `Creature List`, `Door List`, `Placeable List` (wariant 1) | caller `FUN_00567dcc` (`0x00567DCC`), helper `FUN_00aeeb7c` (`0x00AEEB7C`) | `decompiled_all.c:221380`, `221390`, `221420`; `functions.tsv:2530,19911` | Istnieje konkretny parser list GIT oparty o odczyt struktur po kluczach list. |
| C9 | GIT list serialize/emit (wariant 1) | caller `FUN_005685fc` (`0x005685FC`), helper `FUN_00aefb18` (`0x00AEFB18`) | `decompiled_all.c:221756`, `221764`, `221820`; `functions.tsv:2531,19926` | Dla list GIT istnieje także ścieżka zapisu; backend może modelować listy jako round-trip. |
| C10 | GIT list parse (wariant 2) | caller `FUN_005697e4` (`Creature`), `FUN_0056998c` (`Door`), `FUN_00569e8c` (`Placeable`) + `FUN_00aeeb7c` | `decompiled_all.c:221999`, `222080`, `222329`; `functions.tsv:2532,2533,2536,19911` | Są co najmniej dwie ścieżki/tryby obsługi list, więc backend musi unikać zbyt wąskiej implementacji. |
| C11 | `AreaProperties` read/write | read caller `FUN_0056716c` (`0x0056716C`) + `FUN_00aeecf8`; write caller `FUN_0056a6c8` (`0x0056A6C8`) + `FUN_00aefcac` | `decompiled_all.c:220662`, `222710`; `functions.tsv:2516,2541,19914,19928` | `AreaProperties` ma jawne read/write ścieżki i powinno być traktowane jako osobny kontrakt od list obiektowych. |
| C12 | `LinkedToFlags` i `LoadScreenID` read/write | read `FUN_0055aba0` + (`FUN_00aeed68`,`FUN_00aeedc4`); write `FUN_0055add4` + (`FUN_00aefd1c`,`FUN_00aefd88`) | `decompiled_all.c:213671`, `213674`, `213699`, `213700`, `346036`, `346039`, `346125`, `346126`; `functions.tsv:2340,2341,19916,19917,19929,19930` | Klucze transition są realnie parsowane i serializowane; backend musi zachować kompatybilność typów (`byte/ushort`). |
| C13 | Sygnał pipeline `UTC/UTP` (wiele etapów) | `FUN_004a3714`, `FUN_00591a9c`, `FUN_00593848`, `FUN_0059b858`, `FUN_005c675c`, `FUN_005f5494`, `FUN_007338c4`, `FUN_007342e8`, `FUN_007347f8` | `reverse-findings-area-object-contracts-r78.md:84-85`; `xrefs_domain.txt` wpisy `*.UTC` i `*.UTP`; `functions.tsv:1187,2754,2774,2787,2996,3311,5589,5591,5592` | Dla template’ów UTC/UTP mamy twarde punkty adresowe, ale bez pełnej semantyki gałęzi. |

## 2) HIPOTEZY (częściowo potwierdzone)

| ID | Hipoteza | Adres / funkcja | Evidence | Co oznacza dla backendu |
|---|---|---|---|---|
| H1 | `FUN_007338c4` to gałąź bardziej `UTC`-specyficzna, a `FUN_007342e8` bardziej `UTP`-specyficzna | `0x007338C4`, `0x007342E8` | `reverse-findings-area-object-contracts-r78.md:46-52`; `xrefs_domain.txt` sygnały `*.UTC`/`*.UTP` | Model typów obiektów w backendzie powinien pozostać rozdzielny (`creature` vs `placeable`), ale bez twardego przypisania 1:1 do tych funkcji. |
| H2 | `FUN_00524ff4` i `FUN_0073e3ec` to alternatywne/legacy ścieżki list GIT | `0x00524FF4`, `0x0073E3EC` (+ `FUN_00525e60/5f7c/62d0`, `FUN_0073e798`) | `decompiled_all.c:184513..184521`, `476662..476696`; `functions.tsv:2029,2054,2055,2058,5647,5648` | Możliwe różne tryby serializacji/parsingu; wdrożenie backendu nie powinno zakładać pojedynczego call-path. |
| H3 | `FUN_00abcfec` jest centralnym resolverem install/fallback dla TLK/HAK | `0x00ABCFEC` | `reverse-findings-resource-pipeline-r78.md:123` (unable to decompile) + mocne xref stringów | Implementacja fallbacków powinna być zachowana, ale szczegóły branchy nadal są pośrednie. |
| H4 | Odczyt `Mod_HakList` determinuje kolejność nakładania HAK | `FUN_005b5bc4` + `FUN_00aeeb7c` | `decompiled_all.c:262516`; `strings.tsv` (`Mod_HakList`) | Priorytet HAK należy traktować jako order-sensitive, ale polityka konfliktu wymaga jeszcze twardego potwierdzenia kolejności. |
| H5 | Łańcuch `CExoResMan -> CResGFF -> parsery GIT/ARE` jest poprawnym modelem architektury | brak jednoznacznych symboli adresowych | `reverse-findings-area-object-contracts-r78.md:66-69`; `strings.tsv` zawiera typy `CExoResMan`, `CResGFF`; brak nazw metod w `functions.tsv` | Można projektować backend warstwowo, ale mapowanie adresowe metod klas pozostaje niezamknięte. |

## 3) BRAKI (co nadal potrzebne do implementacji backendu)

| ID | Brak | Adres / funkcja (stan) | Evidence braku | Skutek implementacyjny / wymagane domknięcie |
|---|---|---|---|---|
| G1 | Twarde mapowanie do nazwanych metod `CNWSArea::LoadArea`, `CNWSArea::LoadGIT`, `CNWSPlaceable::*`, `CNWSCreature::*` | brak nazw metod w eksporcie (`FUN_*` only) | `reverse-findings-area-object-contracts-r78.md:61-76`; brak dopasowań w `functions.tsv`/`decompiled_all.c` | Trzeba dodać warstwę abstrakcji w backendzie i nie kodować pod nazwy klas, tylko pod kontrakt pól i list. |
| G2 | Jednoznaczna polityka duplikatów/aliasów dla `LoadScreenID/LoadScreenId` i `LinkedToFlags` (np. `last-wins`) | częściowo tylko read/write call-site | `reverse-findings-area-object-contracts-r78.md:91-92,111`; w eksportach brak explicite polityki merge | Potrzebny test kontraktowy z próbkami binarnymi (duplikaty kluczy, case-varianty). |
| G3 | Rozróżnienie ścieżek runtime server vs toolset/editor | wiele funkcji i UI-stringów współistnieje | `strings.tsv` zawiera liczne `Tdlg*`; eksport pochodzi z `nwtoolset.exe` (wg R78) | Backend musi mieć feature flags i kompatybilność defensywną zamiast odwzorowania jednego binarnego przebiegu. |
| G4 | Pełny, adresowy call-chain `resource manager -> GFF top-level -> iteracja struktur` z nazwami ról | helpery `FUN_00ae*` bez nazw domenowych | `reverse-findings-area-object-contracts-r78.md:93-96`; brak `GetResObject/GetTopLevelStruct/GetStructByIndex` w `functions.tsv` | W kodzie backendu należy zdefiniować własny kontrakt etapów parsera, niezależny od brakujących symboli klas. |
| G5 | Twarde potwierdzenie walidacji zakresów/liczb dla pól ARE/GIT (np. bounds, overflow) | brak wyodrębnionych branchy walidacyjnych | brak bezpośrednich wpisów walidacyjnych w aktualnych `reverse-findings` i eksportach | Przed finalnym rolloutem wymagane testy property-based i fuzzing parsera. |
| G6 | Dowód kolejności i reguł konfliktów HAK dla wszystkich przypadków edge | `ResourceInHak` tylko sygnał diagnostyczny | `decompiled_all.c:274234`; `reverse-findings-resource-pipeline-r78.md:66-67` | Niezbędna matryca testów integracyjnych z wieloma HAK o kolidujących zasobach. |
| G7 | Potwierdzenie, która z wykrytych ścieżek list (`00567dcc` vs `00524ff4` vs `0073e3ec`) jest kanoniczna dla celu backendu | kilka równoległych callerów | `decompiled_all.c:184513..184521`, `221380..222336`, `476662..476696` | Trzeba przyjąć implementację kompatybilną semantycznie (ta sama struktura danych i round-trip), nie „1 funkcja = 1 zachowanie”. |
| G8 | `imports.tsv` nie dostarcza granularnych importów parsera domenowego (poza ogólnymi DLL) | brak bezpośredniego evidence domenowego | `imports.tsv` (lista bibliotek); kluczowe sygnały i tak pochodzą z `functions.tsv`/`decompiled_all.c`/`strings.tsv` | Dalsze domykanie wiedzy wymaga pracy na dekompilacie/xrefach, nie na imporcie DLL. |

## 4) Minimalny checklist implementacyjny backendu (na bazie powyższej walidacji)

1. Utrzymać kolejność pipeline: alias/path bootstrap -> IFO read (`CustomTlk`, `HakList`) -> TLK/HAK resolve -> parse danych domenowych.
2. Dla GIT wdrożyć pełny round-trip kontraktów: `AreaProperties`, `Creature List`, `Door List`, `Placeable List`.
3. Dla transition fields (`LinkedToFlags`, `LoadScreenID`) zachować typy numeryczne i przygotować testy na duplikaty/case-variant.
4. W parserach UTC/UTP zachować rozdział typów obiektów, ale nie zakładać jeszcze pełnej mapy do nazw klas NWN.
5. Zaplanować etap P0 dekompilacji uzupełniającej pod brakujące reguły konfliktów i polityki aliasów.
