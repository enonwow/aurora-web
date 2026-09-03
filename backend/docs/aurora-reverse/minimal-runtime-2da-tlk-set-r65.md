# Minimal Runtime 2DA/TLK Set (R65)

> **External GPL quarantine (2026-08-17):** Historical xoreos paths and
> observations in this document are not admitted evidence and must not support
> implementation or runtime claims. See
> `xoreos-gpl-legacy-reference-quarantine-2026-08-17.md`.

Data: 2026-05-24  
Status: Draft (P0/P1 runtime baseline)  
Zakres: minimalny zestaw 2DA/TLK wymagany do poprawnego processingu `placeable`, `creature`, `area` w backendzie, z deterministycznym fallback chain i walidacja brakow.

## 1. Evidence base (Aurora reverse)

1. `C:\Projects\nwn-last-city\Aurora\reverse\docs\Placeables\AURORA_RE_PLACEABLE_OBJECT_PROPERTIES_2026-05-18.md:70,184`  
   - `Appearance` placeable -> `placeables.2da`; `LocName/Description` jako locstring.
2. `C:\Projects\nwn-last-city\Aurora\reverse\docs\Core\LC_AURORA_RE_KNOWLEDGE_BASE.md:1268`  
   - Dzwieki interakcji placeable z `placeableobjsnds.2da` (`Opened/Closed/Destroyed/Used/Locked`).
3. `C:\Projects\nwn-last-city\Aurora\reverse\creatures_ultra\03_2da_dependencies.md:8,13,27,31,35`  
   - Core creature dependencies: `appearance.2da`, `phenotype.2da`, `gender.2da`, `racialtypes.2da`, `portraits.2da`.
4. `C:\Projects\nwn-last-city\Aurora\reverse\docs\Core\LC_AURORA_RE_KNOWLEDGE_BASE.md:1149,1337,1427,1428,2411,3516`  
   - Area/audio przez `ambientsound.2da`; tile naming przez `tiles.2da` i `metatiles.2da`.
5. `C:\Projects\nwn-last-city\Aurora\reverse\docs\Core\LC_AURORA_RE_KNOWLEDGE_BASE.md:1147`  
   - Tileset `DisplayName` jest TLK `strref`.
6. `C:\Projects\nwn-last-city\Aurora\reverse\xoreos\src\aurora\ifofile.cpp:138`  
   - `Mod_CustomTlk` jest czytane z IFO.
7. `C:\Projects\nwn-last-city\Aurora\reverse\xoreos\src\engines\nwn\module.cpp:590`  
   - Custom TLK ladowane jako para `tlk/tlkf` przez `TalkMan.addTable(..., true, ...)`.
8. `C:\Projects\nwn-last-city\Aurora\reverse\xoreos\src\engines\nwn\nwn.cpp:274` i `...\nwn2\nwn2.cpp:346`  
   - Bazowe TLK to `dialog/dialogf`.
9. `C:\Projects\nwn-last-city\Aurora\reverse\xoreos\src\aurora\talkman.cpp:179`  
   - Alt-table TLK routing przez bit mask `0xFF000000`.
10. `C:\Projects\nwn-last-city\Aurora\reverse\docs\Core\WEB_AURORA_TECH_STRATEGY.md:625`  
    - Resolver read order: module directory -> packed module -> ordered HAK -> vanilla KEY/BIF.
11. `C:\Projects\nwn-last-city\Aurora\reverse\xoreos\src\engines\nwn\module.cpp:169,157,601`  
    - Priorytety warstwy modulowej: module archive `1000`, premium hak `1001`, module hak list `1002+i`.

## 2. Canonical fallback chain (P0)

## 2.1 Resource-layer chain (2DA/TLK files)

Backend MUSI rozwiazywac pliki 2DA/TLK w stalej kolejnosci:
1. `module_decompiled`
2. `module_packed`
3. `hak` (kolejnosc efektywna z `Mod_HakList`/`Mod_Hak`)
4. `vanilla KEY/BIF`

Kontrakt:
- `first-hit-wins` na poziomie pliku zasobu (np. `appearance.2da`).
- Po wybraniu konkretnego pliku 2DA backend NIE schodzi do nizszej warstwy przy brakujacym wierszu; brak row to walidacja danych, nie kolejny resource lookup.
- Dla kazdego resolve MUSI byc emitowane `sourceProvenance`.

## 2.2 TLK chain

1. Odczyt `Mod_CustomTlk` z IFO (jesli ustawione).
2. Ladowanie custom TLK jako para `custom/customf` (alt-table).
3. Ladowanie bazowej pary `dialog/dialogf`.
4. Resolve tekstu:
- najpierw locstring inline,
- potem TLK alt/base przez `strref`,
- gdy brak wpisu: preserve `strref` + substrings (bez destrukcyjnego flatten).

## 3. Minimalny runtime set 2DA/TLK (P0/P1)

## 3.1 PLACEABLE

| Source | Priorytet | Dlaczego minimalne | Brak (walidacja/fallback) |
|---|---|---|---|
| `placeables.2da` | P0 | `Appearance` placeable mapuje sie do runtime definicji modelu/typu | `P0_MISSING_SOURCE` lub `P0_ROW_MISSING`; preserve raw `Appearance`; blokada sciezek wymagajacych semantyki runtime |
| `placeableobjsnds.2da` | P1 | mapowanie `Opened/Closed/Destroyed/Used/Locked` | `P1_UNRESOLVED_REFERENCE`; preserve raw sound IDs |
| `TLK` (`custom+base`) | P1 | `LocName/Description` resolution | `P1_TLK_UNRESOLVED`; zwracaj `strref` + inline substrings |

## 3.2 CREATURE

| Source | Priorytet | Dlaczego minimalne | Brak (walidacja/fallback) |
|---|---|---|---|
| `appearance.2da` | P0 | `Appearance_Type` -> runtime model pipeline | `P0_MISSING_SOURCE` / `P0_ROW_MISSING`; preserve raw ID, fail dla runtime-dependent enrichment |
| `gender.2da` | P0 | required w czesci pipeline parts dla `MODELTYPE=P` | `P0_MISSING_SOURCE`; preserve-first, bez synthetic defaults |
| `racialtypes.2da` | P0 | race -> appearance/race mapping | `P0_MISSING_SOURCE` / `P0_ROW_MISSING` |
| `phenotype.2da` | P0 | phenotype parts + fallback `DefaultPhenoType` | `P0_MISSING_SOURCE` / `P0_ROW_MISSING`; fallback lokalny do `DefaultPhenoType` jesli row obecny |
| `portraits.2da` | P1 | `PortraitId` -> `BaseResRef` | `P1_UNRESOLVED_REFERENCE`; preserve raw `PortraitId` |
| `TLK` (`custom+base`) | P1 | imie/opis/race labels ze `strref` | `P1_TLK_UNRESOLVED`; preserve `strref` i locstring |

## 3.3 AREA

| Source | Priorytet | Dlaczego minimalne | Brak (walidacja/fallback) |
|---|---|---|---|
| `ambientsound.2da` | P0 | `AmbientSndDay/Night` -> ambient profile mapping | `P0_MISSING_SOURCE` / `P0_ROW_MISSING`; preserve raw IDs + hard diagnostic |
| `tiles.2da` | P1 | normal tile model naming (`TileSet`, `Tile_Type`, `Variation+1`) | `P1_UNRESOLVED_REFERENCE`; preserve raw tile fields + missing-model diagnostic |
| `metatiles.2da` | P1 | metatile model naming (`TileSet`, `Name`) | `P1_UNRESOLVED_REFERENCE`; preserve raw meta fields + missing-model diagnostic |
| `TLK` (`custom+base`) | P1 | tileset `DisplayName` (strref) | `P1_TLK_UNRESOLVED`; zwracaj `strref` bez cichej podmiany |

## 4. Missing-validation contract (P0/P1)

## 4.1 Kody

- `P0_MISSING_SOURCE` - brak wymaganej tabeli 2DA/TLK pair do processingu.
- `P0_ROW_MISSING` - brak wymaganego wiersza P0 w znalezionej tabeli.
- `P1_UNRESOLVED_REFERENCE` - brak tabeli/wiersza P1, backend kontynuuje preserve-first.
- `P1_TLK_UNRESOLVED` - `strref` nie rozwiazany w custom/base TLK.
- `P0_PROFILE_ALIAS_CONFLICT` - konflikt aliasow profile-specific (np. `AmbientSndNitVol` vs `AmbientSndNightVol`) w trybie strict.

## 4.2 Reguly wykonania

1. P0 miss => `hard fail` dla semantyki runtime zaleznej od danego lookupu.
2. P1 miss => `soft fail`, ale zawsze z diagnostyka i zachowaniem raw IDs.
3. Wszystkie misses MUSZA zawierac:
- `entityType` (`placeable|creature|area`),
- `resourceName` (np. `appearance.2da`),
- `lookupKey` (row id / strref),
- `sourceProvenance` i `hakPriorityEffective`.

## 4.3 Alias policy (area audio)

- Dla corpus LC canonical ingest: `AmbientSndNitVol`.
- Cross-profile kompatybilnosc: dual-key read/write (`AmbientSndNitVol` + `AmbientSndNightVol`).
- `nwn` path: czyta `AmbientSndNightVol`; `nwn2` path: czyta `AmbientSndNitVol`.

## 5. Runtime checklist (implementacyjna)

1. Utrzymac deterministyczny chain: `module_decompiled -> module_packed -> hak -> vanilla`.
2. Emitowac `sourceProvenance` dla kazdego resolve 2DA/TLK.
3. Emitowac `hakPriorityEffective` i `hakPrioritySource` w payloadach diagnostycznych.
4. Rozdzielic severity: P0 hard-fail vs P1 preserve-first.
5. Nie flattenowac locstring przy brakach TLK; zwracac `strref` + inline substrings.
6. Dla P1 unresolved zwracac jednoczesnie raw ID i (jesli dostepne) resolved label.

## 6. Poza minimalnym setem (intencjonalnie)

Poza R65 minimal runtime set zostaja m.in. `classes.2da`, `creaturespeed.2da`, `ambientmusic.2da`, `loadscreens.2da` i inne tabele helperowe - sa przydatne dla enrichment/preview, ale nie sa wymagane do bazowego, poprawnego processingu P0/P1 placeable/creature/area.
