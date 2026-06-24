# Aurora Toolset: location workflow recipes

Data: 2026-06-18

Cel tego dokumentu: zamienic atomy Aurora Toolset na praktyczne przepisy i
tickety do budowania malej lokacji. To nie jest deklaracja, ze cale workflowy
sa juz `verified-live`. Status przepisu jest tylko tak mocny, jak najslabszy
atom w lancuchu.

## Zasady kompozycji

- Nie dotykac live Aurory w ramach tych ticketow. Kazdy kolejny eksperyment
  powinien byc maly, screenowany, bez zapisu modulu, chyba ze uzytkownik
  wyrazi osobna zgode.
- Nie promowac workflow do `verified-live`, jezeli dowod jest tylko
  `screen-supported`, `partial-live` albo `gap`.
- Dla mutacji wymagac screenshotu przed/po, reopened properties albo innego
  twardego dowodu. Techniczny readback nie wystarcza.
- Dla okien wielozakladkowych wymagac serii screenow: overview plus kazda
  widoczna zakladka albo wiekszy panel funkcjonalny.
- Po kazdym atomie przywrocic czytelny stan widoku: `Select Objects`, paleta
  `Placeables`, `Show All`, oraz startowy stan `Fog`, `Use Area Lighting` i
  `Display Grid`.

## Szybki status rodzin atomow

| Rodzina | Status operacyjny | Wplyw na workflow |
| --- | --- | --- |
| Placeable add/rename/appearance/flags/numeric/move | `verified-after-reopen` albo `safe-repeatable` dla znanych wariantow | Najmocniejszy skladnik dekoracji i prostych propow. |
| Placeable inventory | `gap`; parser wskazal `_ikea` `ZEP_SAFE001`, ale live inventory placeable nie otwarto | Blokuje pelna skrzynie z lootem. |
| Door Properties / Area Transition tab | `opened-live`; `Setup Area Transition` `gap` | Blokuje realne przejscie miedzy obszarami. |
| Sound Properties / Play/Stop / volume dialog-only | `opened-live`; playback/volume z `Cancel` dobrze opisane | Dobry kandydat na ambient oparty o istniejacy marker; nowe placement/radius mutation nadal ostroznie. |
| Area Properties / Environment Options | `opened-live`; widokowe `Fog` i `Use Area Lighting` `safe-repeatable` | Gotowe do podgladu klimatu, ale nie do edycji wartosci bez osobnego eksperymentu. |
| Existing Trigger Properties | `safe-repeatable`; tworzenie nowego trigger volume `gap` | Mozna uczyc event scripts na istniejacym triggerze; nowy trigger to osobny atom. |
| Creature Properties / Inventory | `opened-live` | Dobry start dla NPC, ale creation i conversation binding nie sa jeszcze potwierdzone. |
| Conversation Editor / Script Editor / resource pickers | `opened-live` obserwacyjnie | Edycja, zapis, kompilacja i binding wymagaja osobnych mutujacych atomow. |
| Tile/Terrain | `partial-live`; pojedynczy `[T] Floor Up, MAIN` `mutated-live` z `Undo`; `Tile Properties` i group paint `gap` | Da sie zrobic maly test geometrii, ale nie pelny prefab/group/tile lighting. |
| Validation view tools | `safe-repeatable` dla `Display Grid`, `Show None/All`, `Fog`, `Use Area Lighting`; `Go to Start Location` `partial-live` | Gotowe jako kontrola screenow po zmianach, z ostroznym resetem kamery. |

## Ticket LWR-001: mala izba/pokoj z tile i dekoracjami

Cel: zbudowac minimalny czytelny pokoj albo rozszerzenie pokoju: jeden
bezpieczny tile/terrain krok plus jedna lub dwie dekoracje/placeables.

Atomy skladowe:

- `Area context View Area`: `opened-live` dla `enon_bakery`.
- `Display Grid`: `safe-repeatable`, ID `104`, przywracac stan startowy.
- `Terrain palette`: `partial-live`; paleta `Terrain`, rooty `Features`,
  `Groups`, `Terrain`, lista `[C]` i `[T]`.
- `Terrain paint [T] Floor Up, MAIN`: `mutated-live` z toolbar `Undo`, brak
  `verified-after-reopen`.
- `Terrain group preview`: `opened-live`; group paint pozostaje `gap`.
- `Tile Properties`: `gap`; popup widoczny, dialog nieotwarty.
- `Add new placeable`, `Rename`, `Move selected placeable`: odpowiednio
  `verified-after-reopen` / `safe-repeatable` dla znanego wariantu `Barrel`.
- `Placeable properties/tabs`: `safe-repeatable`.
- `Object Filters Show None/All`: `safe-repeatable` do screenow geometrii.

Status przepisu:

- `near-live-composable`, ale nie `verified-live`.
- Najsilniejsza sciezka to: istniejacy canvas -> pojedynczy tile paint z
  zielonego preview -> `Undo` albo swiadome pozostawienie w sesji -> dodanie i
  przesuniecie dekoracji placeable -> reopened properties.
- Nie uzywac `Tile Properties` ani group paint jako wymaganego skladnika tego
  przepisu, bo oba pozostaja gapami.

Minimalny live eksperyment nastepny:

1. Uzyc testowego albo uzgodnionego obszaru, najlepiej z czytelnym canvasem.
2. Zrobic screenshot startowy i odczyt, czy grid jest wlaczony.
3. Wybrac `[T] Floor Up, MAIN`; kliknac tylko przy zielonym preview.
4. Dodac jeden znany placeable z palety, np. container/dekoracje, nazwac
   `room_test_prop` i przesunac go w kadrze.
5. Otworzyc properties ponownie i potwierdzic nazwe/tag/appearance.
6. Nie zapisywac modulu. Jesli eksperyment jest tylko probny, cofnac tile
   przez toolbar `Undo`; placeable cleanup wymaga osobnej decyzji, bo `Remove`
   nie jest jeszcze bezpiecznie opisanym atomem tego przepisu.

Rollback:

- Dla terrain: toolbar `Undo`, potem `Select Objects` (`WM_COMMAND 74`) i
  powrot na palete `Placeables`.
- Dla preview: powrot na ikone `Placeables`, bo `Esc` nie zawsze zdejmowal
  zielony outline.
- Dla widoku: przywrocic `Display Grid`, `Show All`, `Fog` off/on zgodnie ze
  stanem startowym i `Use Area Lighting` do stanu startowego.
- Nie zapisywac modulu. Nie usuwac obiektow przez `Remove` bez osobnej zgody.

Screeny wymagane do awansu:

- Stan startowy canvasu z nazwa area.
- Zielony preview tile przed kliknieciem.
- Widoczny before/after po paint, plus po `Undo` jezeli test jest cofniety.
- Paleta placeables z wybranym template.
- Object count przed/po dodaniu placeable.
- Dialog properties po nazwaniu i reopened properties po `OK`.
- Screenshot po move: zaznaczony ten sam placeable i object count bez zmiany.
- Finalny full-frame scene screenshot w czytelnym stanie.

## Ticket LWR-002: skrzynia z lootem

Cel: stworzyc albo wykorzystac pojemnik, ustawic go jako interaktywny i dodac
loot. W aktualnym stanie recipe dzieli sie na gotowy "container shell" i
niegotowy "loot contents".

Atomy skladowe:

- `Add new placeable`: `verified-after-reopen` dla `Barrel`.
- `Placeable appearance`: `verified-after-reopen`; zmiana wygladu placeable
  dziala i byla potwierdzona po reopen.
- `Placeable flags Plot/Useable/Static`: `verified-after-reopen`; `Useable`
  blokuje `Static`.
- `Placeable properties/tabs`: `safe-repeatable`.
- `Placeable inventory / contents`: `gap`; kandydat parserowy to `_ikea`
  `ZEP_SAFE001` / `zep_safe002`, `hasInventory=true`.
- `Creature inventory`: `opened-live`, ale nie jest dowodem placeable
  inventory i nie moze promowac skrzyni.

Status przepisu:

- `mixed`.
- Mozna zrobic wyglad i podstawowe flagi skrzyni/placeable.
- Nie mozna jeszcze uczciwie powiedziec, ze umiemy dodac loot do placeable w
  live Toolsecie.

Minimalny live eksperyment nastepny:

1. Otworzyc `_ikea`.
2. Stabilnie znalezc `ZEP_SAFE001` / `zep_safe002` albo inny placeable z
   `hasInventory=true`.
3. Otworzyc `Placeable Object Properties` dla tego konkretnego celu.
4. Zrobic screenshot `Basic` z widocznym stanem inventory/przyciskiem
   `Inventory...`.
5. Kliknac `Inventory...`, udokumentowac `Inventory Contents`, zamknac przez
   `Cancel`.
6. Nie dodawac itemow w pierwszym przebiegu.

Rollback:

- `Inventory Contents`: `Cancel`.
- `Placeable Object Properties`: `Cancel`, chyba ze celem jest jawna mutacja.
- Nie wlaczac `Has Inventory` na obiekcie bez inventory w tym samym atomie.
- Nie zapisywac modulu.

Screeny wymagane do awansu:

- Parser/source note z kandydatem nie wystarcza; musi byc live screen Toolsetu.
- Drzewo `_ikea -> Placeables` z wybranym celem albo Find Instance z widocznym
  wynikiem.
- `Placeable Object Properties` dla `ZEP_SAFE001` albo innego potwierdzonego
  pojemnika.
- `Inventory Contents` overview i panele zawartosci/palety itemow.
- Po `Cancel`: powrot do properties i/lub sceny bez modala.
- Dla przyszlego `mutated-live`: przed/po dodaniu jednego itemu, `OK`, reopen
  inventory i widoczny item w contents.

## Ticket LWR-003: drzwi z przejsciem

Cel: skonfigurowac drzwi jako przejscie do target area/door/waypoint. Obecnie
dobrze znamy properties drzwi, ale nie wykonujemy jeszcze `Setup Area
Transition`.

Atomy skladowe:

- `Door Properties`: `opened-live` na `hx_tygiel_under`.
- Zakladki `Basic`, `Scripts`, `Lock`, `Description`, `Area Transition`,
  `Advanced`, `Comments`, `Trap`: `opened-live`.
- `Area Transition` tab: `opened-live`; pola `Destination Tag`,
  `Destination Type`, `Loading Screen`, `Setup Area Transition`.
- `Setup Area Transition`: `gap`, celowo nie klikane.
- Door placement/add new door: nie jest jeszcze pelnym live atomem w tej
  paczce.

Status przepisu:

- `mixed`.
- Nadaje sie do ticketu obserwacyjnego i przygotowania mutacji.
- Nie jest gotowe jako realne polaczenie lokacji bez osobnego testowego celu i
  zgody.

Minimalny live eksperyment nastepny:

1. Wybrac testowe drzwi albo uzgodniony duplikat, nie krytyczne drzwi.
2. Otworzyc `Door Properties` i spisac stan `Basic`, `Lock`, `Trap`,
   `Advanced` i `Area Transition`.
3. Otworzyc `Setup Area Transition` tylko jesli eksperyment ma zgode na
   potencjalna mutacje; pierwszy klik powinien zakonczyc sie screenem i
   `Cancel`, jesli dialog to umozliwia.
4. Jesli konfiguracja jest wykonywana, ustawic najprostszy target
   Door/Waypoint i potwierdzic reopenem.

Rollback:

- W atomie obserwacyjnym: `Cancel` w `Door Properties`.
- Przed mutacja zrobic screenshot wszystkich wartosci startowych.
- Jesli test zmieni destination, przywrocic `Destination Type`, `Destination
  Tag`, loading screen, lock/trap do wartosci startowych i zweryfikowac
  reopenem. Nie zapisywac modulu bez zgody.

Screeny wymagane do awansu:

- Drzewo area z wybranymi drzwiami.
- `Door Properties` `Basic`, `Lock`, `Trap`, `Advanced` przed zmiana.
- `Area Transition` przed zmiana.
- Kazdy ekran `Setup Area Transition` albo resource picker.
- Po konfiguracji: `Area Transition` z targetem, screenshot target area/door
  albo waypointu.
- Reopened `Door Properties` po `OK`, pokazujace ten sam target.

## Ticket LWR-004: ambient zaulka/wnetrza

Cel: ustawic klimat miejsca przez sound marker, fog/lighting preview i
czytelna walidacje widoku. To jest przepis ambience-first, ale edycja
wartosci nadal musi byc osobnym atomem.

Atomy skladowe:

- `Sound Properties` dla `hx_tygiel_under -> Sounds -> Fireplace`:
  `opened-live`.
- `Play/Stop`: wykonane live przez `BM_CLICK`, ale screenshot nie dowodzi
  slyszalnosci audio.
- `Volume`: rozpoznany jako raw `0..127`; raw `127` to wizualne maksimum
  `10`; dialog-only z restore i `Cancel`.
- `Positioning`: `opened-live`; cutoff `10,0`, max volume distance `1,0`,
  height `1,5`.
- `Advanced`: `opened-live`; `Active`, `Play at all times`, `Seamlessly
  looping`.
- `Area Properties -> Environment Options`: `opened-live`.
- `Use Area Lighting`: `safe-repeatable` widokowo, ale na `enon_bakery`
  prawie zaciemnia scene.
- `Fog`: `safe-repeatable` widokowo, subtelny efekt, wymagac menu/toolbar
  evidence.

Status przepisu:

- `opened-live` / `screen-supported` dla finalnego ambient authoringu.
- Gotowe do rozpoznania istniejacego sounda i podgladu lighting/fog.
- Nie gotowe jako "dodaj nowy ambient od zera i zapisz", bo placement sound
  i trwale edycje radius/looping wymagaja osobnego testu.

Minimalny live eksperyment nastepny:

1. Na `hx_tygiel_under` otworzyc `Fireplace` sound i zrobic screeny kart.
2. Zmienic tylko dialogowo jedna wartosc, np. volume raw `64`, zrobic screen,
   przywrocic raw `127`, zrobic screen, `Cancel`.
3. Osobno na `enon_bakery` wlaczyc `Fog` i `Use Area Lighting` tylko jako
   podglad, zawsze z restore.
4. Nie nazywac tego audio-verified bez niezaleznego dowodu slyszalnosci.

Rollback:

- Volume: przywrocic raw `127` albo wartosc startowa.
- Sound properties: `Cancel`, nie `OK`.
- `Use Area Lighting`: drugi toggle do stanu startowego.
- `Fog`: drugi toggle do stanu startowego.
- Po ciemnym/fogowym widoku zrobic finalny screen przywroconego, czytelnego
  canvasu.

Screeny wymagane do awansu:

- Gesta scena z markerem sound i drzewem `Sounds`.
- `Sound Properties` `Basic`, `Positioning`, `Advanced`.
- `Play` i `Stop` jako UI evidence, plus osobna metoda audio evidence, jesli
  awans ma obejmowac slyszalnosc.
- Radius/cutoff przed/po, jezeli beda mutowane.
- `Environment Options` oraz `Fog`/`Use Area Lighting` before/toggle/restored.
- Finalny full-scene screenshot po restore.

## Ticket LWR-005: NPC z dialogiem

Cel: miec NPC w lokacji, rozpoznany w properties, z rozmowa albo hookami
dialogowymi. Obecnie mamy mocny observation path, ale nie mamy jeszcze
tworzenia NPC ani przypiecia conversation jako mutacji.

Atomy skladowe:

- `Creature Properties`: `opened-live` dla `d_und -> Creatures -> Inzynier`
  (`d_und_engineer`).
- Creature tabs `Basic`, `Statistics`, `Appearance`, `Classes`, `Skills`,
  `Scripts`, `Advanced`, `Feats`, `Spells`, `Special Abilities`, `Comments`:
  `opened-live`.
- `Creature Inventory / Equipment`: `opened-live`; warning przed inventory,
  potem `Inventory Contents`, zamkniete przez `Cancel`.
- `Conversation Editor`: `opened-live`, pusty `untitled000`; nie zapisano
  dialogu i nie przypieto go do NPC.
- `Script Editor`: `opened-live`; nie pisano, nie kompilowano, nie zapisywano.
- `Module event script binding/resource picker`: `opened-live`
  obserwacyjnie, ale dotyczy globalnych eventow modulu, nie NPC.
- Creature creation / conversation binding: `screen-supported` / `gap`.

Status przepisu:

- `mixed`.
- Nadaje sie do ticketu "rozpoznaj i przygotuj NPC".
- Nie jest jeszcze gotowe jako "stworz NPC z nowym dialogiem" w live
  Toolsecie.

Minimalny live eksperyment nastepny:

1. Otworzyc `Creature Properties` dla istniejacego `Inzynier`.
2. Na `Basic` udokumentowac sekcje `Conversation`: pole, `...`, `Edit`,
   `No Interrupt`.
3. Otworzyc selektor conversation albo edytor istniejacej conversation tylko
   obserwacyjnie, potem `Cancel`/zamkniecie bez zapisu.
4. Dopiero po tym planowac testowy dialog resource i przypiecie do testowego
   NPC.

Rollback:

- `Creature Properties`: `Cancel`.
- `Inventory Contents`: `Cancel`; nie zaznaczac `Never warn again` w warningu.
- `Conversation Editor`: nie klikac save; zamknac przez `Done`, a ukryte
  modale zamknac przez `Cancel`.
- `Script Editor`: `Exit`, bez save/compile.

Screeny wymagane do awansu:

- `Creature Properties Basic` z widoczna sekcja `Conversation`.
- Conversation resource picker albo `Edit` dialog przed jakakolwiek zmiana.
- Conversation Editor overview plus panele `Text Appears When`, `Actions
  Taken`, `Other Actions`, `Comments`, `Data`, `Bookmarks`, `Search`.
- Jesli bedzie binding: przed/po wybraniu conversation, `OK`, reopened
  `Creature Properties` z przypieta conversation.
- Finalny scene screenshot z NPC i jego tagiem/selection.

## Ticket LWR-006: trigger eventu

Cel: trigger, ktory odpala event/skrypt. Istniejace trigger properties sa juz
powtarzalne; tworzenie nowego volume i mutacja script slotu nadal czekaja.

Atomy skladowe:

- `Trigger Properties` dla `d_und_t_left` / `d_und_t_left_2`:
  `safe-repeatable` dla istniejacego triggera.
- Trigger tabs `Basic`, `Scripts`, `Advanced`, `Comments`: `opened-live`.
- Trigger `Scripts`: widoczne `OnClick`, `OnEnter`, `OnExit`, `OnHeartbeat`,
  `OnUserDefined`; probka ma `OnEnter = d_und_t_enter`.
- `Script Editor`: `opened-live` obserwacyjnie.
- Trigger creation / draw volume: `gap`.
- Trigger script binding/edit: nie wykonane jako mutacja.

Status przepisu:

- `mixed`.
- Gotowy do odczytania/udokumentowania istniejacego triggera i jego slotow.
- Nie gotowy do tworzenia nowego event triggera od zera.

Minimalny live eksperyment nastepny:

1. Na `d_und` otworzyc `Trigger Properties` dla `d_und_t_left`.
2. Na karcie `Scripts` otworzyc `Edit` albo `...` dla istniejacego `OnEnter`
   tylko obserwacyjnie, jesli da sie zamknac bez zmian.
3. Udokumentowac `Script Editor` albo resource picker i zamknac przez
   `Exit`/`Cancel`.
4. Osobny pozniejszy atom: rysowanie testowego trigger volume po zgodzie.

Rollback:

- `Trigger Properties`: `Cancel`.
- `Script Editor`: `Exit`, bez save/compile.
- Resource picker: `Cancel`, bez `Open`.
- Po overlay triggerow sprawdzic czytelnosc sceny i wrocic do zwyklego
  `Select Objects`.

Screeny wymagane do awansu:

- Canvas `d_und` z widocznym trigger volume/selection.
- `Trigger Properties` `Basic`, `Scripts`, `Advanced`, `Comments`.
- `Scripts` z widocznym aktualnym `OnEnter`.
- Script editor/resource picker dla slotu, przed zmiana.
- Dla przyszlej mutacji: before/after slotu, `OK`, reopened properties z tym
  samym przypisanym skryptem.

## Ticket LWR-007: walidacja sceny po zmianach

Cel: po dowolnej zmianie zrobic powtarzalny pakiet dowodowy: scene still
renders, obiekty sa widoczne, properties zgadzaja sie z zamiarem, a widok nie
zostal w trybie ukrywajacym elementy.

Atomy skladowe:

- `Area context View Area`: `opened-live`.
- `Display Grid`: `safe-repeatable`.
- `Object Filters Show None / Show All`: `safe-repeatable`.
- `Use Area Lighting`: `safe-repeatable` jako podglad, z obowiazkowym restore.
- `Fog`: `safe-repeatable` jako podglad, z obowiazkowym restore.
- Camera pan/zoom/rotate: dziala, ale zawsze wymagac screenshot diff.
- `Go to Start Location`: `partial-live`; nie traktowac jako pewnego
  rollbacku panowania.
- Reopened properties / object count: wymagane dla placeable i innych mutacji.

Status przepisu:

- `safe-repeatable` dla pakietu widokowego, z wyjatkiem resetu widoku.
- To jest najbezpieczniejszy support workflow dla wszystkich pozostalych
  recipe, ale sam nie buduje lokacji.

Minimalny live eksperyment nastepny:

1. Po dowolnej kontrolowanej zmianie zrobic full-scene screenshot.
2. Jesli geometria ma byc czytelna, uzyc `Show None`, screenshot, potem
   `Show All`, screenshot rollbacku.
3. Jesli tile bounds sa wazne, zrobic pare grid on/off, przywracajac stan
   startowy.
4. Reopen properties zmienionego obiektu i porownac z celem.
5. Zapisac object count, jezeli workflow dodawal albo mogl dodac obiekt.
6. Finalny screenshot musi pokazac czytelny Toolset bez modalnych okien.

Rollback:

- Zawsze `Show All`.
- Przywrocic `Display Grid` do stanu startowego.
- Przywrocic `Fog` i `Use Area Lighting` do stanu startowego.
- `Select Objects` i paleta `Placeables`.
- Nie polegac na `Go to Start Location` jako rollbacku po panie, dopoki nie
  bedzie osobnego mocnego diff evidence.

Screeny wymagane do awansu:

- Bramka czytelnosci: realny Toolset i wlasciwa area.
- Before/after mutacji albo before/after widoku.
- Reopened properties albo rownowazny twardy dowod.
- `Show None` i `Show All`, jezeli validujemy geometrie kontra obiekty.
- Finalny screen po przywroceniu widoku.

## Najblizsze recipe do wykonania live

Najblizsze wykonania live jako realny building slice jest `LWR-001: mala
izba/pokoj z tile i dekoracjami`. Ma najmocniejszy zestaw skladnikow: pojedynczy
terrain paint jest juz `mutated-live` z `Undo`, a add/rename/move placeable sa
`verified-after-reopen` lub `safe-repeatable`.

`LWR-007: walidacja sceny po zmianach` jest najbardziej gotowe jako workflow
pomocniczy, ale nie tworzy nowej zawartosci lokacji. `Skrzynia z lootem`,
`drzwi z przejsciem`, `NPC z dialogiem` i `trigger eventu` maja wyrazne gappy,
ktore trzeba domknac osobnymi minimalnymi eksperymentami.

## Glowne zrodla lokalne

- [aurora-toolset-learning-roadmap-2026-06-18.md](aurora-toolset-learning-roadmap-2026-06-18.md)
- [aurora-toolset-atomic-operation-checklists-2026-06-18.md](aurora-toolset-atomic-operation-checklists-2026-06-18.md)
- [aurora-toolset-atomic-operations-index-2026-06-18.md](aurora-toolset-atomic-operations-index-2026-06-18.md)
- [aurora-toolset-placeable-add-new-2026-06-17.md](aurora-toolset-placeable-add-new-2026-06-17.md)
- [aurora-toolset-placeable-move-2026-06-18.md](aurora-toolset-placeable-move-2026-06-18.md)
- [aurora-toolset-placeable-inventory-candidate-findings-2026-06-18.md](aurora-toolset-placeable-inventory-candidate-findings-2026-06-18.md)
- [aurora-toolset-door-properties-tabs-refresh-2026-06-18.md](aurora-toolset-door-properties-tabs-refresh-2026-06-18.md)
- [aurora-toolset-sound-playback-volume-refresh-2026-06-18.md](aurora-toolset-sound-playback-volume-refresh-2026-06-18.md)
- [aurora-toolset-area-properties-enon-bakery-safe-cancel-2026-06-18.md](aurora-toolset-area-properties-enon-bakery-safe-cancel-2026-06-18.md)
- [aurora-toolset-use-area-lighting-findings-2026-06-18.md](aurora-toolset-use-area-lighting-findings-2026-06-18.md)
- [aurora-toolset-fog-toggle-findings-2026-06-18.md](aurora-toolset-fog-toggle-findings-2026-06-18.md)
- [aurora-toolset-trigger-properties-refresh-2026-06-18.md](aurora-toolset-trigger-properties-refresh-2026-06-18.md)
- [aurora-toolset-creature-properties-findings-2026-06-18.md](aurora-toolset-creature-properties-findings-2026-06-18.md)
- [aurora-toolset-creature-inventory-equipment-findings-2026-06-18.md](aurora-toolset-creature-inventory-equipment-findings-2026-06-18.md)
- [aurora-toolset-conversation-editor-findings-2026-06-18.md](aurora-toolset-conversation-editor-findings-2026-06-18.md)
- [aurora-toolset-script-editor-findings-2026-06-18.md](aurora-toolset-script-editor-findings-2026-06-18.md)
- [aurora-toolset-terrain-palette-findings-2026-06-18.md](aurora-toolset-terrain-palette-findings-2026-06-18.md)
- [aurora-toolset-terrain-paint-floor-up-main-findings-2026-06-18.md](aurora-toolset-terrain-paint-floor-up-main-findings-2026-06-18.md)
- [aurora-toolset-terrain-group-preview-findings-2026-06-18.md](aurora-toolset-terrain-group-preview-findings-2026-06-18.md)
- [aurora-toolset-tile-properties-hb-s50-findings-2026-06-18.md](aurora-toolset-tile-properties-hb-s50-findings-2026-06-18.md)
