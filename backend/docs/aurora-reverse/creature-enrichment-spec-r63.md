# Creature Enrichment Spec R63

## 1. Scope
- Cel: mapping `UTC/2DA/TLK/HAK -> Creature Enrichment DTO + walidacje`.
- Zrodla: tylko lokalne artefakty reverse z `C:\Projects\nwn-last-city\Aurora\reverse`.
- Statusy dowodow: `CONFIRMED` (twarde), `INFERRED` (robocze/parity-risk).

## 2. Runtime facts, ktore wymuszaja kontrakt
1. `Creature List` z GIT jest zrodlem instancji (`area.cpp:336-337,537-541`) [CONFIRMED].
2. Kolejnosc overlay: najpierw UTC (blueprint), potem GIT instance (`creature.cpp:713-716`) [CONFIRMED].
3. `TemplateResRef` jest opcjonalny, bo load UTC jest optional (`creature.cpp:699-705`, `aurora/util.cpp:152-160`) [CONFIRMED].
4. Render wymaga poprawnego `Appearance_Type`; invalid blokuje `loadModel()` (`creature.cpp:598-601,849`) [CONFIRMED].
5. Transform instancji idzie z `X/Y/ZPosition` i `X/YOrientation` (`creature.cpp:719-729`) [CONFIRMED].
6. Brakujace pola GFF maja bezpieczne defaulty (`gff3file.h:215,219,221`, `gff3file.cpp:433-437,511-514,524-529`) [CONFIRMED].

## 3. DTO contract (proposed v0.6.3-r63)

```ts
export type ValidationSeverity = "ERROR" | "WARN" | "INFO";

export interface ValidationIssueDto {
  code: string;
  severity: ValidationSeverity;
  message: string;
  source: "UTC" | "GIT" | "2DA" | "TLK" | "HAK" | "RUNTIME";
  fieldPath?: string;
  evidence?: string;
}

export interface LocStringDto {
  strRef: number | null;              // null dla kStrRefInvalid
  inlineByLanguageId: Record<string, string>;
  resolvedText: string;               // po logice LocString::getString()
  resolvedFrom: "inline" | "tlk_alt" | "tlk_main" | "empty";
}

export interface CreatureRuntimeDto {
  templateResRef: string;
  tag: string;
  conversation: string;
  appearanceType: number | null;
  gender: number | null;
  race: number | null;
  subrace: string;
  phenotype: number | null;
  portraitId: number | null;
  portraitResRef: string;
  soundSetFile: number | null;
  position: { x: number; y: number; z: number };
  orientation: { x: number; y: number; bearingDegrees: number };
  bodyParts: Record<string, number | null>;
  colors: {
    skin: number | null;
    hair: number | null;
    tattoo1: number | null;
    tattoo2: number | null;
  };
  faction: {
    value: number | null;
    sourceKey: "FactionID" | "FactionId" | "Faction" | "unknown";
  };
  wingsNew: number | null;            // preserve-first (runtime gap)
  tailNew: number | null;             // preserve-first (runtime gap)
}

export interface Creature2daDto {
  appearance: {
    rowIndex: number | null;
    modelType: string;
    raceModel: string;
    portrait2da: string;
    envMap: string;
  };
  phenotype: {
    rowIndex: number | null;
    defaultPhenotype: string;
  };
  racialtypes: {
    rowIndex: number | null;
    appearanceRow: number | null;
    converNameStrRef: number | null;
    converNameLowerStrRef: number | null;
    namePluralStrRef: number | null;
  };
  classes: Array<{
    classId: number;
    nameStrRef: number | null;
    lowerStrRef: number | null;
    pluralStrRef: number | null;
  }>;
  portraits: {
    rowIndex: number | null;
    baseResRef: string;
  };
}

export interface CreatureTlkDto {
  firstName: LocStringDto;
  lastName: LocStringDto;
  description: LocStringDto;
  derivedLabels: {
    raceName: string;
    raceNameLower: string;
    raceNamePlural: string;
    classNames: string[];
  };
  talkTableContext: {
    mainTables: ["dialog", "dialogf"];
    customAltTable: string;           // Mod_CustomTlk (bez rozszerzenia) lub ""
    altMaskHex: "0xFF000000";
  };
}

export interface CreatureHakDto {
  moduleArchivePriority: 1000;
  premiumModuleHakPriority?: 1001;
  moduleHakListFromIfo: string[];     // po normalizacji i kolejnosci runtime
  indexedHakPriorities: number[];     // 1002 + i
  customTlk: string;                  // Mod_CustomTlk
  sourceLayers: Array<{
    layer: string;
    priority: number;
  }>;
}

export interface CreatureEnrichmentDto {
  schema: "aurora-creature-enrichment";
  version: "0.6.3-r63";
  creatureKey: {
    areaResRef: string;
    gitIndex: number;
    templateResRef: string;
    tag: string;
  };
  runtime: CreatureRuntimeDto;
  utcResolved: boolean;
  twoDa: Creature2daDto;
  tlk: CreatureTlkDto;
  hak: CreatureHakDto;
  preserveRaw: Record<string, unknown>;
  validationIssues: ValidationIssueDto[];
}
```

## 4. Mapping: UTC -> DTO

| UTC/GIT field | DTO path | Rule |
|---|---|---|
| `TemplateResRef` | `runtime.templateResRef` | Czytaj z instance; gdy niepuste probuj optional UTC (`creature.cpp:699-705`). |
| `Appearance_Type` | `runtime.appearanceType` | Hard-gate renderu; invalid => `loadModel` early return (`creature.cpp:598-601,849`). |
| `XPosition/YPosition/ZPosition` | `runtime.position` | Zawsze z GIT instance (`creature.cpp:719-721`). |
| `XOrientation/YOrientation` | `runtime.orientation` | Kanoniczne osie; `bearingDegrees = -atan2(x,y)` (`creature.cpp:725-729`). |
| `Tag` | `runtime.tag` | Optional z fallbackiem (`creature.cpp:749`). |
| `Conversation` | `runtime.conversation` | Optional z fallbackiem (`creature.cpp:765`). |
| `FirstName/LastName/Description` | `tlk.firstName/lastName/description` | GFF LocString (`creature.cpp:753-761`). |
| `Gender/Race/Subrace/Phenotype` | `runtime.gender/race/subrace/phenotype` | Optional identity bundle (`creature.cpp:775-783,850`). |
| `PortraitId/Portrait` | `runtime.portraitId/portraitResRef` | `PortraitId` -> portraits.2da; fallback `Portrait` (`creature.cpp:871-881`). |
| `SoundSetFile` | `runtime.soundSetFile` | Optional (`creature.cpp:769`). |
| `BodyPart_*`, `ArmorPart_RFoot` | `runtime.bodyParts` | Konsumowane przez runtime (`creature.cpp:733-743,853-856`). |
| `Color_*` | `runtime.colors.*` | Konsumowane przez runtime (`creature.cpp:859-862`). |
| `ClassList/SkillList/FeatList/Equip_ItemList` | `runtime` (opcjonalne listy) | Parse tylko gdy istnieja (`creature.cpp:809-830,885-903`). |
| `Wings_New/Tail_New` | `runtime.wingsNew/tailNew` | Preserve-first; brak bezposredniego konsumenta w NWN runtime path [INFERRED]. |

Dodatkowa regula overlay:
- `utcResolved=true` gdy UTC znalezione i sparsowane; potem i tak instance nadpisuje blueprint (`creature.cpp:713-716`).

## 5. Mapping: 2DA -> DTO

| 2DA | DTO path | Rule |
|---|---|---|
| `appearance.2da` | `twoDa.appearance.*` | Row z `appearanceType`; czytaj `MODELTYPE`, `RACE`, `PORTRAIT`, `ENVMAP` (`creature.cpp:603-610,644`). |
| `phenotype.2da` | `twoDa.phenotype.*` | Row z `phenotype`; fallback `DefaultPhenoType` (`creature.cpp:515,520,526`). |
| `racialtypes.2da` | `twoDa.racialtypes.*` | Row z `race`; mapa race->appearance + strref labels (`creature.cpp:513-514,916-928`). |
| `classes.2da` | `twoDa.classes[]` + `tlk.derivedLabels.classNames` | Z `ClassList.classId` pobieraj `Name/Lower/Plural` strref (`creature.cpp:979-995,1197`). |
| `portraits.2da` | `twoDa.portraits.*` | `PortraitId` -> `BaseResRef` (`creature.cpp:874`). |

Wazne zachowanie parsera 2DA:
- `TwoDARegistry::get2DA()` rzuca exception gdy brak tabeli (`2dareg.cpp:138-144`).
- `TwoDAFile::getRow(idx)` przy out-of-range zwraca pusty row (`2dafile.cpp:423-428`), a komorki moga dawac defaulty (`2dafile.cpp:61-99`).
- Dlatego walidacja musi sprawdzac row index jawnie (`0 <= idx < getRowCount`) przed odczytem semantycznym.

## 6. Mapping: TLK -> DTO

| TLK concept | DTO path | Rule |
|---|---|---|
| LocString StrRef (`kStrRefInvalid=0xFFFFFFFF`) | `LocStringDto.strRef` | Invalid mapuj na `null` (`types.h:447`, `locstring.cpp:107-111`). |
| Inline localized strings | `LocStringDto.inlineByLanguageId` | Przechowuj wszystkie stringi z LocString. |
| Resolved text | `LocStringDto.resolvedText` | Kolejnosc: inline current lang -> swapped gender -> TLK strref -> first string -> empty (`locstring.cpp:121-138`). |
| Main TLK | `tlk.talkTableContext.mainTables` | `dialog/dialogf` (`nwn.cpp:274`). |
| Custom module TLK | `tlk.talkTableContext.customAltTable` | `Mod_CustomTlk` z IFO i `TalkMan.addTable(..., isAlt=true)` (`ifofile.cpp:138`, `module.cpp:586-590`). |
| Alt-table bit | `tlk.talkTableContext.altMaskHex` | High byte `0xFF000000`: szukaj alt tables, potem main (`talkman.cpp:178-194`). |

## 7. Mapping: HAK -> DTO

| HAK concept | DTO path | Rule |
|---|---|---|
| `Mod_HakList` + `Mod_Hak` | `hak.moduleHakListFromIfo` | IFO loader dodaje przez `insert(begin, ...)`, wiec lista jest runtime-ordered wg loadera (`ifofile.cpp:144-154`). |
| Weryfikacja istnienia HAK | `validationIssues` | Brak wymaganej paczki => exception (`module.cpp:210-215`). |
| Indeksowanie HAK | `hak.indexedHakPriorities` | `indexMandatoryArchive(haks[i] + ".hak", 1002 + i)` (`module.cpp:597-601`). |
| Modul i premium hak | `hak.moduleArchivePriority`, `premiumModuleHakPriority` | Modul `.mod/.nwm` ma 1000; premium main hak 1001 (`module.cpp:157,169`). |
| Global lookup priority | `hak.sourceLayers` | ResourceManager: wyzsza liczba = wyzszy priorytet (`resman.h:123-124,136,158,172`). |

Rekomendowany zapis `hak.sourceLayers` (xoreos-visible):
1. `module_hak_i` (1002+i)
2. `module_premium_hak` (1001, jesli dotyczy)
3. `module_archive` (1000)
4. `override_dir` (500, `nwn.cpp:268`)
5. `texturepacks` (400-403)
6. `game_keys` (10-17)
7. `base_db` (1)

## 8. Walidacje kontraktowe (must-have)

### 8.1 ERROR
1. `CREATURE_APPEARANCE_MISSING`
- Warunek: brak efektywnego `appearanceType` po overlay UTC->GIT.

2. `CREATURE_APPEARANCE_ROW_MISSING`
- Warunek: `appearanceType` poza zakresem `appearance.2da`.

3. `CREATURE_2DA_NOT_FOUND`
- Warunek: brak wymaganej tabeli (`appearance`, `racialtypes`; opcjonalnie `phenotype` tylko gdy potrzebne).

4. `CREATURE_HAK_REQUIRED_MISSING`
- Warunek: IFO wskazuje hak, ktorego nie ma lokalnie (`module.cpp:210-215`).

5. `CREATURE_POSITION_NOT_FINITE`
- Warunek: `x/y/z` albo `orientation.x/y` nie jest finite number.

### 8.2 WARN
1. `CREATURE_UTC_RESOLVE_FAILED`
- Warunek: `TemplateResRef` niepuste, ale UTC nieudane; runtime moze dzialac z instance-only.

2. `CREATURE_ORIENTATION_ZERO_VECTOR`
- Warunek: `xOrientation==0 && yOrientation==0` (bearing niejednoznaczny runtimeowo).

3. `CREATURE_TLK_STRREF_NOT_FOUND`
- Warunek: strref ustawiony, ale brak wpisu w alt/main TLK.

4. `CREATURE_PORTRAIT_LOOKUP_MISSING`
- Warunek: `PortraitId` ustawione, brak row w `portraits.2da` i brak fallback `Portrait`.

5. `CREATURE_FACTION_ALIAS_AMBIGUOUS`
- Warunek: jednoczesnie wystepuje wiecej niz jeden alias (`FactionID/FactionId/Faction`) z roznymi wartosciami.

### 8.3 INFO
1. `CREATURE_WINGS_TAIL_RUNTIME_GAP`
- Warunek: `Wings_New` lub `Tail_New` obecne; obecny NWN runtime path ich nie konsumuje bezposrednio [INFERRED].

2. `CREATURE_OPTIONAL_LIST_ABSENT`
- Warunek: brak `ClassList/SkillList/FeatList/Equip_ItemList`.

3. `CREATURE_SOURCE_GIT_ONLY`
- Warunek: brak UTC, enrichment oparty tylko o instance/GIT.

## 9. Minimalny algorytm enrichment (deterministyczny)
1. Wczytaj instancje z `GIT Creature List`.
2. Odczytaj `TemplateResRef`; sproboj optional UTC.
3. Zastosuj overlay `UTC potem GIT`.
4. Wylicz `runtime` (including bearing z `X/YOrientation`).
5. Rozwiaz 2DA (`appearance`, `racialtypes`, opcjonalnie `phenotype`, `classes`, `portraits`).
6. Rozwiaz LocString/TLK (main + custom alt).
7. Zbuduj HAK provenance z `Mod_HakList/Mod_Hak` i priorytetow runtime.
8. Uruchom walidacje i dolacz `validationIssues`.

## 10. Notes implementacyjne
- Preserve-first: nie tracic nieznanych kluczy oraz aliasow (szczegolnie faction/flags).
- Nie zakladac, ze brak UTC to blad krytyczny.
- Nie opierac walidacji 2DA na samych defaultach `getRow/getString/getInt`; wymagane jawne sprawdzanie istnienia row.
- `Encounter` spawn semantics (`cbSpawnOption/eRespawns`) poza zakresem tego DTO (read-only preserve).

## 11. Evidence index (najwazniejsze)
- `C:\Projects\nwn-last-city\Aurora\reverse\creatures_ultra\02_utc_schema.md`
- `C:\Projects\nwn-last-city\Aurora\reverse\creatures_ultra\02_utc_fields_matrix.csv`
- `C:\Projects\nwn-last-city\Aurora\reverse\creatures_ultra\03_2da_dependencies.md`
- `C:\Projects\nwn-last-city\Aurora\reverse\creatures_ultra\03_2da_effects.csv`
- `C:\Projects\nwn-last-city\Aurora\reverse\creatures_ultra\06_impl_contract_seed.md`
- `C:\Projects\nwn-last-city\Aurora\reverse\creatures_ultra\06_toolset_mapping.md`
- `C:\Projects\nwn-last-city\Aurora\reverse\xoreos\src\engines\nwn\creature.cpp`
- `C:\Projects\nwn-last-city\Aurora\reverse\xoreos\src\engines\nwn\area.cpp`
- `C:\Projects\nwn-last-city\Aurora\reverse\xoreos\src\aurora\ifofile.cpp`
- `C:\Projects\nwn-last-city\Aurora\reverse\xoreos\src\engines\nwn\module.cpp`
- `C:\Projects\nwn-last-city\Aurora\reverse\xoreos\src\engines\nwn\nwn.cpp`
- `C:\Projects\nwn-last-city\Aurora\reverse\xoreos\src\aurora\talkman.cpp`
- `C:\Projects\nwn-last-city\Aurora\reverse\xoreos\src\aurora\locstring.cpp`
- `C:\Projects\nwn-last-city\Aurora\reverse\xoreos\src\aurora\2dareg.cpp`
- `C:\Projects\nwn-last-city\Aurora\reverse\xoreos\src\aurora\2dafile.cpp`
- `C:\Projects\nwn-last-city\Aurora\reverse\xoreos\src\aurora\resman.h`
