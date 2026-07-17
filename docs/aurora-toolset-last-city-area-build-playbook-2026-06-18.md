# Aurora Toolset: Last City area build playbook

Data: 2026-06-18

Rola: praktyczny playbook na jutro dla samodzielnego rozpoznawania i budowania
malych obszarow w stylu Last City. Ten dokument nie jest dowodem wykonania
nowej lokacji. Jest instrukcja pracy z aktualnych ORCH dowodow, kolejki
`aurora-toolset-area-building-workflow-queue-2026-06-18.md` i istniejacych
notatek atomow.

Zasada nadrzedna: awansujemy tylko to, co ma realny screenshot/live summary.
Brak dowodu oznacza `blocker` albo `gap`, nie domysl.

## Aktualny stan dowodow

Najmocniejsze ORCH dowody z tej serii:

- `ORCH-001a`: modul `the_last_city - codex.mod` zaladowal sie (`loaded=true`,
  title z modulem), ale finalna klatka miala popup `Error`. Popup zostal
  pozniej wyczyszczony celowanym `WM_COMMAND IDOK`, wiec przed jutrem trzeba
  zaczac od clean screenshotu Toolsetu, nie od zakladania ze UI jest czysty.
- `ORCH-001d`: galaz `Areas` rozwija sie w drzewie. Hash before/after sie
  zmienil, Toolset odpowiadal.
- `ORCH-001e`: proba otwarcia `_ikea` podwojnym kliknieciem nie jest dowodem
  otwarcia area. Hash sie zmienil, ale `responding=false`. Traktowac jako
  blocker dla doubleclick-open.
- `ORCH-001f`: Enter na wpisie area otworzyl widoczny canvas/tab
  `_winds_houses`; before/after hash rozny, `responding=true`. To jest aktualna
  sciezka otwierania area z ORCH.
- `ORCH-002`: `Environment -> Fog` przez celowane `WM_COMMAND 106` na otwartej
  area ma czyste before/after/rollback: after rozny, final identyczny z before,
  `responding=true`.
- `ORCH-003`: aktualna area pozwala rozwijac `Placeables` w drzewie celowanymi
  kliknieciami do `TTreeView`; after rozny i Toolset odpowiadal. Pierwszy
  collapse nie wrocil bitowo do before, a `ORCH-003b` zrobil osobny cleanup.
  To jest dowod drzewa/placeables pulse, nie dowod dodania placeable.

Dowody spoza ORCH, ktore wolno uzyc jako praktyczne atomy:

- Kolejka `ABQ-001..011` opisuje minimalny workflow: baseline area, single tile
  paint, placeable add/move/properties, lighting/fog, final validation pack.
- `terrain paint Floor Up, MAIN` ma status `mutated-live` dla jednego tile +
  rollback, bez `verified-after-reopen`.
- `terrain group preview` ma status `opened-live` / `partial-live`; group paint
  nadal nierozstrzygniety.
- Placeable add/rename/flags/appearance maja starsze dowody
  `verified-after-reopen`; ORCH-003 na dzisiaj potwierdza tylko drzewo
  Placeables.
- Door Properties i Area Transition sa `opened-live`; `Setup Area Transition`
  jest `gap`.
- Trigger Properties dla istniejacego triggera jest `safe-repeatable`; nowe
  trigger volume i binding skryptu sa `gap`.
- Sound Properties dla istniejacego markera sa `opened-live`; `Play/Stop` i
  volume byly wykonane live, ale screenshot nie dowodzi slyszalnosci.
- Area Properties `enon_bakery` sa `opened-live`; mutacja wartosci fog/lighting
  w properties nadal nie ma kontrolowanego dowodu.

## Zasady operacyjne na jutro

- Nie pracowac na krytycznym obszarze bez osobnej zgody.
- Nie zapisywac modulu bez jawnej zgody.
- Nie uzywac globalnej myszy ani globalnego `SendKeys`.
- Kazdy atom zaczyna sie od screena before z nazwa area/obiektu i konczy
  screenem finalnym bez modali.
- `Cancel` jest domyslnym wyjsciem przy rozpoznaniu. `OK` tylko przy swiadomej
  mutacji.
- Po kazdym atomie przywrocic czytelny widok: `Select Objects`, `Show All`,
  wlasciwa paleta, znany stan `Display Grid`, `Fog`, `Use Area Lighting`.
- Nie liczyc dialogu, zielonego preview ani parserowego odczytu jako sukcesu
  mutacji bez after-screena i rollback/reopen, zalezne od atomu.

## Area open

Cel: wejsc w realny canvas area i miec baseline do budowania.

Praktyczna sciezka z aktualnych ORCH dowodow:

1. Potwierdzic, ze `TfrmFrame` pokazuje `the_last_city - codex.mod` i nie ma
   widocznego popupu `Error`.
2. Rozwinac `Areas` w lewym drzewie. `ORCH-001d` potwierdza, ze to dziala i
   daje widoczny diff.
3. Wybrac area w drzewie.
4. Preferowac otwarcie przez Enter na wybranym wpisie area. `ORCH-001f`
   potwierdzil canvas/tab `_winds_houses` i `responding=true`.
5. Zrobic baseline screenshot: cale okno, drzewo area, aktywny tab/canvas.

Blockery:

- Doubleclick-open z `ORCH-001e` nie jest sciezka sukcesu, bo zakonczyl sie
  `responding=false`.
- `enon_bakery` ma bogate notatki properties/lighting, ale najnowszy ORCH area
  open potwierdzil `_winds_houses`, nie `enon_bakery`.
- Jesli widac popup albo `responding=false`, pierwszym atomem jest cleanup lub
  restart/recovery, nie budowanie.

## Tiles, groups, features

Cel: zbudowac mala forme Last City przez pojedyncze tile, a grupy traktowac
ostroznie.

Single tile:

1. Start tylko na testowej area albo po zgodzie na probna mutacje.
2. Przelaczyc palete na `Terrain`.
3. Wybrac pojedynczy tile typu `[T] Floor Up, MAIN`, jesli pasuje do tilesetu.
4. Wymagac zielonego preview w konkretnej kratce.
5. Kliknac raz, zrobic after screenshot.
6. Jesli atom probny, natychmiast `Undo`, potem screen rollback i restore do
   `Placeables` + `Select`.

Status: single tile paint ma dowod `mutated-live` + rollback, ale nie ma
`verified-after-reopen` ani save/reopen.

Groups:

1. Rozwinac `Terrain -> Groups`.
2. Traktowac liste jako tileset-dependent. Nie przenosic nazwy grupy z jednej
   area na druga bez aktualnego screena.
3. Najpierw robic preview-only. Screen musi pokazac footprint, kolor preview i
   konflikt albo brak konfliktu.
4. Group paint tylko w test area i tylko gdy before/after jest oczywisty.

Blockery:

- `Group paint` pozostaje `gap` / nierozstrzygniety. Nie promowac grupy do
  `mutated-live` bez wyraznej zmiany geometrii.
- `Tile Properties` nadal nie ma stabilnego opened-live dialogu; popup byl
  rozpoznany, ale aktywacja pozycji nie zostala domknieta.
- `Features` sa widoczne jako kategoria palety terrain, ale aktualny playbook
  nie ma dowodu mutacji feature. Uzywac tylko do rozpoznania, nie do budowy
  bez osobnego atomu.

## Placeables

Cel: dodac i ustawic prosty clutter Last City: barrel, crate, brazier,
workbench, urban debris albo podobny bezpieczny template.

Co jest potwierdzone:

- Starsze atomy add/rename/flags/appearance maja `verified-after-reopen`.
- `ORCH-003` potwierdza swiezo, ze w aktualnym stanie mozna pracowac z
  drzewem `Placeables` przez targetowane komunikaty i cleanup.

Jutrzejsza sciezka:

1. Na baseline area zrobic screenshot object count/drzewa przed dodaniem.
2. Wybrac jeden template z palety placeables. Nie uzywac nieznanego template,
   jesli jego skutki sa szerokie albo systemowe.
3. Dodac jedna instancje.
4. Zrobic screen canvasu z zaznaczonym obiektem i screen drzewa/object count.
5. Otworzyc `Placeable Object Properties`.
6. Nadac roboczy Name/Tag, np. `lc_test_prop_01`, tylko jesli atom zaklada
   mutacje.
7. Po `OK` ponownie otworzyc properties i potwierdzic wartosc.
8. Przesunac obiekt osobnym atomem. Object count nie moze sie zmienic.

Blockery:

- Najnowszy ORCH placeables pulse nie dowodzi dodania obiektu.
- Brak dokladnej edycji wspolrzednych (`Adjust Location` nadal wymaga osobnego
  stabilnego atomu).
- Brak bezpiecznego delete/copy/duplicate atomu; nie kasowac przypadkowo
  dodanego obiektu bez osobnej procedury.

## Doors and transitions

Cel: rozpoznac drzwi i przygotowac przejscie, ale nie konfigurowac targetu bez
testowego obiektu albo zgody.

Co jest potwierdzone:

- `Door Properties` i karty `Basic`, `Scripts`, `Lock`, `Description`,
  `Area Transition`, `Advanced`, `Comments`, `Trap` sa `opened-live`.
- `Area Transition` pokazuje pola `Destination Type`, `Destination Tag`,
  loading screen i przycisk `Setup Area Transition`.

Jutrzejsza sciezka obserwacyjna:

1. Wybrac istniejace drzwi testowe albo tylko drzwi do odczytu.
2. Otworzyc `Door Properties`.
3. Zrobic screen `Basic`, `Lock/Trap` i `Area Transition`.
4. Zanotowac destination fields jako stan startowy.
5. Zamknac `Cancel`.

Blockery:

- `Setup Area Transition` jest `gap` i bylo celowo nieklikane.
- Nie ma dowodu mutacji targetu ani walidacji, ze target area/door/waypoint
  zostal poprawnie przypiety.
- Nie ma bezpiecznego testowego duplikatu drzwi w aktualnej sekwencji.

## Triggers

Cel: rozpoznac trigger eventu dla sceny Last City, najpierw bez tworzenia
nowego volume.

Co jest potwierdzone:

- Istniejacy trigger -> `Trigger Properties` jest `safe-repeatable` dla
  otwarcia i przejscia zakladek.
- Dla triggerow dobra lokacja treningowa to `d_und`; `hx_tygiel_under` w jednej
  probie nie pokazal dzieci pod `Triggers`.
- Po triggerach trzeba sprawdzic czytelnosc screena, bo overlay trigger volumes
  i markerow moze zaslonic pozniejsze dowody.

Jutrzejsza sciezka:

1. Uzyc istniejacego triggera.
2. Otworzyc `Trigger Properties`.
3. Zrobic screen `Basic`, `Scripts`, `Advanced`, `Comments`.
4. Dla skryptow tylko rozpoznac sloty: `OnClick`, `OnEnter`, `OnExit`,
   `OnHeartbeat`, `OnUserDefined`.
5. Resource picker albo Script Editor zamykac `Cancel` / `Exit` bez save,
   chyba ze jest osobny atom mutacji.

Blockery:

- Rysowanie nowego trigger volume jest `gap`.
- Binding skryptu do triggera nie ma kontrolowanego `verified-after-reopen`.
- Nie promowac samego otwarcia Script Editora jako dowodu przypisania skryptu.

## Sounds

Cel: zrobic ambient Last City przez istniejacy sound marker albo przygotowac
osobny atom dodania markera.

Co jest potwierdzone:

- `Sound Properties` dla istniejacego sounda sa `opened-live`.
- `hx_tygiel_under -> Sounds -> Fireplace` byl dobrym targetem treningowym.
- `Play/Stop` mozna wykonac live, a volume ma raw skale `0..127`.

Jutrzejsza sciezka obserwacyjna:

1. Wybrac istniejacy sound marker.
2. Otworzyc `Sound Properties`.
3. Zrobic screen `Basic`, `Positioning`, `Advanced`.
4. Na `Positioning` udokumentowac radius/cutoff/max volume distance/height.
5. Jesli testowane jest `Play`, po nim wykonac `Stop`.
6. Przy zmianach volume zapisac raw wartosc startowa i przywrocic ja przed
   `Cancel`.

Blockery:

- Screenshot nie dowodzi slyszalnosci audio.
- Brak kontrolowanej mutacji radius/cutoff/loop/random z reopenem.
- Brak dowodu dodania nowego sound markera.

## Fog and lighting

Cel: uzyskac klimat Last City bez zostawiania ciemnego, nieczytelnego widoku.

Fog:

1. `Environment -> Fog` ma najmocniejszy swiezy ORCH dowod.
2. Uzywac celowanego `WM_COMMAND 106` tylko jako widokowego toggle.
3. Wymagac before/after/final: after rozny, final matches before, Toolset
   responding.
4. Nie mylic tego z edycja wartosci fog w `Area Properties`.

Use Area Lighting:

1. Starsze dowody mowia, ze `Use Area Lighting` robi `enon_bakery` prawie
   czarna i wymaga natychmiastowego restore.
2. To podglad renderu, nie edycja wartosci lighting.
3. Po wlaczeniu zawsze wykonac drugi toggle i finalny czytelny screenshot.

Area Properties:

1. `Area Properties` dla `enon_bakery` sa `opened-live`.
2. Environment Options pokazywaly m.in. `Always Dark`,
   `Moon Fog Amount = 10`, `Fog Clip Distance = 45`, `Shadow Opacity = 60`.
3. Rozpoznanie properties zamykac `Cancel`.

Blockery:

- Mutacja wartosci fog/lighting/day-night w `Area Properties` nadal nie ma
  kontrolowanego before/after/reopen.
- Swiezy ORCH fog success byl na otwartej area z ORCH, a nie dowodzi jeszcze
  pelnej konfiguracji klimatu Last City.
- `Display Grid` bywa tylko menu-state/no visual diff; dla tile alignment
  wymagac dodatkowego visible proof albo oznaczyc jako `menu-state-only`.

## Screenshots and evidence gate

Kazdy atom ma minimalny pakiet:

1. `before`: full frame z Toolsetem, nazwa modulu, nazwa area/obiektu.
2. `action`: paleta/dialog/menu albo UI state, ktory pokazuje intencje.
3. `after`: rzeczywista zmiana canvasu albo otwarty dialog.
4. `reopen`: wymagany po `OK` dla properties, tagow, flags, sound radius,
   door transition i trigger binding.
5. `rollback/final`: clean frame bez modali, Toolset responding, przywrocone
   `Select Objects`, `Show All`, `Fog`/`Use Area Lighting` do stanu startowego.

Nie przechodzi bramki:

- screenshot z Codexem albo zlym prostokatem zamiast Toolsetu;
- popup/modal zaslaniajacy scene bez dokumentacji cleanup;
- `responding=false` bez dalszego recovery;
- parser-only readback jako dowod mutacji;
- zielony preview bez after-click;
- audio `Play` bez osobnego dowodu slyszalnosci;
- `OK` w properties bez reopen;
- finalny stan, w ktorym nadal aktywny jest Paint i nie wiadomo czy nastepny
  klik bedzie mutacja.

## Pierwsze 5 atomow jutro

1. `LC-001 clean module and area baseline`: potwierdzic clean Toolset,
   `the_last_city - codex.mod`, rozwiniete `Areas`, otworzyc area przez Enter
   jak w `ORCH-001f`, baseline screenshot.
2. `LC-002 evidence-safe view restore`: potwierdzic `Select Objects`,
   `Show All`, stan `Fog` i `Use Area Lighting`; jesli cos jest nieczytelne,
   restore i screenshot.
3. `LC-003 single tile preview/paint rollback`: na test area wybrac pojedynczy
   tile, zielony preview, jeden paint, after screenshot, `Undo`, restore.
4. `LC-004 one placeable add and identify`: dodac jeden bezpieczny clutter
   placeable, screenshot tree/object count, otworzyc properties, nadac roboczy
   Name/Tag tylko jesli jest zgoda na mutacje.
5. `LC-005 placeable move and reopened properties`: przesunac ten sam obiekt,
   potwierdzic object count bez zmian, finalny canvas i reopened properties.

Po tych pieciu atomach dopiero isc w drugi poziom: fog/lighting preview,
sound marker observation, door transition observation, trigger scripts
observation.
