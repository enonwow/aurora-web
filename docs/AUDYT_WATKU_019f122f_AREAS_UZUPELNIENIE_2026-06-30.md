# AUDYT_WATKU_019f122f_AREAS_UZUPELNIENIE_2026-06-30

Zakres: audyt watku `codex://threads/019f122f-5339-7961-91c4-f2dc9ba23904`
(`enon_bakery #3`) oraz uzupelnienie procedury Areas/placeables/parity na
podstawie:

- transkryptu watku;
- dekompilacji Aurory w `C:\Projects\New Folder\export`;
- lokalnych specyfikacji reverse w `C:\Projects\aurora-web`;
- zrodel zewnetrznych NWN/Aurora:
  - https://nwn.wiki/spaces/NWN1/pages/38174902/Area
  - https://nwn.wiki/spaces/NWN1/pages/38175366/GFF
  - https://nwnlexicon.com/TemplateToJson
  - https://github.com/niv/nwn-lib
  - https://cromfr.github.io/nwn-lib-d/

## 1. Werdykt

Watek nie zawiodl dlatego, ze nie robil zadnych realnych napraw. Zawiodl, bo
po realnych naprawach zbyt szybko zamienial lokalny sukces techniczny na
wniosek o parytecie wizualnym.

Najwiekszy blad procesu:

`metryka/test/API wyglada dobrze -> screen nadal wyglada gorzej -> agent dalej
hipotezuje i patchuje`

Poprawny tryb dla Areas musi byc:

`Toolset/Aurora oracle -> web capture -> roznica obrazu -> surowe GFF/decomp ->
jedna poprawka -> test -> nowy capture -> porownanie obrazu -> dopiero status`

Jesli nie ma swiezego oracle albo swiezego web capture, status to `blocked` albo
`proof missing`, nie `done`.

## 2. Co konkretnie poszlo zle w watku

### 2.1 Watek mylil dowod techniczny z dowodem wizualnym

Finalny stan watku raportowal np. renderer ready, modele gotowe, tekstury
applied i testy zielone. To sa wazne dowody infrastruktury, ale nie dowod, ze
obraz jest zgodny z Toolsetem.

Uzytkownik pozniej wskazal, ze screen wyglada gorzej niz na starcie. To
natychmiast uniewaznia status wizualny.

Regula:

- `renderer ready` nie znaczy `Aurora parity`;
- `textureStatus applied` nie znaczy `poprawne materialy i orientacje`;
- `VT evidence present` nie znaczy `VT semantycznie zgodne z Toolsetem`;
- `tsc/test zielony` nie znaczy `screen zgodny`.

### 2.2 Watek ruszal za duzo osi naraz

W jednym ciagu pojawily sie:

- kamera/kadr/oracle;
- globalny transform area;
- tile orientation;
- `Bearing`;
- `Adjust Location`;
- `VisualTransform`;
- placeable `Static`;
- material/texture primary refs;
- delivery path/proxy;
- retry decode DDS/TPC;
- runtime evidence snapshot.

To powoduje, ze po zlym screenie nie wiadomo, ktora zmiana pogorszyla obraz.

Regula:

- jedna hipoteza renderowa na jeden capture;
- jedna zmiana semantyki transformu na jeden capture;
- zmiany tekstur nie moga byc mieszane z osiami/VT, jezeli screen ma byc
  dowodem geometrii.

### 2.3 `Static` zostalo uzyte jako zbyt szeroki wniosek

Dekompilacja potwierdza, ze placeable ma pola `Useable` i `Static`, a `Static`
ma domyslna wartosc oparta o `!Useable`. To jest fakt.

Ale z tego faktu nie wynika automatycznie, ze kazde `Static=true` ma zawsze
ignorowac kazdy `VisualTransform` w naszym renderze. To trzeba potwierdzic
Toolset oracle per klasa obiektu/przypadek, szczegolnie na `enon_bakery`, gdzie
problem widac na screenie.

Bezpieczny wniosek:

- `isStatic` trzeba przenosic w danych, bo frontend nie moze zgadywac;
- decyzja `Static => effective VT identity` jest hipoteza renderowa, nie sam
  fakt z dekompilacji;
- przed uznaniem tej decyzji za poprawna potrzebny jest screenshot Toolset vs
  web dla obiektu statycznego z niezerowym VT.

### 2.4 Watek nie utrzymal hierarchii zrodel

Kolejnosc zrodel dla Areas powinna byc stala:

1. Surowe zasoby targetu: `.are`, `.git`, `.gic`, `module.ifo`, `.set`, `.2da`.
2. Dekompilacja Aurory: odczyt/zapis i konwersje jednostek.
3. Live Toolset oracle dla tego samego area i obiektu.
4. Web runtime capture dla tego samego area i kadru.
5. Internet / community docs / biblioteki, jako potwierdzenie formatow i
   narzedzi, nie jako zastepstwo dekompilacji.
6. Aktualny kod i testy.

Watek czesto zaczynal od punktu 6, a potem dopiero wracal do 1-3.

### 2.5 Brakowalo twardego rozdzielenia: proof-path fix vs parity fix

Naprawa snapshotu/evidence moze byc dobra, ale nie jest naprawa parytetu.

Regula:

- `proof-path fix`: ma przywrocic miernosc, nie zmieniac geometrii;
- `parity fix`: zmienia render/semantyke i wymaga przed/po screenshotu;
- tych dwoch typow nie wolno rozliczac jednym finalem.

## 3. Fakty z dekompilacji, ktore musza kotwiczyc dalsza prace

### 3.1 Placeable `Useable` / `Static`

Lokalne zrodlo:

- `C:\Projects\New Folder\export\decompiled_all.c:330044-330067`

Fakty:

- funkcja `FUN_0063bf74` czyta `Useable`;
- potem czyta `Static`;
- domysl dla `Static` jest powiazany z `Useable == false`;
- zapis rowniez utrwala `Static` i `Useable`
  (`decompiled_all.c:330086-330088`).

Kontrakt:

- parser musi czytac `Useable` i `Static`;
- API musi niesc `isStatic`;
- frontend nie moze ustawic `isStatic` tylko z `kind === placeables`;
- renderer nie moze zmieniac semantyki `Static/VT` bez oracle.

### 3.2 Bearing

Lokalne zrodlo:

- `C:\Projects\New Folder\export\decompiled_all.c:330534-330536`

Fakty:

- `Bearing` jest czytany z GFF;
- Aurora przelicza radiany na stopnie przez `57.295776`;
- odwrotna konwersja w innych sciezkach uzywa standardowego stopnie/radiany.

Kontrakt:

- backend/parser powinien jasno okreslac, czy payload niesie stopnie czy
  radiany;
- frontend scene powinien miec jedna jawna konwersje do radianow;
- nie wolno debugowac VT, dopoki `Bearing` nie jest wydrukowany w evidence jako
  `sourceBearing`, `sceneBearingRad` i `renderYaw`.

### 3.3 Pozycje X/Y/Z

Lokalne zrodlo:

- `C:\Projects\New Folder\export\decompiled_all.c:331841-331846`

Fakty:

- placeable instance czyta `XPosition`, `YPosition`, `ZPosition`;
- widoczna sciezka nie robi dowolnego mirrorowania osi;
- jedna sciezka koryguje Z o wartosc lokalna/terenowa, wiec Z trzeba traktowac
  ostroznie i dowodzic na obiekcie.

Kontrakt:

- mirror X/Z nie jest dozwolony jako "fix na oko";
- `Adjust Location` ma pokazywac jednostki Toolsetu i scene units obok siebie;
- round-trip musi miec test oraz runtime evidence dla konkretnego obiektu.

### 3.4 VisualTransform

Lokalne zrodlo:

- `C:\Projects\New Folder\export\decompiled_all.c:172515-172523`
- `C:\Projects\New Folder\export\decompiled_all.c:172873-172875`
- `C:\Projects\New Folder\export\strings.tsv:9253-9257`

Fakty:

- Aurora ma `VisTransformList`;
- Aurora ma tez strukture `VisualTransform`;
- zapis listy pojawia sie tylko przy nie-domyslnych skladowych;
- sama obecnosc listy nie rozstrzyga, jak Three ma mapowac pitch/yaw/roll.

Kontrakt:

- trzeba przechowywac `sourceVisualTransform` i `effectiveVisualTransform`;
- trzeba logowac skladanie yaw: `bearing`, `vtYaw`, `renderYaw`;
- nie wolno "foldowac" `RotateX` w yaw bez linii z dekompilacji albo oracle;
- static gating VT jest osobna hipoteza, nie wynik samego odczytu GFF.

### 3.5 Tile data

Lokalne zrodlo:

- `C:\Projects\New Folder\export\decompiled_all.c:255391-255400`
- `C:\Projects\New Folder\export\strings.tsv:10826-10827`

Fakty:

- `Tile_ID`, `Tile_Orientation`, `Tile_Height` sa czytane jawnie;
- dalej sa pola swiatel: `Tile_MainLight1`, `Tile_MainLight2`,
  `Tile_SrcLight1`, `Tile_SrcLight2`;
- w strings wystepuja tez `Tile_AnimLoop1/2/3`.

Kontrakt:

- tile orientation nie moze byc poprawiane tylko przez dopasowanie kadru;
- tile model orientation, imagemap orientation i camera/orbit to trzy rozne
  warstwy;
- kazda zmiana tile transformu wymaga side-by-side z Toolsetem.

### 3.6 Module area list

Lokalne zrodlo:

- `C:\Projects\New Folder\export\decompiled_all.c:263190-263198`
- `C:\Projects\New Folder\export\strings.tsv:11000-11078`

Fakty:

- Aurora czyta `Mod_Area_list`;
- wpis listy ma `Area_Name`;
- `module.ifo` jest zrodlem modulowej listy obszarow.

Kontrakt:

- lista areas nie moze byc tylko wynikiem skanu `.are`/`.git`;
- skan plikow jest fallbackiem i diagnostyka;
- poprawny UI powinien znac kolejnosc/listowanie z `module.ifo`.

### 3.7 GIT object lists

Lokalne zrodlo:

- `C:\Projects\New Folder\export\decompiled_all.c:221400-221460`
- `C:\Projects\New Folder\export\strings.tsv:10362-10377`

Fakty:

Aurora obsluguje co najmniej:

- `Creature List`;
- `Door List`;
- `Encounter List`;
- `Placeable List`;
- `SoundList`;
- `StoreList`;
- `TriggerList`;
- `WaypointList`;
- item list jako osobna lista GIT.

Kontrakt:

- Areas nie sa pelne, dopoki pipeline ma tylko
  `placeable/door/creature/item/sound`;
- `encounter/store/trigger/waypoint` musza przejsc przez typy, parser, API,
  mapper, cache key, object list i UI;
- bakery/placeable proof nie zamyka Areas jako domeny.

### 3.8 GIC

Lokalne zrodlo:

- `C:\Projects\New Folder\export\strings.tsv:8771`
- `C:\Projects\New Folder\git.csv:112`

Fakty:

- Toolset ma ostrzezenie, gdy `.git` nie ma odpowiadajacego `.are` albo `.gic`;
- `.gic` jest czescia integralnosci area, nie opcjonalna notatka do wyrzucenia.

Kontrakt:

- parser/snapshot musi przynajmniej wykrywac `.gic`;
- round-trip musi zachowywac komentarze/preservation;
- brak `.gic` powinien byc widoczny w diagnostyce area.

## 4. Fakty z internetu, ktore wzmacniaja uzupelnienie

### 4.1 ARE/GIT/GIC/module.ifo to nie wymysl lokalny

NWN Wiki opisuje Areas jako pliki `ARE` w GFF oraz podaje, ze ARE zawiera
settings, tileset id, size i tiles. Ten sam artykul opisuje role `GIC` jako
komentarzy Toolsetu oraz `GIT` jako dynamicznych danych area z instancjami
obiektow i sound properties:

- https://nwn.wiki/spaces/NWN1/pages/38174902/Area

Ten artykul podaje tez wazny limit Toolsetu: area generowane przez wizard maja
rozmiar od 2x2 do 32x32. To wzmacnia lokalny bug audit dotyczacy zbyt luznych
zakresow wymiarow.

### 4.2 `module.ifo` jest czescia formatu, nie dekoracja

NWN Wiki GFF wskazuje `module.ifo` jako module information file, czyli plik z
nazwa/start location/default scripts. Strona Area mowi, ze resref area jest
identyfikatorem uzywanym w module `.IFO`, a same `.are/.git/.gic` powinny byc
nazywane zgodnie z resrefem area:

- https://nwn.wiki/spaces/NWN1/pages/38175366/GFF
- https://nwn.wiki/spaces/NWN1/pages/38174902/Area

Wniosek: w aurora-web brak `module.ifo` w area list to nie kosmetyka, tylko
utrata autorytatywnego indeksu.

### 4.3 CAF/JSON potwierdza trojke ARE/GIT/GIC

NWN Lexicon `TemplateToJson` wymienia `RESTYPE_CAF` jako Combined Area Format
zlozony z `RESTYPE_ARE`, `RESTYPE_GIT` i `RESTYPE_GIC`. Ta sama strona wymienia
typy resource dla Trigger, Placeable, Door, Waypoint, Encounter, Sound, Merchant
Store i IFO:

- https://nwnlexicon.com/TemplateToJson

Wniosek: zewnetrzne API NWN:EE tez traktuje area jako zestaw ARE/GIT/GIC, a nie
sam `.are` plus wybrane obiekty.

### 4.4 Narzedzia community potwierdzaja round-trip jako normalny workflow

`nwn-lib` deklaruje read/write dla GFF 3.2, w tym `are`, `git`, `gic`, `ifo`,
oraz JSON/YAML/native GFF. `nwn-lib-d` ma `nwn-gff` do konwersji GFF do text/JSON
i edycji drzewa:

- https://github.com/niv/nwn-lib
- https://cromfr.github.io/nwn-lib-d/

Wniosek: przy trudnych bledach semantycznych nalezy zrzucac target `.are/.git`
do stabilnego JSON/text i porownywac przed/po. Test jednostkowy na sztucznym GFF
nie wystarcza.

### 4.5 Uwaga o sprzecznych opisach GIT/GIC

Jedna tabela w zewnetrznym opisie GFF ma nazewnictwo, ktore moze wygladac jak
zamiana `GIT`/`GIC`. Dlatego dla semantyki `GIT = dynamic instances` i
`GIC = comments/preservation` w tym repo decydujace sa:

- dekompilacja Aurory;
- lokalny string Toolsetu o brakujacym `ARE or GIC`;
- strona Area z nwn.wiki;
- rzeczywiste zasoby target module.

Internet ma wspierac, nie zastapic reverse evidence.

## 5. Ustalony kontrakt pracy po tym audycie

### 5.1 Bramka przed edycja kodu

Przed kazda zmiana render/parity musza istniec:

- target area id/resref;
- surowy `.are`;
- surowy `.git`;
- `.gic` albo jawny status `missing`;
- wpis `module.ifo` albo jawny status `not parsed yet`;
- Toolset oracle screenshot albo status `oracle blocked`;
- web screenshot z tego samego targetu;
- frame JSON z renderer evidence;
- lista konkretnej roznicy obrazu;
- linie dekompilacji albo raw GFF field, ktore uzasadniaja hipoteze.

Jesli ktoregos brakuje, mozna poprawiac tylko proof infrastructure, nie
semantyke renderu.

### 5.2 Bramka po edycji kodu

Po kazdej poprawce:

- test dla zmienionej semantyki;
- `tsc`/build dla dotknietej strony;
- swiezy capture;
- swiezy screenshot;
- status `Responding=true`/brak stale snapshot;
- porownanie z Toolset oracle;
- lista plikow zmienionych przez ten ruch;
- decyzja: improved / worse / inconclusive / blocked.

Jesli screen jest gorszy, status `worse`, nawet przy zielonych testach.

### 5.3 Zakazane skroty

Zakazane w Areas/placeables parity:

- "camera looks close" jako oracle;
- "web oracle camera" zamiast Toolset oracle;
- mirror osi bez linii dekompilacji albo raw GFF plus screenshot;
- traktowanie `Static` jako dowodu na brak VT bez testu w Toolsecie;
- laczenie zmian texture delivery z transformami w jednym wniosku wizualnym;
- final `done`, gdy brakuje screenshotu albo comparison;
- ignorowanie `.gic`;
- nazywanie Areas zamknietymi po proofie tylko dla bakery/placeables.

## 6. Konkretne uzupelnienie dla nastepnego workera

Wklej to jako kontrakt startowy dla kolejnego watku/worker task:

```text
Pracujesz w C:\Projects\aurora-web. Dla Areas/placeables nie wolno zgadywac.

Kolejnosc jest obowiazkowa:
1. Ustal target area/resref i obiekt widoczny na screenie.
2. Pobierz/zweryfikuj surowe .are, .git, .gic oraz module.ifo.
3. Zrob albo znajdz swiezy Toolset oracle screenshot dla tego samego targetu.
4. Zrob swiezy web runtime capture i frame JSON.
5. Opisz jedna konkretna roznice obrazu.
6. Dopiero wtedy sprawdz dekompilacje:
   - Static/Useable: decompiled_all.c:330044-330067
   - Bearing: decompiled_all.c:330534-330536
   - X/Y/Z: decompiled_all.c:331841-331846
   - VisualTransform: decompiled_all.c:172515-172523, 172873-172875
   - Tile fields: decompiled_all.c:255391-255400
   - Mod_Area_list: decompiled_all.c:263190-263198
   - GIT lists: decompiled_all.c:221400-221460
7. Zmien tylko jedna rzecz.
8. Uruchom testy dla tej rzeczy i tsc/build.
9. Zrob nowy capture.
10. Jesli screen nie jest lepszy wzgledem Toolset oracle, nie mow "done".

Wazne:
- isStatic nalezy przenosic z GIT/API, nie zgadywac po kind.
- Static=>ignore VT wymaga oracle, nie wynika automatycznie z samego pola Static.
- Bearing source i scene radiany musza byc jawnie pokazane w evidence.
- Tile orientation, model orientation, imagemap orientation i camera to osobne warstwy.
- Texture delivery fix nie zamyka transform parity.
- Areas jako domena nie sa zamkniete, dopoki brakuje Encounter/Store/Trigger/Waypoint, GIC i module.ifo.
```

## 7. Najblizsze poprawki wynikajace z audytu watku

### P0: zablokowac strzelanie w proofach

Dodac guard do capture/report:

- jesli brak Toolset oracle i task jest parity, status nie moze byc `passed`;
- jesli screenshot jest starszy niz ostatnia zmiana pliku renderu, status
  `stale proof`;
- jesli finalny raport ma tylko metrics bez oracle compare, status
  `technical proof only`.

### P0: rozdzielic `source VT` i `effective VT`

To juz czesciowo zaczeto, ale trzeba dopelnic:

- per object: `sourceVisualTransform`;
- per object: `effectiveVisualTransform`;
- per object: `sourceStatic`, `sourceUseable`;
- per object: `bearingSourceUnit`, `bearingSceneRad`, `renderYaw`;
- per object: `oracleComparisonStatus`.

### P0: zweryfikowac static VT na Toolsecie

Minimalny test live:

- wybrac placeable statyczny z niezerowym `VisTransformList`;
- screenshot Toolset;
- screenshot web z VT applied;
- screenshot web z VT identity;
- wybrac wariant zgodny z Toolsetem;
- dopiero wtedy utrwalic gating.

### P1: area source pack per target

Dla kazdego target area (`enon_bakery`, `_ikea`, itd.) generowac paczke:

- `area.are.json`;
- `area.git.json`;
- `area.gic.json` albo `missing`;
- `module.ifo.area-entry.json`;
- `set-tiles.json`;
- `objects.csv`;
- `oracle.png`;
- `web.png`;
- `frame.json`;
- `comparison.json`.

### P1: domknac caly Areas model

Ten watek skupil sie na bakery/placeables. To nie domyka Areas. Nadal trzeba:

- `module.ifo` area list;
- `.gic`;
- `Encounter List` + `SpawnPointList`;
- `StoreList`;
- `TriggerList`;
- `WaypointList`;
- ARE root fields i passthrough;
- writer/export/round-trip.

## 8. Podsumowanie dla decyzji

Po tym audycie nie nalezy kontynuowac stylu:

`naprawiam kolejna hipoteze, bo test albo metric sie poprawil`.

Nalezy kontynuowac styl:

`blokuje status, dopoki swiezy obraz nie zgadza sie z Toolset oracle`.

Najwazniejsze uzupelnienie merytoryczne:

- `Static` i `Useable` sa faktycznymi polami placeable z dekompilacji;
- `Bearing` i pozycje sa jawnie czytane, wiec mirror/konwersje musza byc
  uzasadnione;
- `VisualTransform` istnieje w Aurorze jako osobna struktura/lista, ale jego
  mapowanie do Three nie moze byc wymyslane z nazw osi;
- `Areas` obejmuje ARE/GIT/GIC/module.ifo oraz pelna rodzine list GIT, nie tylko
  bakery/placeables.
