# AUDYT_WATKU_019f189f_AREAS_DEKOMPILACJA_2026-07-02

Zakres:

- audyt watku `codex://threads/019f189f-256d-7272-bae2-7f23e216c680`;
- porownanie bledow procesu z dekompilacja Aurory w `C:\Projects\New Folder`;
- aktualny stan `C:\Projects\aurora-web` bez cofania cudzych zmian;
- internet tylko tam, gdzie lokalna dekompilacja nie rozstrzyga semantyki.

Glowny werdykt:

Watek zrobil kilka realnych rzeczy, ale nie domknal Areas jako parytetu z
Aurora Toolset. Problem nie byl brakiem pracy. Problem byl taki, ze po audycie
agent zbyt szybko wszedl w petle:

`metryka/test/runtime wyglada lepiej -> screenshot nadal nie zgadza sie z
Toolsetem -> kolejny patch w rendererze/capture -> jeszcze mniej jasna
przyczyna`.

To jest dokladnie zly wzorzec, ktory mial byc zatrzymany po poprzednim audycie.
Od teraz Areas trzeba traktowac jako prace z bramka dowodowa, nie jako ciag
heurystyk w `workspaceTerrainMesh`, `workspaceObjectMeshLayer` i capture script.

## 1. Zrodla uzyte w tym audycie

Lokalny zapis watku:

- `C:\Users\enonw\.codex\sessions\2026\06\30\rollout-2026-06-30T15-01-55-019f189f-256d-7272-bae2-7f23e216c680.jsonl`

Lokalne dokumenty:

- `docs/AUDYT_AREAS_FULL_2026-06-30.md`
- `docs/AUDYT_WATKU_019f122f_AREAS_UZUPELNIENIE_2026-06-30.md`
- `C:\Projects\New Folder\AUDYT_AREA.md`

Dekompilacja:

- `C:\Projects\New Folder\export\decompiled_all.c`
- `C:\Projects\New Folder\export\functions.tsv`
- `C:\Projects\New Folder\export\strings.tsv`
- `C:\Projects\New Folder\export\xrefs_domain.txt`
- CSV domenowe: `area.csv`, `are.csv`, `git.csv`, `module.csv`,
  `placeable.csv`, `creature.csv`, `utc.csv`, `utp.csv`, `2da.csv`,
  `hak.csv`, `tlk.csv`

Zewnetrzne zrodla uzupelniajace:

- NWNWiki Area: https://nwn.fandom.com/wiki/Area
- NWN Lexicon `SetObjectVisualTransform`: https://nwnlexicon.com/SetObjectVisualTransform
- xoreos `src/engines/nwn/area.cpp`: https://xoreos.org/doxygen/db/d55/nwn_2area_8cpp_source.html
- nwn-lib-d GFF tooling: https://github.com/CromFr/nwn-lib-d
- Tero Kivinen NWN tools: https://kivinen.iki.fi/nwn/

## 2. Metryka watku

Z lokalnego JSONL:

- 36 model-visible tur z user/final/context;
- 64 finalne odpowiedzi;
- 246 zdarzen patch apply;
- 66 unikalnych plikow zmienionych w watku;
- 91 web-search/open events;
- 88 browser/node MCP tool calls;
- 59 `compacted` plus 59 `context_compacted`, czyli 118 sygnalow
  kompaktowania/przejsc kontekstu.

Najczesciej zmieniane pliki:

- `backend/scripts/capture-areas-runtime-cdp.mjs` - 34 patch events;
- `frontend/src/modules/layout/adapters/three/workspaceObjectMeshLayer.ts` -
  30 patch events;
- `frontend/src/modules/layout/adapters/three/workspaceTerrainMesh.ts` -
  25 patch events;
- `frontend/src/modules/layout/components/WorkspaceCanvasViewport.tsx` -
  19 patch events;
- `frontend/tests/unit/modules/layout/workspaceObjectMeshLayer.visualTransform.test.ts` -
  12 patch events;
- `frontend/tests/unit/modules/layout/workspaceTerrainMesh.ceilingVisibility.test.ts` -
  11 patch events.

To jest czerwony sygnal. Watek, ktory mial najpierw ustalic kontrakt Areas,
zamienil sie w duza serie zmian w najbardziej wrazliwych miejscach renderera
i proof infrastructure.

## 3. Co w watku bylo dobre

1. Start byl poprawny: agent jawnie oddzielil `C:\Projects\New Folder` jako
   referencje/dekompilacje od `C:\Projects\aurora-web` jako repo docelowego.

2. Powstal statyczny audyt Areas:
   `docs/AUDYT_AREAS_FULL_2026-06-30.md`.

3. Powstal audyt poprzedniego watku:
   `docs/AUDYT_WATKU_019f122f_AREAS_UZUPELNIENIE_2026-06-30.md`.

4. Czesciowo domknieto dawny brak GIT list. Aktualny kod ma 9 typow obiektow:
   `placeable`, `door`, `creature`, `encounter`, `item`, `sound`, `store`,
   `trigger`, `waypoint` w `backend/src/modules/areas/domain/area.types.ts`.

5. Parser `.git` aktualnie czyta takze:
   `Encounter List`, `StoreList`, `TriggerList`, `WaypointList` przez
   `parseAreaObjectsFromGitGff()` w
   `backend/src/modules/areas/adapters/outbound/blob/aurora-gff-area-parser.ts`.

6. Repository aktualnie appenduje nowe typy do `AreaRecord.objects` w
   `backend/src/modules/areas/adapters/outbound/blob/module-snapshot-area.repository.ts`.

7. Frontend ma juz mapowanie nowych typow w `areaSceneMapper.ts` oraz widocznosc
   dla `encounters`, `stores`, `triggers`, `waypoints` w `roleTopbarPolicy.ts`.

8. Dla `enon_bakery` powstalo kilka realnych artefaktow: strict capture,
   porownania z Toolsetem, pozniejsze browser/top-down PNG i state JSON.

To sa prawdziwe postepy. Nie wolno ich kasowac tylko dlatego, ze proces byl
chaotyczny. Ale nie wolno tez nazywac ich "Areas globalnie naprawione".

## 4. Co poszlo zle

### 4.1 Za szybko padlo "globalnie naprawione"

Watek po implementacji 9/9 GIT list nazwal to globalna naprawa Areas. To bylo
za mocne.

Co bylo wtedy realnie potwierdzone:

- API i czesc kontraktu zaczely niesc nowe typy;
- UI nadal umialo otworzyc area;
- parser/repository mialy nowe listy.

Co nie bylo potwierdzone:

- `module.ifo` jako autorytatywna lista areas;
- `.gic` parse/preserve;
- `SpawnPointList` encounterow;
- pelny ARE root parity;
- writer/export/round-trip GFF;
- wizualny parytet z Toolsetem.

Regula: backend/API vertical nie zamyka Areas. To tylko jeden pion.

### 4.2 Screeny byly mylone z dowodem parytetu

User musial kilka razy dopytywac:

- gdzie sa screeny;
- czego te screeny dowodza;
- czemu nie widac ukladu tile/placeabli;
- czemu screen bez tekstur jest pokazywany jako stan po poprawce;
- czemu widok nie jest top-down.

To znaczy, ze proof nie byl projektowany od poczatku jako akceptacja wizualna.
Byl doklejany reaktywnie.

Regula: dla Areas/parity final nie moze mowic `done`, jezeli nie ma:

- swiezego Toolset oracle;
- swiezego web screenshotu tego samego targetu;
- porownania na tym samym kadrze;
- frame/state JSON;
- decyzji `improved`, `worse`, `inconclusive` albo `blocked`.

### 4.3 Zmieniano proof infrastructure i semantyke renderu naraz

Najczesciej patchowany byl `capture-areas-runtime-cdp.mjs`, a obok niego
`workspaceObjectMeshLayer.ts`, `workspaceTerrainMesh.ts` i
`WorkspaceCanvasViewport.tsx`.

To miesza dwa rozne typy pracy:

- proof-path fix: ma zrobic pomiar wiarygodnym;
- parity fix: zmienia render/semantyke.

Jesli oba ida w jednej iteracji, po zlym obrazie nie wiadomo, czy winna jest
naprawa renderu, zmiana capture, nowy kadr, cache, proxy, tekstury, czy
zwykly stary screenshot.

### 4.4 `enon_bakery` zostalo uzyte jako jedyny barometr Areas

`enon_bakery` jest dobrym targetem testowym, bo ma 4x4, 197 obiektow i duzo
placeabli. Ale nie zamyka Areas.

Areas jako domena obejmuje:

- `module.ifo`;
- `.are`;
- `.git`;
- `.gic`;
- `.set`;
- obiekty GIT: placeables, doors, creatures, encounters, items, sounds,
  stores, triggers, waypoints;
- area properties, weather/fog/light/shadow/audio;
- writer/round-trip/import/export;
- Toolset commands: verify, stats, resize, rotate, wizard, transitions.

`Bakery looks better` nie znaczy `Areas sa gotowe`.

### 4.5 Renderer zaczal zbierac heurystyki

W watku padla trafna autorefleksja: renderer area nie ma jednego czystego,
potwierdzonego modelu Aurory. Obecnie walcza ze soba:

- source-backed tile GLB jako pelne modele 3D;
- `ImageMap2D` jako potencjalny crop/maska;
- `sic11_black` i inne czarne meshe jako maski/void/sufity;
- placeable VisualTransform;
- local source Z;
- support-surface heurystyki;
- camera/crop/top-down;
- texture delivery/material binding.

Zle zachowanie bylo takie: widoczny objaw na screenie -> lokalna regula
`sic11_black`, `hidden_elevated_horizontal`, overlay albo support correction.
Jedna z takich regul dala regres w lewym dolnym tile i musiala byc cofnieta.

Regula: najpierw izolowany renderer/paczka dowodowa dla 16 tile Bakery,
potem globalny path. Nie odwrotnie.

### 4.6 Tekstury byly uzywane niespojnie jako warunek proofa

Artefakty z 2026-07-02 pokazuja:

- `01:10` `web-bakery-nolights-adjust-location-vt-rotatex.png` mial ostatni
  dobry zapis z teksturami;
- `09:54` `web-bakery-nolights-post-fable5-frontend-restart-warm.png` byl
  strict capture, ale frame/state pokazywal partial/missing tekstury;
- `11:11/11:12` kolejne proby mialy failure frame;
- `12:13` browser/top-down state pokazal `rendererStatus: ready` i
  `textureCounts: {"applied":190}`, ale to nadal byl browser proof/top-down,
  nie pelny Toolset parity proof.

Blad: screen z brakujacymi teksturami zostal pokazany jako cos, z czego mozna
wnioskowac o stanie VT/placeabli. To wprowadzalo usera i kolejny model w blad.

Regula: screenshot z `textureStatus != ready/applied` moze byc tylko
`blocked/diagnostic`, nigdy `parity proof`.

### 4.7 Dekomilacja byla uzywana, ale nie zawsze jako bramka przed patchem

User ustawil jasna regule: przed kazdym krokiem implementacyjnym ma byc dowod
z dekompilacji, a gdy go nie ma, dowod z internetu.

Watek czasem tak robil, ale czesto:

- najpierw patchowal;
- potem szukal wyjasnienia;
- potem cofal;
- potem doklejal nowe metryki.

Regula: dekompilacja/internet nie jest przypisem po fakcie. To jest bramka
przed zmiana semantyki.

## 5. Co mowi dekompilacja i zrodla zewnetrzne

### 5.1 Area to nie tylko `.are`

Lokalna dekompilacja i `AUDYT_AREA.md` mowia, ze area sklada sie z `.are`,
`.git`, `.gic` oraz danych modulowych i tilesetowych.

NWNWiki potwierdza publicznie ten sam podzial: `.are` trzyma statyczne dane
area i tile layout, `.git` dynamiczne instancje i sound properties, a `.gic`
komentarze instancji widoczne w Toolsecie.

Wniosek dla `aurora-web`:

- `.gic missing` nie jest drobiazgiem;
- `module.ifo` nie moze byc wiecznie zastapione skanem plikow;
- writer/round-trip bez `.gic` i `module.ifo` nie bedzie Toolset-parity.

### 5.2 Tile orientation i pozycje musza miec jeden kontrakt

xoreos jako niezalezna implementacja pokazuje prosty, wazny kontrakt:

- area laduje ARE i GIT;
- `Width`, `Height`, `Tileset`, `Tile_List` pochodza z ARE;
- tile ma `Tile_ID`, `Tile_Height`, `Tile_Orientation`, swiatla i anim loops;
- model tile jest pozycjonowany na `x * 10 + 5`, `y * 10 + 5`;
- orientacja modelu tile jest `Tile_Orientation * 90`.

Lokalna dekompilacja Aurory ma zgodne kotwice dla `Tile_ID`,
`Tile_Orientation`, `Tile_Height`, `Tile_MainLight1/2`, `Tile_SrcLight1/2`
oraz `Tile_AnimLoop1/2/3`.

Wniosek:

- nie wolno mieszac `Tile_Orientation`, `.set Orientation`,
  `ImageMap2D orientation`, camera mirror i globalnego X mirror w jednej
  hipotezie;
- kazda warstwa musi miec osobny evidence field w frame.

### 5.3 VisualTransform jest wizualny, nie pozycyjny

Lokalna dekompilacja pokazuje `VisTransformList` i `VisualTransform`.
NWN Lexicon potwierdza, ze `SetObjectVisualTransform` zmienia wizualna
prezentacje, nie prawdziwa pozycje obiektu. Lexicon dodaje tez istotna uwage:
runtime VT dla placeable wymaga non-static placeable.

Wniosek:

- fix `Adjust Location` nie moze byc rozliczany tylko przez `VT applied`;
- trzeba pokazac oddzielnie `source position`, `source VT`, `effective VT`,
  `render transform`;
- static/non-static gating dla runtime VT jest wazny, ale persistent
  `VisTransformList` w GIT trzeba nadal potwierdzic Toolset oracle na
  konkretnym obiekcie.

### 5.4 Round-trip GFF jest osobnym wymaganiem

nwn-lib-d i narzedzia Tero Kivinena pokazuja, ze GFF parse/write i praca na
ARE/GIT/GIC/IFO sa normalnym, osobnym problemem narzedziowym. Nie jest to
to samo co runtime render.

Wniosek:

- `areas` bez writer/export/round-trip to read/render preview, nie pelny
  odpowiednik Toolsetu;
- preservation nieznanych pol musi byc zaprojektowane przed writerem.

## 6. Aktualny stan `aurora-web` po watku

Potwierdzone lokalnie w kodzie:

- 9 typow `AreaObjectKind` istnieje w backend domain;
- parser GIT czyta placeables, doors, creatures, encounters, items, sounds,
  stores, triggers, waypoints;
- repository appends tych 9 kategorii do `AreaRecord.objects`;
- frontend mapuje nowe object kinds i ma widocznosc/topbar actions dla czesci
  nowych kategorii;
- istnieje duzo runtime evidence wokol Bakery, lights, texture, VT i support.

Nadal otwarte:

- brak potwierdzonego `module.ifo` area index jako zrodla listy areas;
- brak `.gic` parse/preserve jako first-class area component;
- brak `SpawnPointList` encounterow;
- brak pelnego ARE root parity: scripts, gameplay flags, comments,
  loadscreen, creator/expansion, unknown passthrough;
- brak area writer/export/round-trip;
- brak stabilnego material/texture proof dla Bakery po wszystkich zmianach;
- brak jednoznacznego, udokumentowanego modelu tile crop/void mask;
- brak Toolset-oracle proofu dla aktualnej wersji po wszystkich patchach;
- worktree jest tak szeroki, ze przyczyna regresu jest trudna do przypisania.

## 7. Twarda bramka dla kolejnych zmian

Nie ruszac `workspaceTerrainMesh.ts`, `workspaceObjectMeshLayer.ts`,
`WorkspaceCanvasViewport.tsx` ani capture script semantycznie, dopoki nie ma
pakietu dowodowego dla targetu.

Minimalny pakiet dla `enon_bakery`:

- `module.ifo` area entry albo jawny status `not parsed`;
- raw `.are` JSON;
- raw `.git` JSON;
- `.gic` JSON albo `missing`;
- `.set` tile extract dla 16 tile;
- `objects.csv` z source X/Y/Z/Bearing/Static/Useable/VT;
- Toolset oracle PNG top-down;
- Web PNG top-down z tego samego kadru;
- frame JSON z texture/model/tile/VT/support evidence;
- `comparison.json` z jedna konkretna roznica obrazu.

Bez tego wolno robic tylko proof-path work, np. stabilizacje capture albo
eksport source packa. Nie wolno zmieniac semantyki renderu.

## 8. Kolejka audytu/napraw po tym watku

P0:

1. Zamrozic aktualny diff logiczny Areas do listy plikow i przypisac kazdy
   zmieniony plik do kategorii: `data contract`, `render semantics`,
   `proof infrastructure`, `UI`, `tests`, `unrelated`.

2. Zrobic `enon_bakery-source-pack` bez zadnego patcha renderu.

3. Ustalic jeden kontrakt tile pipeline:
   `ARE Tile_List -> SET tile section -> MDL render meshes -> crop/void/mask`.

4. Ustalic jeden kontrakt object pipeline:
   `GIT placement -> Static/Useable -> VisualTransform -> render transform`.

5. Powtorzyc strict capture tylko gdy tekstury sa ready. Jesli nie sa ready,
   status `blocked_texture_delivery`, nie `proof`.

P1:

6. Domknac `module.ifo` area list.

7. Domknac `.gic` parse/preserve.

8. Domknac `SpawnPointList`.

9. Rozszerzyc ARE root fields i passthrough.

10. Zaprojektowac area writer/export/round-trip.

P2:

11. Dopiero po P0/P1 wracac do wizualnego parity Bakery: kolor, crop, maski,
    placeable overlay, support surfaces.

## 9. Definicja "zrobione" dla Areas

Areas sa "zrobione" dopiero gdy:

- lista areas pochodzi z `module.ifo` i ma diagnostyke rozjazdow z plikami;
- `.are`, `.git`, `.gic` sa parsowane lub preserve/passthroughowane;
- wszystkie listy GIT maja backend/API/frontend/test coverage;
- Bakery i co najmniej jeden drugi area maja Toolset-vs-Web top-down proof;
- frame ma `rendererStatus=ready` i tekstury gotowe albo final mowi `blocked`;
- writer/export/round-trip nie gubi znanych ani nieznanych pol;
- kazda zmiana renderu ma jedna hipoteze i jeden screenshot przed/po.

Krotko: obecny watek zostawil realne fragmenty, ale tez pokazal, ze dalsza
praca bez source packa i bramki oracle bedzie tylko produkowac nowe spaghetti.
