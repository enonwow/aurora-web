# Function Prioritization Catalog R71

Data: 2026-05-24
Rola: Agent B8 (Function Prioritization Catalog)
Zakres: priorytety dekompilacji funkcji dla `resource loading` oraz pipeline `area/placeable/creature/door`.
Cel: najpierw odblokowac funkcje krytyczne dla poprawnego odtworzenia przeplywu ladowania zasobow i obiektow ARE.

## Zasady klasyfikacji

- `P0`: funkcje blokujace caly pipeline lub determinujace mapowanie danych binarnych do obiektow runtime.
- `P1`: funkcje rozszerzajace semantyke obiektow (inicjalizacja, relacje, walidacje, cross-linki) po uruchomieniu sciezki `P0`.
- `P2`: funkcje poprawiajace kompletnosc (telemetria, porzadkowanie stanu, mniej krytyczne galezie), niewymagane do pierwszego end-to-end.

## Katalog priorytetow

| Priorytet | Obszar | Rodzina funkcji (kotwica RE) | Dlaczego ten priorytet | Oczekiwany rezultat dekompilacji |
|---|---|---|---|---|
| P0 | Resource loading | `CExoResMan::*` (`GetResObject`, `Demand`, `Release`, `Exists`) | Bez poprawnego resolvera zasobow nie da sie stabilnie dojsc do parserow ARE/GIT/UT* | Deterministyczny flow: request -> resolve source -> lock/decompress -> handoff do parsera |
| P0 | Resource loading | `CRes::*` (`OnResourceFreed`, `OnResourceServiced`, stan bufora) | To jest granica miedzy storage a parserem; bledy tu daja ciche uszkodzenia danych | Pewny lifecycle obiektu zasobu, poprawne ownership i granice pamieci |
| P0 | Resource loading | `CResGFF::*` (`Initialize`, `GetTopLevelStruct`, `GetStructByIndex`) | GFF to glowny format wejscia dla ARE/GIT/UTC/UTP/UTD | Odtworzony parser strukturalny i nawigacja po polach bez zgadywania offsetow |
| P0 | Area pipeline | `CNWSArea::*` (`LoadArea`, `LoadGIT`, `LoadProperties`) | Centralny orchestrator tworzenia obszaru i uruchomienia loaderow obiektow | Jedna sciezka startowa area->objects z jasna kolejnoscia etapow |
| P0 | Placeable pipeline | `CNWSPlaceable::*` (`LoadPlaceable`, `CreateFromGff`) | Placeable sa najczestszym obiektem mapy i szybko weryfikuja poprawnosc GFF mappingu | Poprawne utworzenie instancji placeable z minimalnym zestawem pol |
| P0 | Creature pipeline | `CNWSCreature::*` (`LoadCreature`, `CreateFromGff`) | Creature laduje najwiecej zaleznosci (stats, inventory, scripts); to test integralnosci modelu | Dzialajaca rekonstrukcja stworzen bez krytycznych crashy/NULL path |
| P0 | Door pipeline | `CNWSDoor::*` (`LoadDoor`, `CreateFromGff`) | Door spina nawigacje i przejscia; blad ladowania psuje spojnosc area graph | Stabilne ladowanie drzwi i podstawowych flag stanu/przejsc |
| P1 | Resource loading | `CExoKeyTable/CExoResourceImage::*` (mapowanie kluczy, index walk) | Potrzebne do pelnej zgodnosci lookupu miedzy bif/key/hak/custom | Pelne odtworzenie precedence i fallbackow z diagnostyka winnera |
| P1 | Area pipeline | `CNWSArea::*` (`AddObjectToArea`, `Link*`, `UpdateDerivedState`) | Po samym loadzie trzeba poprawnie podlaczyc obiekty i wyliczyc stan wtorny | Spojny graph area z poprawnymi referencjami i listami runtime |
| P1 | Placeable pipeline | `CNWSPlaceable::*` (`LoadInventory`, `LoadScripts`, `PostProcess`) | Funkcje post-load decyduja o zachowaniu obiektu, nie tylko istnieniu | Placeable z aktywnymi script hookami i prawidlowym stanem interakcji |
| P1 | Creature pipeline | `CNWSCreatureStats::*` (`ReadFromGff`, `LoadLevelData`, `ApplyDerived`) | Wysokie ryzyko bledow semantycznych (HP/feats/skills) po samym konstruktorze | Zgodne statystyki i powtarzalne wyliczenia derived attributes |
| P1 | Creature pipeline | `CNWSInventory/CNWSItem::*` (ladownie ekwipunku, equip slots) | Creature bez poprawnego inventory daje falszywie pozytywne wyniki smoke testow | Poprawne odtworzenie itemow, slotow i zaleznosci ownership |
| P1 | Door pipeline | `CNWSDoor::*` (`LoadLinkedTo`, `LoadTransition`, `ResolveDestination`) | Przejscia i targety drzwi sa kluczowe dla traversalu miedzy obszarami | Poprawnie zlinkowane destination/transition metadata |
| P2 | Resource loading | Funkcje diagnostyczne i licznikowe (`Dump*`, `Trace*`, `Stats*`) | Przydatne do observability, ale nie blokuja pierwszego E2E | Dodatkowa telemetryka i latwiejszy triage konfliktow zasobow |
| P2 | Area pipeline | Cleanup/maintenance (`ClearRuntimeCaches`, `Rebuild*` drugorzedne) | Wazne dla stabilnosci dlugiej sesji, nie dla pierwszego odczytu mapy | Lepsza hygiene stanu i mniejsze ryzyko leakow przy reloadach |
| P2 | Placeable/Creature/Door | Galezie rzadkie (`legacy flags`, `editor-only`, nietypowe event hooks) | Niski impact na glowny scenariusz dekompilacji i walidacji | Domkniecie kompatybilnosci edge-case po stabilizacji glownej sciezki |

## Kolejnosc wykonania (zalecana)

1. `P0 Resource loading` (`CExoResMan` -> `CRes` -> `CResGFF`).
2. `P0 Area orchestrator` (`CNWSArea::Load*`).
3. `P0 Object constructors` (`CNWSPlaceable` -> `CNWSCreature` -> `CNWSDoor`).
4. `P1` cross-linki i semantyka runtime.
5. `P2` telemetry/cleanup/edge-cases.

## Kryteria wyjscia z priorytetu

- `P0` zamkniety, gdy istnieje powtarzalny end-to-end: zasob -> parse GFF -> area -> placeable/creature/door bez krytycznych awarii.
- `P1` zamkniety, gdy obiekty maja poprawna semantyke runtime (stats, inventory, transitions, linki).
- `P2` zamkniety, gdy diagnostyka i scenariusze brzegowe nie zmieniaja juz wynikow funkcjonalnych glownych przeplywow.
