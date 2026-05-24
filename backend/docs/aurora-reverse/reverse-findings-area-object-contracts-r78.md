# Reverse Findings R78: Area/Object Contracts Deep Dive (ARE/GIT/UTC/UTP/placeable/creature)

Data: 2026-05-24  
Rola: Agent R2  
Zakres: tylko read-side analiza artefaktow w repo (`docs/aurora-reverse` + `xrefs_domain_mapped.tsv`), bez zmian kodu.

## 1. Kandydaci funkcji parsera/loadera

## 1.1 Kandydaci z bezposrednim sygnalem string->xref (najmocniejsze)

1. `FUN_004a3714`  
- sygnal: `*.UTC` i `*.UTP` (wspolna funkcja)  
- rola kandydata: wspolny dispatcher lookup/load dla zasobow template (`UTC/UTP`)  
- pewnosc: srednia (strong string signal, brak dekompilacji ciala)

2. `FUN_00591a9c`  
- sygnal: `*.UTC` i `*.UTP`  
- rola kandydata: etap selection/resolve dla obu rozszerzen  
- pewnosc: srednia

3. `FUN_00593848`  
- sygnal: `*.UTC` i `*.UTP`  
- rola kandydata: kolejna warstwa parser/loader path dla template resources  
- pewnosc: srednia

4. `FUN_0059b858`  
- sygnal: `*.UTC` i `*.UTP`  
- rola kandydata: analogiczny etap load pipeline dla UT*  
- pewnosc: srednia

5. `FUN_005c675c`  
- sygnal: `*.UTC` i `*.UTP`  
- rola kandydata: parse/instantiate lane po resolve UT*  
- pewnosc: srednia

6. `FUN_005f5494`  
- sygnal: `*.UTC` i `*.UTP`  
- rola kandydata: downstream loader dla UT* (mozliwy branch object-type specific)  
- pewnosc: srednia

7. `FUN_007347f8`  
- sygnal: `*.UTC` i `*.UTP`  
- rola kandydata: wspolna pozna faza pipeline UT*  
- pewnosc: srednia

8. `FUN_007338c4`  
- sygnal: tylko `*.UTC`  
- rola kandydata: creature-specific lub UTC-only branch  
- pewnosc: srednia

9. `FUN_007342e8`  
- sygnal: tylko `*.UTP`  
- rola kandydata: placeable/door-specific lub UTP-only branch  
- pewnosc: srednia

10. `FUN_0072691c`  
- sygnal: `DefaultAreaProperties` (tag `are`)  
- rola kandydata: ARE area-properties init/default hydration (okolice area loadera)  
- pewnosc: srednia

## 1.2 Kandydaci architektoniczni (kotwice funkcjonalne z dokumentacji)

1. `CNWSArea::LoadArea`, `CNWSArea::LoadGIT`, `CNWSArea::LoadProperties`  
- rola: glowny orchestrator `ARE -> GIT -> object lanes`

2. `CResGFF::*` (`Initialize`, `GetTopLevelStruct`, `GetStructByIndex`)  
- rola: parser strukturalny GFF dla `ARE/GIT/UTC/UTP`

3. `CExoResMan::*` (`GetResObject`, `Demand`, `Release`, `Exists`)  
- rola: resource resolution/lifecycle przed parserem

4. `CNWSPlaceable::*` (`LoadPlaceable`, `CreateFromGff`)  
- rola: lane `UTP + GIT Placeable List` -> runtime placeable

5. `CNWSCreature::*` (`LoadCreature`, `CreateFromGff`)  
- rola: lane `UTC + GIT Creature List` (overlay instance over blueprint)

Uwaga: ta grupa ma wysoka wartosc kontraktowa, ale bez adresow `FUN_*` w obecnym eksporcie.

## 2. Mapa `string -> funkcja -> rola`

| String | Funkcja kandydujaca | Rola | Status |
|---|---|---|---|
| `*.UTC` | `FUN_004a3714`, `FUN_00591a9c`, `FUN_00593848`, `FUN_0059b858`, `FUN_005c675c`, `FUN_005f5494`, `FUN_007338c4`, `FUN_007347f8` | multi-stage loader/sciezka UTC | czesciowo zmapowane |
| `*.UTP` | `FUN_004a3714`, `FUN_00591a9c`, `FUN_00593848`, `FUN_0059b858`, `FUN_005c675c`, `FUN_005f5494`, `FUN_007342e8`, `FUN_007347f8` | multi-stage loader/sciezka UTP | czesciowo zmapowane |
| `DefaultAreaProperties` | `FUN_0072691c` | init/default area props w lane ARE | czesciowo zmapowane |
| `Door List` | brak bezposredniego `FUN_*` z obecnego TSV | expected: `CNWSArea::LoadGIT` + lane door parser | brak mappingu adresowego |
| `Placeable List` | brak bezposredniego `FUN_*` z obecnego TSV | expected: GIT list iterator + `CNWSPlaceable::*` | brak mappingu adresowego |
| `Creature List` | brak bezposredniego `FUN_*` z obecnego TSV | expected: GIT list iterator + `CNWSCreature::*` | brak mappingu adresowego |
| `AreaProperties` | brak bezposredniego `FUN_*` z obecnego TSV (poza `DefaultAreaProperties`) | expected: GIT area metadata parser | brak mappingu adresowego |
| `LoadScreenID` / `LoadScreenId` | brak adresowej mapy `FUN_*` w tym eksporcie | expected: parser aliasow transition keys | brak mappingu adresowego |
| `LinkedToFlags` | brak adresowej mapy `FUN_*` w tym eksporcie | expected: door/trigger transition parser | brak mappingu adresowego |
| `GetResObject` | brak zrzutu adresow w aktualnym TSV | resolver entrypoint | brak mappingu adresowego |
| `Demand` | brak zrzutu adresow w aktualnym TSV | resource acquire przed parse | brak mappingu adresowego |
| `GetTopLevelStruct` | brak zrzutu adresow w aktualnym TSV | GFF top-level traversal | brak mappingu adresowego |
| `GetStructByIndex` | brak zrzutu adresow w aktualnym TSV | iteracja list (`Door/Placeable/Creature`) | brak mappingu adresowego |

## 3. Braki informacyjne wymagajace dodatkowej dekompilacji celowanej

## 3.1 Priorytet P0 (blokuje domkniecie kontraktu ARE/GIT)

1. Brak twardej mapy `GIT` loadera do realnych `FUN_*`  
- symptom: w TSV dla `git` widoczny tylko wpis noise (`DelayLoad_GetProcessDpiAwareness`)  
- cel dekompilacji: namierzyc realna funkcje odpowiadajaca za `Door List`, `Placeable List`, `Creature List`, `AreaProperties`  
- metoda: string-xref hunt po `Door List`, `Placeable List`, `Creature List`, `AreaProperties`, potem callgraph do orchestratora.

2. Brak mapy `ARE` parsera poza `DefaultAreaProperties`  
- symptom: tylko `FUN_0072691c` z sygnalem default props  
- cel dekompilacji: dojsc do `LoadArea` i petli `Tile_List`, walidacji `Width*Height`, powiazania z `GIT`.

3. Brak potwierdzenia funkcji alias policy dla `LoadScreenID/LoadScreenId` i `LinkedToFlags`  
- symptom: kontrakty R63/R65 definiuja policy, ale brak adresowej mapy w `nwtoolset.exe` eksporcie  
- cel dekompilacji: wskazac konkretna funkcje parsera kluczy transition i potwierdzic `last-wins`/numeric parse branches.

## 3.2 Priorytet P1 (domkniecie lane UTC/UTP -> placeable/creature)

1. Rozdzielenie UT* sygnalow od false positives  
- symptom: czesc wpisow `utp` to ewidentny noise (np. OpenGL/debug strings)  
- cel dekompilacji: odfiltrowac funkcje niezwiazane z object contracts i zostawic realny loader chain.

2. Brak przypisania UT* etapow do typu obiektu (`creature` vs `placeable`)  
- symptom: wiele funkcji wspolnych dla `*.UTC` i `*.UTP`  
- cel dekompilacji: potwierdzic branch condition, ktory finalnie prowadzi do `CNWSCreature::*` vs `CNWSPlaceable::*`.

3. Brak twardego lacznika `CExoResMan -> CResGFF -> CNWSArea/CNWS*` z adresami  
- symptom: dokumenty maja rodziny API, ale bez mapy `FUN_*`  
- cel dekompilacji: zbudowac adresowy call chain dla parsera/loadera end-to-end.

## 3.3 Proponowany minimalny pakiet dekompilacji celowanej (nastepny krok)

1. Start od stringow P0: `Door List`, `Placeable List`, `Creature List`, `AreaProperties`, `LoadScreenID`, `LinkedToFlags`.  
2. Dla kazdego stringa: zapisac `xref -> FUN_* -> caller/callee -> rola`.  
3. Potem import anchors: `GetResObject`, `Demand`, `GetTopLevelStruct`, `GetStructByIndex` i domkniecie call chaina do lane obiektowych.  
4. Wynik docelowy: jedna tabela adresowa `ARE/GIT/UTC/UTP` z confidence + policy impact (hard gate vs preserve-first).

## 4. Konkluzja R78

1. Najmocniej zmapowany obszar to lane `UTC/UTP` (zestaw kandydatow `FUN_004a3714` ... `FUN_007347f8`).  
2. Najwieksza luka dotyczy `GIT` i bezposrednich list obiektowych (`Door/Placeable/Creature`) - tu brak twardych adresow parsera w aktualnym eksporcie.  
3. Do domkniecia kontraktow area/object potrzebna jest celowana dekompilacja P0 po stringach list GIT i importach `CResGFF/CExoResMan`, a dopiero potem finalne mapowanie roli funkcji na backend contract gates.
