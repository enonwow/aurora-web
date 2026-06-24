# Aurora Toolset: area building workflow queue

Data: 2026-06-18

Cel kolejki: przygotowac male, samodzielne atomy live do jutrzejszego
zbudowania prostego obszaru w stylu Last City. To jest plan wykonawczy, nie
dowod `verified-live`. Kazdy atom awansuje dopiero po screenach i po twardym
rollback/cancel albo swiadomym pozostawieniu zmiany w testowym module.

Zakres tej kolejki:

- new/test area
- tile paint
- group preview/paint
- placeable add
- placeable move
- placeable properties
- lighting/fog
- sound radius/play
- door/transition
- trigger properties/script slot

## Zasady globalne

- Nie wykonywac tych atomow na krytycznym module bez osobnej zgody.
- Nie zapisywac modulu po atomie probnym, chyba ze uzytkownik jawnie zgodzi
  sie na zapis.
- Kazdy atom zaczynac od screena startowego z nazwa area albo obiektu.
- Kazdy atom konczy sie finalnym screenem sceny bez modalnych okien.
- Mutacje musza miec before/after oraz reopen properties, jezeli dotycza
  obiektu.
- Po atomie przywrocic czytelny stan widoku: `Select Objects`, `Show All`,
  wlasciwa paleta, oraz startowy stan `Display Grid`, `Fog` i
  `Use Area Lighting`.
- `Cancel` jest preferowany przy rozpoznaniu okien. `OK` tylko wtedy, gdy atom
  ma byc rzeczywista mutacja.
- Nie traktowac zielonego preview, dialogu albo odczytu parsera jako sukcesu
  mutacji bez screena po kliknieciu i bez dowodu powrotu/utrwalenia.

## Kolejnosc jutrzejszego building slice

1. `ABQ-001` przygotowuje test area i pakiet startowy screenow.
2. `ABQ-002` robi pojedynczy tile paint albo potwierdza blokade.
3. `ABQ-003` sprawdza group preview, a group paint wykonuje tylko w test area.
4. `ABQ-004` dodaje jeden bezpieczny placeable.
5. `ABQ-005` przesuwa placeable i waliduje count/selection.
6. `ABQ-006` ustawia albo tylko potwierdza properties placeable.
7. `ABQ-007` robi podglad lighting/fog z restore.
8. `ABQ-008` sprawdza sound radius/play bez trwalej edycji, chyba ze jest
   zgoda na ambient marker.
9. `ABQ-009` przygotowuje door/transition.
10. `ABQ-010` przygotowuje trigger properties/script slot.
11. `ABQ-011` robi finalny pakiet walidacyjny sceny.

## ABQ-001: new/test area baseline

Cel: miec bezpieczny obszar roboczy dla prostego Last City style slice:
mala izba, zaulek albo lacznik z czytelnym canvasem.

Wejscie:

- Modul otwarty w Toolsecie.
- Uzgodniona nazwa test area albo istnieje area testowa do eksperymentow.
- Jezeli tworzenie nowej area nie jest jeszcze bezpiecznie opisane, uzyc
  istniejacej testowej area i nazwac atom jako `test area baseline`, nie
  `new area verified`.

Success criteria:

- Wlasciwa area jest widoczna na canvasie.
- Da sie odroznic tryb widoku, grid, object filters i aktualna palete.
- Jest jasna decyzja: `new area created`, `existing test area selected` albo
  `blocked: no safe test area`.

Rollback/cancel:

- Jezeli kreator new area jest tylko rozpoznawany, zamknac przez `Cancel`.
- Jezeli area zostala utworzona testowo, nie zapisywac modulu bez zgody.
- Wrocic do `Select Objects`, `Show All`, startowy grid/fog/lighting.

Wymagane screeny:

- Module/Area tree z wybrana area.
- Full canvas startowy z nazwa area.
- Dialog/kreator new area przed potwierdzeniem, jezeli uzyty.
- Po wyborze albo utworzeniu: canvas bez modalnych okien.
- Finalny screen po restore widoku.

## ABQ-002: tile paint single cell

Cel: namalowac jeden kontrolowany tile/terrain pasujacy do prostego Last City
wnetrza albo uliczki.

Wejscie:

- `ABQ-001` ma area baseline.
- W kadrze jest miejsce, gdzie pojedynczy tile moze zostac zmieniony bez
  niszczenia istotnej geometrii.
- Wiadomo, czy atom ma byc probny z `Undo`, czy zostaje jako element slice.

Success criteria:

- Wybrany tile/terrain ma zielony preview w poprawnej kratce.
- Po kliknieciu canvas pokazuje rzeczywista zmiane tile.
- Jezeli atom jest probny, `Undo` przywraca stan widocznie.
- Jezeli atom zostaje, finalny screen pokazuje nowy tile jako czesc slice.

Rollback/cancel:

- Dla testu: toolbar `Undo`, potem screen powrotu.
- Jesli preview zostaje aktywne, przejsc na `Select Objects` albo palete
  placeables.
- Nie zapisywac modulu bez zgody.

Wymagane screeny:

- Before: kratka docelowa przed paint.
- Paleta terrain/tile z wybranym tile.
- Zielony preview przed kliknieciem.
- After: canvas po paint.
- Po `Undo`, jezeli atom probny.
- Finalny full-frame scene screenshot.

## ABQ-003: terrain group preview/paint

Cel: sprawdzic, czy da sie uzyc grupy tiles jako szybszego budowania kawalka
Last City, np. naroznika, pokoju albo fragmentu ulicy.

Wejscie:

- `ABQ-001` gotowe.
- Area testowa ma miejsce na wiekszy footprint grupy.
- Paint grupy jest osobna decyzja; samo preview moze byc atomem bez mutacji.

Success criteria:

- Preview grupy jest widoczny i miesci sie w area.
- Orientacja, rozmiar i konflikt z istniejacymi tiles sa czytelne.
- Jesli wykonano paint, after-screen pokazuje pelna grupe.
- Status koncowy rozroznia `preview-only`, `painted-live`, albo `blocked`.

Rollback/cancel:

- Preview-only: wyjsc z trybu paint przez `Select Objects` albo inna palete.
- Painted-live: uzyc `Undo` natychmiast, jesli atom jest probny.
- Nie wykonywac drugiego kliku "dla pewnosci"; najpierw screen after/undo.

Wymagane screeny:

- Paleta `Groups` z wybrana grupa.
- Preview grupy w docelowym miejscu.
- Zblizenie footprintu, jezeli preview jest trudny do odczytu.
- After paint, jezeli wykonano mutacje.
- Po `Undo` albo finalny screen pozostawionej grupy.
- Finalny screen po restore narzedzi.

## ABQ-004: placeable add

Cel: dodac jeden prosty placeable, ktory buduje klimat Last City, np. barrel,
crate, brazier, workbench albo miejski clutter.

Wejscie:

- Canvas jest w test area.
- Wybrany template jest znany i nie wymaga dodatkowych systemow.
- Object count/startowy stan sceny jest udokumentowany.

Success criteria:

- Placeable pojawia sie w scenie i/lub w tree.
- Ma rozpoznawalna nazwe/tag roboczy, np. `lc_test_prop_01`.
- Object count wzrosl zgodnie z jedna intencjonalna instancja.
- Reopen properties wskazuje ten sam obiekt.

Rollback/cancel:

- Jesli add byl przypadkowy albo zly template, nie uzywac agresywnego remove
  bez osobnego bezpiecznego atomu. Najpierw zanotowac dokladny stan.
- Jezeli properties otworzyly sie po dodaniu, uzyc `Cancel`, o ile atom nie
  wymaga ustawienia nazwy.
- Nie zapisywac modulu bez zgody.

Wymagane screeny:

- Paleta placeables z wybranym template.
- Canvas przed dodaniem i object count/tree przed.
- Canvas po dodaniu z zaznaczonym placeable.
- Tree/object count po dodaniu.
- Properties overview albo Basic tab dla nowego obiektu.
- Reopened properties po `OK`, jesli nazwa/tag byly mutowane.

## ABQ-005: placeable move

Cel: ustawic dodany placeable w czytelnym miejscu bez zmiany liczby obiektow.

Wejscie:

- Istnieje jeden target placeable z `ABQ-004`.
- Obiekt jest zaznaczony i identyfikowalny po nazwie/tagu.

Success criteria:

- Before/after pokazuja realna zmiane pozycji.
- Object count sie nie zmienia.
- Ten sam placeable pozostaje zaznaczony albo jest ponownie odnaleziony.
- Finalne polozenie pasuje do sceny i nie zaslania kluczowego przejscia.

Rollback/cancel:

- Jesli move jest zly, przesunac obiekt z powrotem na podstawie screena
  startowego albo uzyc dostepnego undo, jesli dziala dla move.
- Nie wykonywac kolejnych korekt bez screenow po kazdej wiekszej zmianie.
- Wrocic do `Select Objects` po zakonczeniu.

Wymagane screeny:

- Before: zaznaczony placeable przed move.
- During albo cursor/drag state, jezeli uchwytny.
- After: zaznaczony ten sam obiekt po move.
- Object count przed/po.
- Full scene screenshot pokazujacy kompozycje.

## ABQ-006: placeable properties

Cel: ustawic podstawowe properties placeable, ktore maja znaczenie dla
budowania obszaru: Name/Tag, Appearance, Useable/Static/Plot, Description lub
Comments.

Wejscie:

- Target placeable istnieje i jest wybrany.
- Wiadomo, ktore pole bedzie mutowane. Jeden atom = jedna mala rodzina zmian.

Success criteria:

- Startowe wartosci sa udokumentowane.
- Po `OK` i reopen widac zamierzona wartosc.
- Nie ma niezamierzonego konfliktu flag, np. `Useable` kontra `Static`.
- Scene screenshot pokazuje ten sam obiekt po zamknieciu dialogu.

Rollback/cancel:

- Dla rozpoznania: `Cancel`.
- Dla mutacji blednej: przywrocic wartosci startowe z before-screena, `OK`,
  reopen i screen.
- Nie mieszac appearance, flags i description w jednym pierwszym atomie, jesli
  nie ma potrzeby.

Wymagane screeny:

- Canvas z zaznaczonym targetem.
- Properties `Basic` przed zmiana.
- Zakladka/pole mutowane przed zmiana.
- Zakladka/pole po zmianie przed `OK`.
- Reopened properties po `OK`.
- Finalny canvas bez modala.

## ABQ-007: lighting/fog preview and restore

Cel: sprawdzic klimat Last City przez `Fog`, `Use Area Lighting` i
ewentualnie Area Properties, bez trwalego psucia czytelnosci sceny.

Wejscie:

- Area baseline ma czytelny kadr.
- Stan startowy `Fog` i `Use Area Lighting` jest znany.

Success criteria:

- Toggle albo properties pokazuje widoczna roznice klimatu.
- Po restore scena wraca do czytelnego stanu.
- Jezeli zmiana ma zostac, jest osobna decyzja i screen before/after plus
  reopened properties, jezeli dotyczy Area Properties.

Rollback/cancel:

- `Fog`: drugi toggle do stanu startowego.
- `Use Area Lighting`: drugi toggle do stanu startowego.
- Area Properties rozpoznawczo zamykac przez `Cancel`.
- Jesli scena robi sie zbyt ciemna, restore jest pierwszym krokiem, nie dalsze
  eksperymenty.

Wymagane screeny:

- Startowy canvas z normalnym swiatlem.
- UI evidence dla `Fog` przed/po toggle.
- UI evidence dla `Use Area Lighting` przed/po toggle.
- Canvas z klimatem po toggle.
- Canvas po restore.
- Area Properties / Environment Options, jezeli otwierane.

## ABQ-008: sound radius/play

Cel: przygotowac ambient audio dla obszaru: marker sound, radius/cutoff,
volume distance i przyciski `Play`/`Stop`.

Wejscie:

- Jest istniejacy sound marker albo zgoda na testowe dodanie sound marker.
- Na pierwszym przebiegu preferowac istniejacy sound i dialog-only zmiany.

Success criteria:

- `Sound Properties` sa otwarte dla konkretnego markera.
- `Positioning` pokazuje radius/cutoff/max volume distance/height.
- `Play` i `Stop` zostaly udokumentowane jako UI action.
- Audio-slyszalnosc nie jest promowana bez osobnego dowodu slyszalnosci.
- Jesli radius jest mutowany, reopen properties pokazuje wartosc po `OK`.

Rollback/cancel:

- Dla rozpoznania: przywrocic wartosci startowe i `Cancel`.
- Dla mutacji: zapisac startowe radius/cutoff, zmienic jedna wartosc, `OK`,
  reopen; w razie bledu przywrocic startowa wartosc i ponownie zweryfikowac.
- `Stop` po kazdym `Play`, jesli UI pozwala.

Wymagane screeny:

- Canvas/tree z wybranym sound marker.
- `Sound Properties` `Basic`.
- `Positioning` przed zmiana.
- `Advanced`, jezeli loop/active ma znaczenie.
- `Play`/`Stop` UI evidence.
- Po zmianie radius: before value, after value, reopened after `OK`.
- Finalny canvas po zamknieciu dialogu.

## ABQ-009: door/transition

Cel: przygotowac proste przejscie: drzwi albo portal z targetem do innej area,
door albo waypoint.

Wejscie:

- Jest test door albo zgoda na prace na istniejacych drzwiach testowych.
- Jest znany target transition: area, door albo waypoint.
- Pierwszy przebieg moze byc obserwacyjny bez `Setup Area Transition`.

Success criteria:

- `Door Properties` pokazuje `Area Transition`.
- Startowy `Destination Type`, `Destination Tag` i loading screen sa
  udokumentowane.
- Jesli konfiguracja zostaje wykonana, reopened properties pokazuje target.
- Target istnieje i jest screenowany w tree/canvas.

Rollback/cancel:

- Obserwacja: `Cancel` w `Door Properties`.
- Mutacja: przed `OK` miec before screen wszystkich destination fields.
- W razie bledu przywrocic startowe destination fields, `OK`, reopen i screen.
- Nie klikac `Setup Area Transition` bez planu zamkniecia przez `Cancel` albo
  bez zgody na mutacje.

Wymagane screeny:

- Canvas/tree z wybranymi drzwiami.
- `Door Properties` `Basic`.
- `Area Transition` przed zmiana.
- `Setup Area Transition` dialog/resource picker, jezeli otwarty.
- Target area/door/waypoint w tree/canvas.
- `Area Transition` po konfiguracji.
- Reopened `Door Properties` po `OK`.
- Finalny canvas bez modala.

## ABQ-010: trigger properties/script slot

Cel: przygotowac trigger eventu, np. wejscie w zaulek, start ambientu,
komentarz NPC albo testowy skrypt OnEnter.

Wejscie:

- Jest istniejacy test trigger albo zgoda na osobny atom rysowania trigger
  volume.
- Jest znany slot, najpierw preferowany `OnEnter`.
- Script resource jest istniejacy albo tworzenie skryptu jest osobnym atomem.

Success criteria:

- `Trigger Properties` otwieraja sie dla konkretnego triggera.
- `Scripts` pokazuje aktualne sloty: `OnClick`, `OnEnter`, `OnExit`,
  `OnHeartbeat`, `OnUserDefined`.
- Resource picker albo Script Editor zostal rozpoznany i zamkniety bez zmian,
  albo mutacja slotu zostala potwierdzona reopenem.
- Status koncowy mowi jasno: `observed-only`, `slot-bound-live`, albo
  `blocked`.

Rollback/cancel:

- Obserwacja: `Cancel` w properties i resource picker.
- Script Editor: `Exit` bez save/compile, jesli tylko rozpoznanie.
- Mutacja slotu: zapisac wartosc startowa, zmienic jeden slot, `OK`, reopen;
  w razie bledu przywrocic wartosc startowa.
- Po pracy z trigger overlay wrocic do normalnego widoku i `Select Objects`.

Wymagane screeny:

- Canvas z widocznym trigger volume albo selection.
- Tree z wybranym triggerem.
- `Trigger Properties` `Basic`.
- `Scripts` przed zmiana.
- Resource picker albo Script Editor dla slotu.
- `Scripts` po zmianie, jezeli mutowane.
- Reopened properties po `OK`, jezeli mutowane.
- Finalny canvas po restore.

## ABQ-011: final scene validation pack

Cel: zamknac dzienny building slice dowodem, ze obszar jest czytelny,
niezablokowany modalem i zawiera zamierzone elementy.

Wejscie:

- Wykonano przynajmniej jeden atom mutujacy albo potwierdzono blokady.
- Widok jest przywrocony do zwyklego trybu pracy.

Success criteria:

- Finalny canvas pokazuje prosty Last City style slice: tile/geometry,
  placeable/dekoracje i ewentualnie ambience/door/trigger marker.
- Object filters sa w stanie `Show All`.
- Reopened properties istnieja dla kazdego obiektu, ktory byl mutowany.
- Lista pozostawionych zmian jest jawna: co zostaje, co cofnieto, co jest
  blocked.

Rollback/cancel:

- Przed koncem przywrocic `Show All`, startowy grid/fog/lighting, i zamknac
  properties/resource pickers przez `Cancel` albo `OK` tylko dla celowych
  mutacji.
- Jezeli slice jest tylko probny, wykonac uzgodniony rollback atom po atomie.
- Nie zapisywac modulu, dopoki uzytkownik nie zaakceptuje finalnego stanu.

Wymagane screeny:

- Full-scene final bez modalnych okien.
- `Show All` evidence.
- Grid on/off albo grid state, jezeli tile alignment byl istotny.
- Reopened properties dla placeable/sound/door/trigger, ktore byly mutowane.
- Before/after collage albo uporzadkowana lista screenshotow po atomach.
- Finalny screen po ewentualnym rollbacku.

## Minimalny pakiet na jutro

Najmniejsza sensowna sciezka do samodzielnego zbudowania prostego obszaru:

1. `ABQ-001` existing test area baseline.
2. `ABQ-002` one tile paint, zostawiony tylko jesli jest test area.
3. `ABQ-004` one placeable add.
4. `ABQ-005` move placeable.
5. `ABQ-006` rename/tag plus jedna flaga albo appearance.
6. `ABQ-007` lighting/fog preview with restore.
7. `ABQ-011` final validation pack.

Drugi poziom, gdy pierwszy pakiet jest stabilny:

1. `ABQ-003` group preview, paint tylko w test area.
2. `ABQ-008` sound radius/play na istniejacym markerze.
3. `ABQ-009` door/transition obserwacyjnie, potem mutacja.
4. `ABQ-010` trigger script slot obserwacyjnie, potem mutacja.

## Statusy do wpisania po wykonaniu

- `planned-live`: atom gotowy do wykonania.
- `preview-only`: wykonano bez mutacji.
- `mutated-live`: wykonano mutacje i after-screen.
- `verified-after-reopen`: po `OK` reopen pokazal docelowa wartosc.
- `rolled-back`: zmiana cofnieta screenem.
- `blocked`: podac dokladny blocker, okno, brak kontrolki albo ryzyko.
