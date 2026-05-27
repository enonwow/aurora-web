# Reverse Findings R79: Binary Format Clues Extraction (ARE/GIT/UTC/UTP + HAK/TLK/2DA)

Data: 2026-05-24
Rola: Agent R4
Zakres: analiza read-only artefaktow eksportu dostepnych w repo (`xrefs_domain_mapped.tsv`) oraz pakietow analitycznych R78.

## 1. Material i metoda

Zrodla:
- `backend/docs/aurora-reverse/xrefs_domain_mapped.tsv`
- `backend/docs/aurora-reverse/reverse-findings-area-object-contracts-r78.md`
- `backend/docs/aurora-reverse/reverse-findings-resource-pipeline-r78.md`

Kryteria klasyfikacji funkcji jako parser/deserializer:
1. Bezposredni sygnal string-xref dla rozszerzen/pliku (`*.UTC`, `*.UTP`, `2DAName`, `dialog.tlk`, `Mod_HakList`, `Mod_CustomTlk`).
2. Powtarzalnosc w wielu wpisach xref dla tej samej funkcji.
3. Zgodnosc z kontraktami R63 (lane `ARE/GIT/UTC/UTP` oraz listy `hak/tlk/2da`).
4. Odrzucenie oczywistego noise (np. OpenGL/debug strings oznaczone pod `utp`).

Skala pewnosci:
- `Bardzo wysoka`: 0.95-1.00
- `Wysoka`: 0.85-0.94
- `Srednia`: 0.70-0.84
- `Niska`: <0.70

## 2. Kandydaci parser/deserializer i kontrakty serializacji

| Funkcja | Adres | Typ roli | Wskazowka binarna/serializacyjna | Kontrakt | Pewnosc |
|---|---:|---|---|---|---:|
| `FUN_005b5bc4` | `0x005B5BC4` | deserializer | xrefy `Mod_CustomTlk`, `Mod_HakList`, `Mod_Hak_*` | read `Module.IFO` (hak/tlk listy) | 0.96 |
| `FUN_005bb574` | `0x005BB574` | serializer | xrefy zapisu `Mod_CustomTlk`, `Mod_HakList`, `Mod_Entry_*`, `Mod_Expan_List` | write `Module.IFO` (round-trip) | 0.97 |
| `FUN_004a3714` | `0x004A3714` | parser dispatcher | wspolny sygnal `*.UTC` i `*.UTP` | wspolny etap wejscia UT* | 0.84 |
| `FUN_00591a9c` | `0x00591A9C` | parser stage | `*.UTC` + `*.UTP` | etap resolve/select UT* | 0.82 |
| `FUN_00593848` | `0x00593848` | parser stage | `*.UTC` + `*.UTP` | etap parse/load UT* | 0.81 |
| `FUN_0059b858` | `0x0059B858` | parser stage | `*.UTC` + `*.UTP` | etap parse/load UT* | 0.80 |
| `FUN_005c675c` | `0x005C675C` | parser/deserializer stage | `*.UTC` + `*.UTP` | pozniejszy etap hydracji UT* | 0.80 |
| `FUN_005f5494` | `0x005F5494` | parser/deserializer stage | `*.UTC` + `*.UTP` | downstream loader UT* | 0.79 |
| `FUN_007347f8` | `0x007347F8` | parser tail stage | `*.UTC` + `*.UTP` | finalizacja wspolnej sciezki UT* | 0.78 |
| `FUN_007338c4` | `0x007338C4` | parser branch | sygnal tylko `*.UTC` | branch creature/UTC | 0.79 |
| `FUN_007342e8` | `0x007342E8` | parser branch | sygnal tylko `*.UTP` | branch placeable/UTP | 0.79 |
| `FUN_0072691c` | `0x0072691C` | area init/hydration | sygnal `DefaultAreaProperties` (tag `are`) | czesc lane ARE (init defaultow) | 0.74 |
| `FUN_0057f8b8` | `0x0057F8B8` | resource bootstrap | xrefy `\hak` i `\tlk` | bootstrap search-path dla parserow | 0.93 |
| `FUN_00abcfec` | `0x00ABCFEC` | resource resolver | xrefy `HAKINSTALL`, `TLKINSTALL`, `TLKLOCINSTALL`, `data\tlk` | instalacyjne/fallback sciezki TLK/HAK | 0.89 |
| `FUN_005888f0` | `0x005888F0` | TLK loader/open | xref `Error: could not open dialog.tlk` | otwarcie i walidacja `dialog.tlk` | 0.90 |
| `FUN_005ce044` | `0x005CE044` | hak diagnostics layer | xref `ResourceInHak` | diagnostyka konfliktow HAK | 0.76 |
| `FUN_004818b0` | `0x004818B0` | 2DA resolver/loader | wielokrotne xrefy `2DAName` | lookup zasobu 2DA | 0.82 |
| `FUN_0052ede0` | `0x0052EDE0` | 2DA resolver/loader | wielokrotne xrefy `2DAName` | lookup zasobu 2DA | 0.80 |
| `FUN_00532174` | `0x00532174` | 2DA resolver/loader | wielokrotne xrefy `2DAName` | lookup zasobu 2DA | 0.80 |
| `FUN_00612a44` | `0x00612A44` | 2DA resolver/loader | xrefy `Equip2DA` | lookup specjalizowany 2DA | 0.78 |
| `FUN_004af534` | `0x004AF534` | format gate (mozliwy) | sygnal `HAK_V1.0` | prawdopodobny check/version gate HAK | 0.73 |
| `FUN_00541cd4` | `0x00541CD4` | format gate (mozliwy) | sygnal `HAK_V1.0` | prawdopodobny check/version gate HAK | 0.73 |

## 3. Kontrakty serializacji (wyekstrahowane)

### 3.1 `Module.IFO` (najmocniejszy kontrakt)
- Read path: `FUN_005b5bc4` deserializuje co najmniej `Mod_CustomTlk` i `Mod_HakList`.
- Write path: `FUN_005bb574` serializuje te same rodziny pol (`Mod_CustomTlk`, `Mod_HakList`) oraz `Mod_Entry_*`, `Mod_Expan_List`.
- Wniosek kontraktowy: istnieje potwierdzony round-trip read/write dla list hak/tlk na poziomie metadanych modulu.

### 3.2 `UTC/UTP` (pipeline wieloetapowy)
- Powtarzalny lancuch funkcji z sygnalem `*.UTC`/`*.UTP` wskazuje na staged parser pipeline, nie pojedynczy parser monolityczny.
- `FUN_007338c4` i `FUN_007342e8` wygladaja na branch type-specific (odpowiednio UTC-only i UTP-only).
- Wniosek kontraktowy: read-side `UT*` ma wspolny rdzen + rozgalezienie typowe dla obiektu.

### 3.3 `ARE/GIT`
- `ARE`: jedyny bezposredni sygnal eksportu to `FUN_0072691c` (`DefaultAreaProperties`) - to raczej init/hydration niz pelny parser.
- `GIT`: w dostepnym TSV brak wiarygodnych xrefow parsera list `Door/Placeable/Creature/AreaProperties`; wpis `git` mapuje sie na oczywisty noise (`DelayLoad_GetProcessDpiAwareness`).
- Wniosek kontraktowy: lane `GIT` nie jest jeszcze adresowo domkniety w aktualnym eksporcie.

## 4. Funkcje wygladajace na parsery/deserializatory (shortlist operacyjny)

Priorytet A (najmocniejsi kandydaci):
1. `FUN_005b5bc4` (IFO deserializer) - 0.96
2. `FUN_005bb574` (IFO serializer) - 0.97
3. `FUN_005888f0` (TLK open/load gate) - 0.90
4. `FUN_004818b0` / `FUN_0052ede0` / `FUN_00532174` (2DA lookup family) - 0.80-0.82

Priorytet B (UT* parser chain, srednia-wysoka):
1. `FUN_004a3714`
2. `FUN_00591a9c`
3. `FUN_00593848`
4. `FUN_0059b858`
5. `FUN_005c675c`
6. `FUN_005f5494`
7. `FUN_007347f8`
8. `FUN_007338c4` (UTC branch)
9. `FUN_007342e8` (UTP branch)

Priorytet C (format clues/gates do dopotwierdzenia):
1. `FUN_004af534` (`HAK_V1.0`)
2. `FUN_00541cd4` (`HAK_V1.0`)
3. `FUN_0072691c` (`DefaultAreaProperties`, ARE init)

## 5. Luki i ryzyko interpretacyjne

1. Brak twardego `FUN_*` mapowania parsera `GIT` w dostepnym eksporcie.
2. Dla `ARE` mamy tylko sygnal init defaultow, bez pelnego call-chain parsera `Tile_List`/`Width*Height`.
3. Czesc wpisow `utp` to noise (OpenGL/debug), dlatego kandydaci UT* ocenieni jako `srednia` zamiast `wysoka`.

## 6. Konkluzja R79

1. Najsilniej potwierdzony kontrakt serializacji to `Module.IFO` (read `FUN_005b5bc4` <-> write `FUN_005bb574`) z polami hak/tlk.
2. Dla `UTC/UTP` widoczny jest wieloetapowy lancuch parsera/deserializacji z branchami typowymi dla obiektu.
3. Dla `ARE/GIT` eksport zawiera niepelne wskazowki: `ARE` ma slaby sygnal init, `GIT` pozostaje bez wiarygodnego adresowego parsera w obecnym materiale.
