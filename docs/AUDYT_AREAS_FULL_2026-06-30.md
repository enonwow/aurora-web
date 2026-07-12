# AUDYT_AREAS_FULL_2026-06-30

Zakres: pelny statyczny audyt `areas` na podstawie referencji Aurory z
`C:\Projects\New Folder` oraz aktualnej implementacji w
`C:\Projects\aurora-web`.

Status: audyt statyczny zamkniety. Domkniecie produktu wymaga jeszcze prac z
checklisty oraz runtime/oracle proof po zmianach, bo sama zgodnosc kodu i
nazw GFF nie daje 100% pewnosci wizualnej.

## 1. Werdykt

Aurora ma szerszy model Areas niz obecne `aurora-web`.

Obecne `aurora-web` ma dzialajacy, realny rdzen:

- lista areas budowana ze snapshotu plikow `.are`/`.git`;
- odczyt metadanych `.are`: nazwa, tag, rozmiary, tileset, lista kafli,
  globalne swiatlo, czesc identyfikatorow audio/muzyki;
- odczyt `.git` dla pieciu typow instancji: placeables, doors, creatures,
  items, sounds;
- wzbogacenie kafli przez `.set`: modele, minimapy/2D mapy, orientacje,
  path/visibility/door visibility i krawedzie;
- frontend: wybor area, otwieranie area, lista obiektow, dodawanie/pozycjonowanie
  wspieranych obiektow, lokalne drafty, readiness tekstur/terenu;
- czesciowa ekspozycja wlasciwosci placeables, doors, creatures, items i sounds.

Najwieksze braki wzgledem Aurory:

- brak pierwszoklasowego wsparcia czterech list `.git`: encounters, stores,
  triggers, waypoints;
- brak `SpawnPointList` dla encounters;
- brak autorytatywnej listy obszarow z `module.ifo` (`Mod_Area_list`,
  `Area_Name`) i brak startowego area/location (`Mod_Entry_Area`);
- brak `.gic` jako zrodla/preservation dla komentarzy i danych komentarzowych;
- brak writer/export/round-trip GFF dla area, wiec edycja nie jest jeszcze
  parytetowa z Toolsetem;
- `.are` root jest czytany wybiorczo: brakuje skryptow, flag gameplay,
  komentarzy, loadscreen, creator/expansion i passthrough nieznanych pol;
- sa znane ryzyka parsera: unsigned DWORD, class-based known spells, zakresy
  rozmiarow area, kodowanie stringow, mutowanie flag czarow;
- render/transform wymaga potwierdzenia Toolset oracle po zmianach, zwlaszcza
  os X, yaw, orientacja kafli i `tilesetOrientation`;
- soundscape moze wstrzykiwac syntetyczne fallbacki, co jest ryzykiem dla
  parytetu danych.

## 2. Zrodla referencyjne

Folder referencyjny:

- `C:\Projects\New Folder\Aurora_2026_05_24.gar`;
- `C:\Projects\New Folder\export\decompiled_all.c`;
- `C:\Projects\New Folder\export\functions.tsv`;
- `C:\Projects\New Folder\export\strings.tsv`;
- `C:\Projects\New Folder\export\xrefs_domain.txt`;
- CSV domenowe: `area.csv`, `are.csv`, `git.csv`, `module.csv`,
  `placeable.csv`, `creature.csv`, `utc.csv`, `utp.csv`, `2da.csv`, `hak.csv`,
  `tlk.csv`;
- starszy audyt referencyjny: `C:\Projects\New Folder\AUDYT_AREA.md`.

Szybka wielkosc domen CSV:

- `area.csv`: 229 linii;
- `are.csv`: 584 linie;
- `git.csv`: 134 linie;
- `module.csv`: 128 linii;
- `placeable.csv`: 82 linie;
- `creature.csv`: 138 linii;
- `utc.csv`: 14 linii;
- `utp.csv`: 32 linie;
- `2da.csv`: 77 linii;
- `hak.csv`: 49 linii;
- `tlk.csv`: 29 linii.

## 3. Jak Aurora sklada Area

Aurora nie traktuje area jako jednego pliku. Funkcjonalnie area jest zlozone z
kilku warstw:

- `module.ifo`: lista obszarow modulu, area startowe i informacje modulowe;
- `.are`: statyczne dane obszaru, kafle, swiatlo, pogoda, skrypty area;
- `.git`: instancje obiektow i wlasciwosci runtime/ambient dla obszaru;
- `.gic`: komentarze i dane komentarzowe powiazane z area;
- `.set`: definicje tilesetu i modeli kafli;
- `.2da`, `.tlk`, templates (`.utp`, `.utc`, itd.): slowniki, nazwy,
  appearance, metadata.

### 3.1 Lista areas w module

Referencja Aurory pokazuje, ze lista obszarow jest modulowa, a nie tylko
wynikiem skanowania plikow:

- `module.ifo`;
- `Mod_Area_list`;
- `Area_Name`;
- `Mod_Entry_Area`;
- start position/direction: `Mod_Entry_X`, `Mod_Entry_Y`, `Mod_Entry_Z`,
  `Mod_Entry_Dir_X`, `Mod_Entry_Dir_Y`;
- akcje/naprawy modulowe: `Build Missing Areas`, `Spellcheck Areas`.

Wniosek: poprawna lista obszarow powinna znac `module.ifo` jako zrodlo
autorytatywne, a skan `.are`/`.git` powinien byc fallbackiem i mechanizmem
diagnostycznym.

### 3.2 ARE

`ARE` zawiera statyczny opis area:

- identyfikacja: `Version`, `Tag`, `Name`, `ResRef`;
- autor/metadane: `Creator_ID`, `Comments`, `Flags`, `Expansion_List`;
- rozmiar i tileset: `Width`, `Height`, `Tileset`/`TileSet`;
- kafle: `Tile_List`;
- skrypty: `OnEnter`, `OnExit`, `OnHeartbeat`, `OnUserDefined`;
- gameplay: `PlayerVsPlayer`, `NoRest`, `LoadScreenID`,
  `ModListenCheck`, `ModSpotCheck`;
- pogoda/srodowisko: `ChanceRain`, `ChanceSnow`, `ChanceLightning`,
  `WindPower`;
- fog/sky/night: `FogClipDist`, `IsNight`, `DayNightCycle`,
  `LightingScheme`, `ShadowOpacity`, `SkyBox`;
- sun/moon: `SunAmbientColor`, `SunDiffuseColor`, `SunFogColor`,
  `SunFogAmount`, `SunShadows`, `MoonAmbientColor`, `MoonDiffuseColor`,
  `MoonFogColor`, `MoonFogAmount`, `MoonShadows`.

### 3.3 Tile_List

Kafel area nie jest tylko indeksem:

- `Tile_ID`;
- `Tile_Orientation`;
- `Tile_Height`;
- `Tile_MainLight1`;
- `Tile_MainLight2`;
- `Tile_SrcLight1`;
- `Tile_SrcLight2`;
- `Tile_AnimLoop1`;
- `Tile_AnimLoop2`;
- `Tile_AnimLoop3`;
- `Tile_group`.

W praktyce kafel trzeba laczyc z `.set`, bo tam jest model, minimapa/2D image,
orientacja tilesetu, path node, visibility node, door visibility node i
informacje o krawedziach.

### 3.4 GIT

`GIT` zawiera instancje w area. Referencja Aurory potwierdza nastepujace listy:

- `Creature List`;
- `Door List`;
- `Encounter List`;
- lista itemow (`List` / item instance list);
- `Placeable List`;
- `SoundList`;
- `StoreList`;
- `TriggerList`;
- `WaypointList`.

Kazda z tych list jest osobnym typem obiektu Toolsetu, a nie wariantem jednej
ogolnej listy.

`AreaProperties` w `.git` zawiera warstwe ambient/music:

- `AmbientSndDay`;
- `AmbientSndNight`;
- `AmbientSndDayVol`;
- `AmbientSndNitVol`;
- `EnvAudio`;
- `MusicBattle`;
- `MusicDay`;
- `MusicNight`;
- `MusicDelay`.

### 3.5 GIC

Referencja zawiera logike ostrzegania o brakujacym odpowiadajacym `ARE` lub
`GIC`. To znaczy, ze `.gic` jest czescia integralnosci area, a nie pobocznym
artefaktem.

Obecny audyt traktuje `.gic` jako brak krytyczny dla round-trip/preservation.

## 4. Obiekty w area wedlug Aurory

### 4.1 Placeables

Wymagane kategorie danych:

- resref/template;
- tag i nazwa lokalizowana;
- position X/Y/Z;
- bearing/orientation;
- appearance/model;
- static/useable;
- visual transform;
- wlasciwosci template z `.utp`, w tym inventory/scripts/locks/traps tam,
  gdzie Toolset je eksponuje.

Obecne `aurora-web` czyta i renderuje podstawowy placement, appearance,
static/useable i visual transform.

### 4.2 Doors

Wymagane kategorie danych:

- template/resref;
- tag/nazwa;
- position X/Y/Z;
- bearing/orientation;
- generic type / appearance;
- area transition: `LinkedTo`, `LinkedToFlags`, linked module/waypoint,
  load screen/destination;
- lock/trap/script/template data.

Obecne `aurora-web` czyta placement, generic type, visual transform i czesc
area transition.

### 4.3 Creatures

Wymagane kategorie danych:

- template/resref;
- firstname/lastname/description/comments;
- appearance, gender, race, phenotype, portrait, soundset;
- faction, alignment, CR, perception;
- abilities, saves, HP/AC;
- scripts;
- class list, skill list, feat list, special abilities;
- known spells/spellbook;
- inventory/equips;
- visual transform.

Obecne `aurora-web` ma najszersze wsparcie wlasnie tutaj, ale istnieje ryzyko
known spells dla klas, bo logika jest oparta o wybrane `classId`.

### 4.4 Items

Wymagane kategorie danych:

- ground item instance;
- template/resref;
- tag/nazwa/opis;
- position X/Y/Z;
- bearing/orientation;
- stack/charges/cost/identified/plot/stolen/infinite/useable tam, gdzie
  pochodza z instance/template.

Obecne `aurora-web` czyta podstawowa instancje i potrafi umiescic item jako
obiekt sceny, ale nie jest to pelny round-trip item instance.

### 4.5 Sounds

Wymagane kategorie danych:

- active/continuous/looping;
- positional/random/random position/elevation;
- min/max distance;
- volume, pitch, priority;
- interval/variation;
- day/night/hour scheduling;
- lista sound resources.

Obecne `aurora-web` ma rozbudowany parser pozycyjnych soundow, ale soundscape
area ma tez fallbacki syntetyczne, ktore trzeba oddzielic od danych
parytetowych.

### 4.6 Encounters

Wymagane kategorie danych:

- `Encounter List`;
- aktywnosc, difficulty, faction, player-only;
- reset/respawn;
- creature list;
- scripts;
- `SpawnPointList`;
- spawnpoint markers i ich widocznosc w UI.

Obecne `aurora-web` ma model frontendowy dla encounters w czesci sceny/katalogu,
ale parser areas nie czyta `Encounter List`, a typ `AreaObjectKind` go nie
zawiera.

### 4.7 Stores

Wymagane kategorie danych:

- `StoreList`;
- template/resref;
- tag/nazwa;
- position/orientation, jesli obecne w instance;
- inventory/store data z template.

Obecne `aurora-web` nie ma pierwszoklasowego typu store w area pipeline.

### 4.8 Triggers

Wymagane kategorie danych:

- `TriggerList`;
- geometry/polygon/vertices;
- tag/nazwa;
- scripts;
- trap/transition/destination tam, gdzie dotyczy.

Obecne `aurora-web` nie ma pierwszoklasowego typu trigger w area pipeline.

### 4.9 Waypoints

Wymagane kategorie danych:

- `WaypointList`;
- tag/nazwa;
- position X/Y/Z;
- orientation;
- map note / localized note tam, gdzie wystepuje.

Obecne `aurora-web` nie ma pierwszoklasowego typu waypoint w area pipeline.

## 5. UI Toolsetu wokol Areas

Referencja zawiera klasy i akcje UI, ktore wyznaczaja pelny zakres parytetu:

- `TArea`;
- `TAreaData`;
- `TAreaTile`;
- `TAreaInstanceData`;
- `TAreaGroup`;
- `TdlgAreaProperties`;
- `TdlgAreaWizard`;
- `TdlgAreaTransition`;
- `TfrmAreaResize`;
- `TfrmViewerArea`;
- `TAuroraPanelEventHandlerForArea`;
- `actWizardAreaExecute`;
- `actAreaResizeExecute`;
- `actAreaRotateExecute`;
- `actVerifyAreaExecute`;
- `actShowAreaStatsExecute`;
- `actAreaExportExecute`;
- `actAreaImportExecute`;
- `teInstancesInAreaClick`;
- `Show Spawnpoint Markers`;
- `Use Area Lighting`;
- `Use Area Sounds`;
- `Use Area Music`.

Wniosek: parytet nie konczy sie na zaladowaniu mapy. Minimalny pelny obieg
obejmuje liste areas, properties, import/export, resize, rotate, verify/stats,
edycje instancji i zachowanie komentarzy.

## 6. Aktualny backend aurora-web

### 6.1 API

Backend `areas` wystawia:

- `GET /areas`;
- `GET /areas/lighting/evidence`;
- `GET /areas/:areaId`;
- `GET /areas/:areaId/preview`;
- publiczne `GET /areas/:areaId/thumbnail`;
- `POST /areas/:areaId/process`;
- endpointy cache/texture contract/binary.

Lista area ma filtry:

- `query`;
- `biome`;
- `tag`;
- `benchmark`;
- `limit`;
- `offset`.

### 6.2 Typy domenowe

`AreaObjectKind` wspiera tylko:

- `placeable`;
- `door`;
- `creature`;
- `item`;
- `sound`.

Brak w typach:

- `encounter`;
- `store`;
- `trigger`;
- `waypoint`.

`AreaRecord` ma:

- rozmiary;
- biome/tags;
- preview/texture atlas;
- tiles;
- lighting;
- objects;
- soundscape.

### 6.3 Parser ARE/GIT

Parser `aurora-gff-area-parser.ts` obecnie czyta:

- z `.are`: name/tag/width/height/tileSet, tile list, global lighting,
  czesc sound/music ids;
- z `.git`: placeables, doors, creatures, items, sounds;
- z creature instances: duzo metadata, listy klas/skill/feat/spell/template,
  inventory/equip;
- z sound instances: duzo metadata pozycyjnych/schedulingowych;
- z doors: czesc transition;
- z placeables/doors/creatures/items: visual transform.

Nie czyta:

- `Encounter List`;
- `StoreList`;
- `TriggerList`;
- `WaypointList`;
- `SpawnPointList`;
- `.gic`;
- `Mod_Area_list`;
- `Area_Name`;
- `Mod_Entry_Area`;
- wiekszosci root fields `.are` poza kaflami/swiatlem/audio.

### 6.4 Repository/snapshot

`module-snapshot-area.repository.ts` buduje kandydatow area ze snapshotu,
ale bierze pod uwage tylko rozszerzenia:

- `.are`;
- `.git`.

Nie traktuje jako zrodel area:

- `.gic`;
- `module.ifo`.

`buildAreaObjects` sklada tylko piec typow wspieranych przez parser:

- placeables;
- doors;
- creatures;
- items;
- sounds.

`buildAreaTiles` laczy dane z `.are` i `.set`, co jest dobrym kierunkiem i
powinno zostac zachowane.

`buildAreaSoundscape` potrafi wstrzyknac fallbackowe/syntetyczne ambienty i
random sounds. To jest uzyteczne dla preview, ale jako dane parytetowe powinno
byc oznaczone albo wylaczone.

## 7. Aktualny frontend aurora-web

### 7.1 Contracts

Frontendowy kontrakt API Areas tez wspiera tylko:

- `placeable`;
- `door`;
- `creature`;
- `item`;
- `sound`.

Brak w kontrakcie:

- `encounter`;
- `store`;
- `trigger`;
- `waypoint`.

### 7.2 Mapper area -> scena

`areaSceneMapper.ts` mapuje backend kinds:

- placeable -> placeables;
- door -> doors;
- creature -> creatures;
- item -> items;
- sound -> sounds.

Nie ma mapowania dla:

- encounter;
- store;
- trigger;
- waypoint.

Mapper poprawnie przenosi obecne tile fields, w tym tile lights i anim loops,
ale nie moze pokazac danych, ktorych backend nie parsuje.

### 7.3 UI Areas Mode

Areas Mode ma realne elementy:

- panel wyboru area;
- wyszukiwanie/filtrowanie;
- otwarcie area;
- selected area quick actions;
- context menu;
- readiness tekstur/terenu;
- object list;
- add object flows;
- property dialogs dla wspieranych typow.

Katalog UI deklaruje tez post-MVP kategorie:

- vfx;
- encounters;
- triggers;
- waypoints;
- stores;
- ground_items.

Jednak obieg area nie ma dla nich pelnego zaplecza. Encounters istnieja
czesciowo w modelu sceny/katalogu, ale nie sa czytane z `.git` area.

### 7.4 Interakcja i placement

Aktualna interakcja wspiera:

- placement na kaflu;
- clamp do bounds area;
- drag/move dla wybranych typow;
- transform/bearing;
- drafty lokalne.

Move allowed obejmuje:

- placeables;
- creatures;
- encounters;
- items;
- sounds.

Nie obejmuje:

- doors;
- stores;
- triggers;
- waypoints.

To jest niespojnosc: scene layer zna encounters czesciowo, ale area parser i API
ich nie znaja.

## 8. Render i koordynaty

Aktualna funkcja koordynatow Areas:

- area render X: `areaWidth - sourceX`;
- area render offset X: `-sourceOffsetX`;
- area render Z: `sourceY`;
- area render offset Z: `sourceOffsetY`;
- yaw: `-sourceYaw`;
- tile center X: `tileCol + 0.5`;
- tile center Z: `tileRow + 0.5`;
- tile model orientation: `-sourceOrientation`;
- tile image map orientation: `-sourceOrientation`;
- `tilesetOrientation` jest ignorowane.

Ryzyko: obiekty sa lustrzane na osi X, ale centra kafli juz nie. To moze byc
poprawne po korektach, ale bez screenshot/oracle proof nie mozna uznac tego za
zamkniete. Przy Areas obowiazuje to samo kryterium co przy Placeables:
techniczne zaladowanie nie wystarcza, potrzebna jest wizualna zgodnosc z
Toolsetem.

## 9. Znane bugi/ryzyka do domkniecia

### P0

1. Dodac brakujace typy `.git` do calego pionu:
   `encounter`, `store`, `trigger`, `waypoint`.

   Zakres: backend typy, parser, repository, cache key/object counts,
   frontend contracts, mapper, object list, properties, tests.

2. Dodac `SpawnPointList` dla encounters.

   Bez tego encounter placement bedzie niekompletny nawet wtedy, gdy sama lista
   encounter zostanie odczytana.

3. Zrobic `module.ifo` jako autorytatywna liste areas.

   Zakres: `Mod_Area_list`, `Area_Name`, `Mod_Entry_Area`, start X/Y/Z/Dir,
   porownanie z fallbackowym skanem `.are`/`.git`, diagnostyka brakow.

4. Dodac `.gic` parse/preserve.

   Minimalnie: wykrywac i laczyc z area; docelowo zachowac komentarze i
   round-trip.

5. Zaplanowac i wdrozyc writer/export/round-trip GFF dla area.

   Bez tego Areas pozostaja glownie read/render/edit-in-memory, a nie pelny
   odpowiednik Toolsetu.

6. Runtime/oracle proof po zmianach.

   Minimum: wybrany area, screenshot z Toolset oracle, screenshot z
   `aurora-web`, porownanie kafli, orientacji, obiektow i list.

### P1

7. Rozszerzyc `.are` root.

   Brakujace pola: scripts, gameplay flags, comments, creator/expansion,
   loadscreen, listen/spot, root passthrough i nieznane pola.

8. Naprawic unsigned DWORD w GFF parserze.

   Aktualna logika traktuje `DWORD` podobnie jak signed int, co moze zepsuc
   wartosci >= 2^31.

9. Naprawic known spells dla creatures.

   Obecna logika oparta o wybrane `classId` jest ryzykowna. Wizard/class 10 i
   inne warianty powinny wynikac z danych/regul, nie z twardej pary id.

10. Zweryfikowac zakresy wymiarow area.

   Obecny clamp/fallback jest niespojny z klasycznym zakresem NWN/Toolsetu.

11. Uporzadkowac kodowanie stringow.

   UTF-8-only jest ryzykowne dla starych zasobow NWN/Aurora.

12. Usunac albo oznaczyc syntetyczne fallbacki soundscape.

   Preview moze miec fallback, ale dane parytetowe musza odroznic realne
   zasoby od wymyslonych.

13. Zweryfikowac transform/orientation z Toolsetem.

   Dotyczy osi X/Z, yaw, orientacji kafli, offsetow modeli i
   `tilesetOrientation`.

### P2

14. UI dla pelnych area properties.

   Dzis UI pokrywa tylko czesc tego, co Toolset ma w `TdlgAreaProperties`.

15. UI/akcje Toolsetowe.

   Do rozpatrzenia: wizard, resize, rotate, verify, stats, import/export,
   build missing areas, spellcheck areas.

16. Markery i warstwy pomocnicze.

   Szczegolnie `Show Spawnpoint Markers`, selection helpers i overlaye dla
   trigger/encounter/waypoint.

17. Test matrix.

   Kazda lista referencyjna powinna miec test parsera, test repository, test
   API contract i test mappera frontendowego.

## 10. Matrix pokrycia

| Obszar | Aurora reference | aurora-web teraz | Status |
| --- | --- | --- | --- |
| Lista areas z module.ifo | `Mod_Area_list`, `Area_Name` | skan `.are`/`.git` | Brak |
| Start area | `Mod_Entry_Area`, entry position | brak pierwszoklasowo | Brak |
| ARE root metadata | szerokie | czesciowe | Czesciowe |
| ARE scripts | `OnEnter/OnExit/OnHeartbeat/OnUserDefined` | brak | Brak |
| ARE gameplay flags | PvP, NoRest, LoadScreen, listen/spot | brak | Brak |
| ARE Tile_List | tak | tak | Czesciowe/dobre |
| Tile lights | tak | tak | Dobre |
| Tile anim loops | tak | tak | Dobre |
| SET enrichment | tak | tak | Dobre |
| GIT placeables | tak | tak | Czesciowe |
| GIT doors | tak | tak | Czesciowe |
| GIT creatures | tak | tak | Czesciowe/dobre |
| GIT items | tak | tak | Czesciowe |
| GIT sounds | tak | tak | Czesciowe/dobre |
| GIT encounters | tak | brak w area API/parser | Brak |
| Encounter spawnpoints | tak | brak | Brak |
| GIT stores | tak | brak | Brak |
| GIT triggers | tak | brak | Brak |
| GIT waypoints | tak | brak | Brak |
| GIC comments | tak | brak | Brak |
| Area transition | tak | czesciowe doors | Czesciowe |
| Area properties UI | tak | czesciowe | Czesciowe |
| Import/export area | tak | brak pelnego writer/round-trip | Brak |
| Verify/stats | tak | brak parytetu Toolsetowego | Brak |
| Runtime visual parity | Toolset oracle | wymaga proof | Niepotwierdzone |

## 11. Drugi skan kontrolny

Drugi skan mial dwa wyniki.

Po pierwsze, w `backend/docs/aurora-reverse` istnieja starsze/specyfikacyjne
notatki, ktore juz wymieniaja brakujace listy (`area-composition-spec-r63.md`,
`are-git-validation-spec-r63.md`). To wzmacnia wniosek referencyjny: te listy
sa znane jako czesc modelu area.

Po drugie, waski skan aktualnej implementacji w `backend/src/modules/areas`,
`frontend/src/modules/areas`, `frontend/src/modules/layout` i
`frontend/src/modules/scene` potwierdzil, ze ponizsze etykiety z referencji nie
maja pierwszoklasowego obiegu w pipeline `areas`:

- `Encounter List`;
- `StoreList`;
- `TriggerList`;
- `WaypointList`;
- `SpawnPointList`;
- `Mod_Area_list`;
- `Area_Name`;
- `.gic`.

Frontend ma czesc kategorii jako `post_mvp` albo jako pomocniczy model sceny
(`encounters`, `triggers`, `waypoints`, `stores`), ale to nie jest jeszcze
odczyt z `.git`/`.gic` ani payload area API. To nie wyglada na luka
dokumentacyjna. To sa realne braki implementacyjne.

## 12. Minimalna kolejka domkniecia

Najkrotsza kolejka, ktora zamyka najwieksza czesc Areas bez rozmywania zakresu:

1. `GIT unsupported lists vertical`

   Dodac `encounter`, `store`, `trigger`, `waypoint` od parsera do frontend
   mappera. W tej samej paczce albo jako sidecar dodac `SpawnPointList` dla
   encounters.

2. `module.ifo area index`

   Parsowac `Mod_Area_list`, `Area_Name`, `Mod_Entry_Area` i entry transform.
   Lista obszarow w UI powinna umiec pokazac porzadek/nazwy modulowe oraz
   diagnostyke brakujacych `.are`/`.git`/`.gic`.

3. `.gic preserve`

   Wykrywac, parsowac i zachowywac komentarze/dane komentarzowe.

4. `ARE root parity`

   Dodac brakujace root fields `.are`, scripts/gameplay/comments/loadscreen i
   passthrough.

5. `Parser correctness`

   Naprawic DWORD, known spells, dimensions, encoding i forced spell flags.

6. `Render/oracle proof`

   Po zmianach uruchomic browser/runtime, wykonac screenshot i porownac z
   Toolset oracle. Bez tego Areas nie sa zamkniete na 100%.

## 13. Kryterium zamkniecia Areas

Areas mozna uznac za zamkniete dopiero, gdy:

- lista areas pochodzi z `module.ifo` i zgadza sie ze snapshotem plikow;
- `.are`, `.git`, `.gic` sa czytane albo swiadomie passthroughowane;
- wszystkie listy `.git` sa obecne w typach, API, cache key, mapperze i UI;
- kafle, swiatlo, audio, obiekty i komentarze przechodza round-trip;
- render obszaru pasuje do Toolset oracle na screenshotach;
- testy obejmuja kazda referencyjna liste i najwazniejsze edge case;
- raport runtime ma konkretne artefakty: screenshoty, summary/cache status i
  brak regresji w Placeables camera/orbit/pan/zoom semantics.
