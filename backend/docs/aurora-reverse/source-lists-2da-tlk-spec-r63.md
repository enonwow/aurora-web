# Source Lists 2DA/TLK Spec (R63)

Data: 2026-05-24
Status: Draft for backend ingest/read contracts
Zakres: krytyczne zrodla 2DA/TLK dla `placeable`, `creature`, `area`, wraz z priorytetami i fallbackami backendu.

## 1. Evidence base (Aurora reverse)

1. `C:\Projects\nwn-last-city\Aurora\reverse\docs\Placeables\AURORA_RE_PLACEABLE_OBJECT_PROPERTIES_2026-05-18.md:68-70,184,196`
2. `C:\Projects\nwn-last-city\Aurora\reverse\creatures_ultra\03_2da_dependencies.md:8-55`
3. `C:\Projects\nwn-last-city\Aurora\reverse\creatures_ultra\03_2da_effects.csv:2-19`
4. `C:\Projects\nwn-last-city\Aurora\reverse\docs\VFX-MDL-SHD\AURORA_RE_CREATURE_MODEL_PIPELINE_2026-05-18.md:54-69,101-102,218-220`
5. `C:\Projects\nwn-last-city\Aurora\reverse\docs\Core\LC_AURORA_RE_KNOWLEDGE_BASE.md:1147,1149,1268,1337,1427-1428,2263,2411-2412,3392`
6. `C:\Projects\nwn-last-city\Aurora\reverse\refs\Tooling\nwtoolset_rcdata_report.json:1062-1086,1215,9803`
7. `C:\Projects\nwn-last-city\Aurora\reverse\docs\Core\WEB_AURORA_TECH_STRATEGY.md:625-627,1127,1142-1144,1177-1183`

## 2. Global source-resolution contract (backend)

## 2.1 Warstwa zasobow (P0)
Backend powinien rozwiazywac 2DA/TLK i zalezne zasoby w stalej kolejnosci:
1. `module_decompiled`
2. `module_packed`
3. `hak` wg `hakPriorityEffective`
4. `vanilla KEY/BIF`

Uzasadnienie: reverse backlog wskazuje ryzyko driftu przy niejawnych mix-source (`first-match-wins`) i wymaga jawnej provenance (`hakPriorityEffective`, `hakPrioritySource`).

## 2.2 TLK contract (P0)
1. Czytac `Mod_CustomTlk` z IFO, jesli obecny.
2. Traktowac TLK jako pare tablic: `tlk` + `tlkf` (`TalkMan.addTable(..., tlk + "f", ...)`).
3. Gdy custom TLK niedostepny: fallback do bazowej pary TLK i zachowanie surowego `strref`/`locstring` (bez destrukcyjnej normalizacji).

## 3. Krytyczne zrodla: PLACEABLE

| Source | Priorytet | Status dowodu | Backend usage | Fallback |
|---|---|---|---|---|
| `placeables.2da` | P0 | Confirmed | Mapowanie `Appearance` (UTP/GIT) na definicje placeable (typ/model) | Gdy brak wiersza: zachowac surowe `Appearance` ID + `unresolved_2da_row`; blokowac write operacje zmieniajace model |
| `placeableobjsnds.2da` | P1 | Confirmed | Dzwieki interakcji obiektu (`Opened/Closed/Destroyed/Used/Locked`) | Gdy brak: preserve-first ID dzwiekow, bez runtime claimu o odtwarzaniu |
| `TLK` (`custom` + base) | P1 | Confirmed | Rozwiazywanie `LocName`/`Description` (`CExoLocString` + `strref`) | Gdy brak wpisu TLK: zwracac `strref` i payload locstring bez utraty substrings |

## 4. Krytyczne zrodla: CREATURE

| Source | Priorytet | Status dowodu | Backend usage | Fallback |
|---|---|---|---|---|
| `appearance.2da` | P0 | Confirmed | `Appearance_Type` -> `MODELTYPE`, `RACE`, `PORTRAIT`, `ENVMAP` | Brak wiersza: preserve `Appearance_Type` + hard diagnostic |
| `gender.2da` | P0 | Confirmed | Czesciowe skladanie modelu (`MODELTYPE=P`) | Brak row: fallback do preserve-only, bez synthetic defaults |
| `racialtypes.2da` | P0 | Confirmed | Race mapping -> `Appearance`/`RACE` | Brak row: preserve race id + diagnostic |
| `phenotype.2da` | P0 | Confirmed | Phenotype parts + `DefaultPhenoType` fallback | Gdy supermodel brak: fallback do `DefaultPhenoType` |
| `portraits.2da` | P1 | Confirmed | `PortraitId` -> `BaseResRef` | Brak row: preserve id, bez fake portrait |
| `classes.2da` | P2 | Confirmed | Label/class helper surfaces | Brak row: preserve class id |
| `creaturespeed.2da` | P2 | Confirmed (engine-specific) | Walk/run rates w profilach gdzie aktywne | Brak row: preserve speed token + runtime_domain_unknown |
| `capart.2da` | P2 | Inferred/latent | Mapowanie `MDLNAME -> NODENAME` (docelowo) | Aktualny fallback: statyczne tablice runtime (bez dynamicznego read) |
| `wingmodel.2da`, `tailmodel.2da` | P2 | Inferred (open) | `Wings_New`/`Tail_New` mapowanie | Do czasu hard-confirm: preserve-first wartosci surowe |
| `TLK` (`custom` + base) | P1 | Confirmed | Imie/opis creature (locstring/strref) | Gdy brak wpisu: zachowac `strref` i substrings |

## 5. Krytyczne zrodla: AREA

| Source | Priorytet | Status dowodu | Backend usage | Fallback |
|---|---|---|---|---|
| `ambientsound.2da` | P0 | Confirmed | `AmbientSndDay/Night` -> ambient profile map + volume transform | Brak row: preserve numeric id + `area_audio_unresolved_2da` |
| `tiles.2da` | P1 | Confirmed (NWN2 path) | Budowa normal tile model name (`TileSet`, `Tile_Type`, `Variation+1`) | Brak row: preserve tile tokeny + missing-model diagnostic |
| `metatiles.2da` | P1 | Confirmed (NWN2 path) | Budowa meta-tile model name (`TileSet`, `Name`) | Brak row: preserve meta tokeny + missing-model diagnostic |
| `TLK` (`custom` + base) | P1 | Confirmed | Tileset `DisplayName` przez TLK `strref` | Brak wpisu: pokazac `strref` bez cichej podmiany tekstu |
| `ambientmusic.2da` | P1 | Inferred (tooling + strategy) | Music day/night/battle IDs z `AreaProperties` | Do hard-confirm: preserve-first IDs + provenance flag |
| `loadscreens.2da` | P2 | Inferred/open | `LoadScreenID` surfaces (area/transition tooling) | Do hard-confirm: preserve-only, bez runtime semantyki |

## 6. Profile-aware fallback rules (must-have)

1. `AmbientSndNitVol` vs `AmbientSndNightVol`:
- ingest canonical dla corpus LC: `AmbientSndNitVol`.
- compatibility alias read/write: oba klucze preserve-first.
- profile marker: `nwn` czyta `...NightVol`, `nwn2` czyta `...NitVol`.

2. `locstring` safety:
- brak destrukcyjnej zamiany na plain text bez policy; zachowac `strref` + localized substrings.

3. Missing 2DA row policy:
- P0 source missing -> fail fast dla sciezek wymagajacych semantyki runtime.
- P1/P2 source missing -> degrade do preserve-first + explicit diagnostic code.

## 7. Minimalna lista implementacyjna backendu

1. Dodac `sourceProvenance` dla kazdego lookupu 2DA/TLK (`module_decompiled|module_packed|hak|vanilla`).
2. Emitowac `hakPriorityEffective` i `hakPrioritySource` w payloadach diagnostycznych/manifest.
3. Rozdzielic severity:
- `P0_MISSING_SOURCE` (hard fail),
- `P1_P2_UNRESOLVED_REFERENCE` (soft, preserve-first).
4. Utrzymac profile-aware alias handling dla `AmbientSndNitVol/NightVol`.
5. Dla `placeable/creature/area` zwracac surowe ID + resolved label (jesli lookup udany), zamiast nadpisywac surowe wartosci.
