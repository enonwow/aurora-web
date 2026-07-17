# Aurora Toolset: checklisty atomowych operacji

Data rozbicia: 2026-06-18

Ten dokument sluzy do wykonywania i oceniania pojedynczych atomow. Kazdy atom
ma ten sam format, zeby heartbeat albo inny agent mogl go odtworzyc bez
dopowiadania sobie brakujacych decyzji.

## Wspolny format atomu

- Status:
- Warunek startowy:
- Minimalna akcja:
- Oczekiwany efekt:
- Dowod:
- Rollback / cancel:
- Pulapki:

## Reguly globalne

- Kazdy heartbeat zaczyna sie od potwierdzenia, ze Aurora Toolset jest
  uruchomiona i ze aktualny screenshot faktycznie pokazuje Toolset. Bez tego
  nie zaliczac zadnego atomu.
- Nie przejmowac globalnego kursora uzytkownika.
- Nie uzywac globalnego `SendKeys`.
- Preferowac komunikaty do konkretnego okna/kontrolki Toolsetu.
- Nie zapisywac modulu bez osobnej zgody.
- Po `Access violation` zamknac Toolset i odtworzyc znane kroki.
- Jezeli pojawia sie ghost window albo Toolset przestaje odpowiadac po
  eksperymencie z UI, przerwac atom, zrestartowac Toolset i obsluzyc backup
  recovery przez `Tak`/`Yes`.
- Jezeli Toolset po restarcie pyta o odzyskanie modulu z backupu, wybrac
  `Tak`/`Yes`. Po takim odzyskaniu nie otwierac modulu drugi raz przez
  `File > Open`; najpierw zweryfikowac odzyskany stan screenshotem i dopiero
  kontynuowac.
- Dla mutacji nie wystarcza techniczny readback: potrzebny jest screenshot,
  reopened properties, object count albo rownowazny dowod.
- Dla properties, conversation editorow, script/journal editorow i innych
  wielozakladkowych okien nie wystarcza pojedynczy screenshot. Standard to
  overview calego okna plus screenshot kazdej widocznej zakladki albo wiekszej
  funkcji/panelu.

## V01: uruchom Toolset, modul i area `_ikea`

- Status: `safe-repeatable`
- Warunek startowy: Toolset jest zamkniety albo uruchomiony; znany modul to
  `the_last_city - codex.mod` / wariant z em-dash w nazwie pliku.
- Minimalna akcja: uruchomic `nwtoolset.exe`, otworzyc modul, otworzyc area
  `_ikea`.
- Oczekiwany efekt: widoczna karta `_ikea`, `TfrmViewerArea - _ikea` i
  narysowana scena.
- Dowod: screenshot area po narysowaniu oraz/lub obecny child window area.
- Rollback / cancel: nie zapisywac modulu; jesli modul nie zaladuje sie
  poprawnie, zamknac Toolset i zaczac od nowa.
- Pulapki: samo zaznaczenie `_ikea` w drzewie nie wystarcza; trzeba widziec
  otwarta karte area i render. W HB-S19 po backup recovery otwarcie `_ikea`
  pokazalo `Old File Format` i `Area Properties` z pustym `Name`; `OK`
  zakonczyl sie `Invalid Filename`. To jest blocker otwarcia canvasu w tym
  stanie, nie dowod poprawnie otwartego obszaru.
- Aktualizacja HB-S26: dla `enon_bakery` skuteczna sciezka do renderu to menu
  kontekstowe wpisu area w drzewie i `View Area`; szczegoly:
  [Area context View Area findings](aurora-toolset-area-view-context-findings-2026-06-18.md).

## V02: wybierz poprawny viewport/canvas

- Status: `safe-repeatable`
- Warunek startowy: area `_ikea` jest otwarta i renderuje scene.
- Minimalna akcja: odszukac wewnetrzny `TScrollBox` canvasu, nie sama ramke
  `TfrmViewerArea`.
- Oczekiwany efekt: operacje sceny/placeable trafiaja w realny canvas.
- Dowod: klik/drag/placeable zmienia scene albo licznik obiektow.
- Rollback / cancel: jezeli akcja nie ma efektu, nie powtarzac jej losowo;
  najpierw ponownie zidentyfikowac child controls.
- Pulapki: klik w ramke viewer moze nie dodac ani nie przesunac obiektu.

## V03: kamera - pan, rotate, zoom

- Status: `safe-repeatable`
- Warunek startowy: area `_ikea` renderuje scene.
- Minimalna akcja: uzyc dolnego toolbara do pan/rotate/zoom albo celowanego
  komunikatu do viewportu, zgodnie z aktualna sesja.
- Oczekiwany efekt: screenshot po operacji rozni sie od screenshotu przed.
- Dowod: screenshot przed/po i pixel/sampling diff albo wyrazna zmiana kadru.
- Rollback / cancel: uzyc reset/recenter jesli widok uciekl; nie zapisywac
  modulu.
- Pulapki: zoom jest transport-sensitive. W jednej sesji dzialaly przyciski, w
  innej pewniejszy byl `WM_MOUSEWHEEL`. Zawsze wymagac dowodu wizualnego.

## V04: zaznacz placeable i otworz properties

- Status: `safe-repeatable`
- Warunek startowy: `_ikea` otwarta; w lewym drzewie istnieje galaz
  `_ikea -> Placeables`.
- Minimalna akcja: zaznaczyc instancje placeable i wykonac `Object Properties`
  (`WM_COMMAND 70` bylo skuteczne w znanej probie).
- Oczekiwany efekt: widoczny dialog `Placeable Object Properties`.
- Dowod: screenshot dialogu i/lub klasa `TdlgPlaceableEdit`.
- Rollback / cancel: zamknac dialog przez `Cancel`, jesli celem bylo tylko
  otwarcie.
- Pulapki: nie uzywac remote-memory TreeView reads/writes; wczesniej prowadzilo
  to do `Access violation`.

## V05: przejdz przez zakladki placeable properties

- Status: `safe-repeatable`
- Warunek startowy: otwarty `Placeable Object Properties`.
- Minimalna akcja: przejsc kolejno po `Basic`, `Scripts`, `Advanced`,
  `Description`, `Comments`.
- Oczekiwany efekt: aktywna karta zmienia sie i pokazuje oczekiwane pola.
- Dowod: screenshot kazdej zakladki albo contact sheet.
- Rollback / cancel: po dokumentacji zamknac przez `Cancel`.
- Pulapki: ukryta karta `Trap` moze istniec w drzewie kontrolek, ale nie jest
  widoczna dla kazdego placeable.

## V06: zmien appearance placeable

- Status: `verified-after-reopen`
- Warunek startowy: otwarty `Placeable Object Properties`, zakladka `Basic`.
- Minimalna akcja: zmienic `Appearance Type`, zatwierdzic `OK`, ponownie
  otworzyc properties.
- Oczekiwany efekt: reopened properties pokazuje nowy `Appearance Type`.
- Dowod: screenshot przed, po wyborze, po `OK` i po ponownym otwarciu.
- Rollback / cancel: jesli to tylko test, uzyc obiektu testowego albo odtworzyc
  poprzednia wartosc; nie zapisywac modulu bez zgody.
- Pulapki: sama zmiana w UI preview nie wystarcza; potrzebne `OK` i reopen.

## V07: przelacz `Plot`, `Useable`, `Static`

- Status: `verified-after-reopen`
- Warunek startowy: `Placeable Object Properties`, zakladka `Basic`.
- Minimalna akcja: zaznaczyc/odznaczyc flagi w dozwolonej kolejnosci.
- Oczekiwany efekt: checkboxy zmieniaja stan zgodnie z UI.
- Dowod: screenshot stanOW posrednich i finalnego.
- Rollback / cancel: ustawic finalnie stany zgodnie z celem i zatwierdzic albo
  anulowac.
- Pulapki: `Useable` blokuje `Static`; nie wymuszac nielegalnego stanu przez
  niskopoziomowe bity.

## V08: zmien wartosci liczbowe placeable

- Status: `verified-after-reopen`
- Warunek startowy: `Placeable Object Properties`, zakladka `Basic`.
- Minimalna akcja: uzyc spinboxow `TUpDown`, np. `+10` dla Hardness, HP,
  Fortitude, Reflex, Will.
- Oczekiwany efekt: widoczne pola liczbowe zmieniaja wartosci.
- Dowod: screenshot finalny i/lub odczyt kontrolek po dzialajacej zmianie.
- Rollback / cancel: jezeli to test, przywrocic wartosci albo zamknac bez `OK`.
- Pulapki: samo `SetWindowText` moze klamac; UI moze nadal rysowac stare
  wartosci.

## V09: dodaj nowy placeable z palety

- Status: `verified-after-reopen`
- Warunek startowy: `_ikea` otwarta; prawa paleta w trybie `Placeables`.
- Minimalna akcja: wybrac template, np. `Containers & Switches -> Barrel`, i
  kliknac w inner `TScrollBox` canvasu.
- Oczekiwany efekt: licznik obiektow rosnie o `1`; obiekt pojawia sie w area.
- Dowod: object count przed/po i screenshot sceny.
- Rollback / cancel: nie zapisywac modulu; jesli obiekt dodany przypadkowo,
  nie kasowac bez decyzji, tylko odnotowac stan.
- Pulapki: klik w zly child window nie doda obiektu.

## V10: nazwij nowy placeable

- Status: `verified-after-reopen`
- Warunek startowy: properties nowego placeable sa otwarte.
- Minimalna akcja: w aktualnym widocznym `TEdit` pola `Name` uzyc focus,
  `EM_SETSEL`, `EM_REPLACESEL`, potem `OK` i reopen.
- Oczekiwany efekt: reopened properties pokazuje `Name = test - codex` albo
  inna docelowa nazwe.
- Dowod: screenshot po wpisaniu i screenshot reopened properties.
- Rollback / cancel: jezeli nazwa jest bledna, ponownie otworzyc properties i
  zmienic ta sama metoda.
- Pulapki: stale handle i samo `SetWindowText` moga zwrocic technicznie nowy
  tekst, gdy aktywny dialog nadal pokazuje stara wartosc.

## V11: przesun zaznaczony placeable

- Status: `safe-repeatable`
- Warunek startowy: obiekt jest zaznaczony i potwierdzony przez properties.
- Minimalna akcja: wlaczyc `Select Objects`, wykonac kontrolowany drag na inner
  `TScrollBox`.
- Oczekiwany efekt: marker zaznaczenia i model przesuwaja sie na canvasie.
- Dowod: screenshot przed/po, object count bez zmiany, reopened properties tego
  samego obiektu.
- Rollback / cancel: wykonac drugi drag w przyblizeniu z powrotem albo zostawic
  jako stan testowy bez zapisu.
- Pulapki: w trybie dodawania placeable drag/click moze dodac nowy obiekt.

## S01: `Adjust Location` / dokladne wspolrzedne

- Status: `gap`
- Warunek startowy: zaznaczony placeable i widoczny kontekst obiektu.
- Minimalna akcja: znalezc niezawodna sciezke do dialogu `Adjust Location`.
- Oczekiwany efekt: dialog lokalizacji otwiera sie i pokazuje pola pozycji.
- Dowod: screenshot dialogu oraz opis metody otwarcia.
- Rollback / cancel: zamknac dialog przez `Cancel`.
- Pulapki: klik w pozycje popup menu zamknal menu bez dialogu w znanej probie.
- Wynik HB-002: pozycja menu zostala potwierdzona jako `ID 192`, ale
  `WM_COMMAND 192` do `TfrmFrame` oraz celowany klik w popup nie otworzyly
  dialogu. Szczegoly:
  [aurora-toolset-adjust-location-findings-2026-06-18.md](aurora-toolset-adjust-location-findings-2026-06-18.md).

## S02: palette context menu

- Status: `partial-live`; przelaczenie na `Placeables` live, context menu nadal
  `gap`.
- Warunek startowy: widoczna prawa paleta i wybrany wpis/template.
- Minimalna akcja: otworzyc context menu i zidentyfikowac `Find Text`,
  `Edit Copy`, `Update Instances` lub odpowiedniki.
- Oczekiwany efekt: menu jest widoczne, a pozycje sa rozpoznane.
- Dowod: screenshot menu i lista pozycji.
- Rollback / cancel: zamknac menu bez wyboru pozycji mutujacej.
- Pulapki: `Update Instances` moze byc szeroka mutacja; nie uruchamiac bez
  osobnego celu.
- Wynik HB-S34-001: live przelaczono prawa palete z `Terrain` na `Placeables`
  i rozpoznano kategorie blueprintow; context menu nie pojawilo sie na
  `Terrain`, narzedziach terrain ani kategorii `Battlefield`. Proby palety
  przestawily status na `Paint`, po czym przywrocono `Select Objects` przez
  command `74`. Szczegoly:
  [Placeables palette context attempt findings](aurora-toolset-palette-placeables-context-attempt-findings-2026-06-18.md).

## S03: placeable inventory / contents

- Status: `gap`
- Warunek startowy: `Placeable Object Properties` dla obiektu z inventory albo
  wlaczonym `Has Inventory`.
- Minimalna akcja: otworzyc `Inventory...` / contents editor.
- Oczekiwany efekt: widoczny edytor zawartosci z lista/paleta itemow.
- Dowod: screenshot edytora.
- Rollback / cancel: zamknac edytor przez `Cancel` albo bez zmian.
- Pulapki: wlaczenie inventory moze byc mutacja; rozdzielic otwarcie edytora od
  dodawania itemu.
- Wynik HB-S15-001: read-only parser znalazl kandydata `_ikea`
  `ZEP_SAFE001` / `zep_safe002` z `hasInventory=true`, ale proba uzycia
  ukrytego `TdlgFindInstance` pokazala pusty/niezainicjalizowany dialog.
  Placeable inventory nie zostalo jeszcze otwarte live. Szczegoly:
  [Placeable Inventory candidate findings](aurora-toolset-placeable-inventory-candidate-findings-2026-06-18.md).
- Wynik HB-S17-001: live rozwinieto `_ikea -> Placeables`, otwarto properties
  pobliskich wpisow przez `WM_COMMAND 19` do lewego `TTreeView` i skorelowano
  parserowe indeksy `211`/`213`/`215`. Nie udalo sie jeszcze stabilnie otworzyc
  properties `ZEP_SAFE001`; status pozostaje `gap`. Szczegoly w tym samym docu
  candidate.

## S04: Area Properties - environment/fog/lighting

- Status: `opened-live`
- Warunek startowy: area `enon_bakery` otwarta. To wskazany obszar do nauki
  oswietlenia.
- Minimalna akcja: otworzyc Area Properties i przejsc na environment/visual
  settings.
- Oczekiwany efekt: widoczne pola fog/lighting/day-night/slidery.
- Dowod: screenshot zakladki; live doc:
  [Area Properties environment findings](aurora-toolset-area-properties-environment-findings-2026-06-18.md).
- Rollback / cancel: zamknac przez `Cancel`, chyba ze celem jest jawna mutacja.
  Po kazdym tescie lighting/fog przywrocic gornym paskiem domyslny czytelny
  widok, bo mocne oswietlenie albo mgla moga sprawic, ze kolejne screenshoty
  nie beda uzyteczne jako dowod.
- Pulapki: screeny moga byc z wersji beta/manualowej; nazwy kart moga sie
  roznic.
- Wynik HB-S19-001: live udokumentowano wszystkie karty `Area Properties`
  (`Basic`, `Visual`, `Audio`, `Events`, `Advanced`, `Comments`) po otwarciu
  `_ikea` z drzewa po backup recovery. `Basic` mial puste `Name`; proba `OK`
  pokazala `Invalid Filename`, wiec zamknieto przez `Cancel` i nie zapisano
  modulu. Szczegoly:
  [Area Properties environment findings](aurora-toolset-area-properties-environment-findings-2026-06-18.md).
- Wynik HB-S20-001: live udokumentowano wszystkie karty `Area Properties` dla
  `enon_bakery`. `Basic` mial poprawne `Name`, ale klik `OK` oznaczyl modul
  jako dirty i nadal nie pokazal canvasu; ponowny `Enter` otworzyl properties
  ponownie. Zamknieto przez `Cancel`, bez zapisu modulu. `enon_bakery`
  pozostaje targetem dla oswietlenia, ale potrzebna jest jeszcze sciezka do
  realnego renderu po recovery.
- Wynik HB-S33-001: live odtworzono bezpieczna sciezke `Cancel-only` dla
  `enon_bakery`: context menu area -> `Properties`, screen kazdej zakladki,
  `Customize Environment`, screenshot `Environment Options`, `Cancel` w obu
  dialogach. Szczegoly:
  [Area Properties enon_bakery safe-cancel refresh](aurora-toolset-area-properties-enon-bakery-safe-cancel-2026-06-18.md).
- Wynik HB-S46-001: odswiezono wariant bezglobalny/targetowany. Pewna selekcja
  `enon_bakery` wymaga bezposredniego `TTreeView` `329966`; popup context menu
  otwiera sie stabilnie, `Properties` ma ID `19`, ale aktywacja pozycji przez
  `WM_COMMAND`, `PostMessage` click i `VK_END + VK_RETURN` nie otworzyla
  dialogu. `WM_CHAR p` jest ryzykowne, bo otworzylo properties dla zlego
  `enon_butcher`. Szczegoly:
  [Area Properties context menu targeting refresh](aurora-toolset-area-properties-context-menu-targeting-refresh-2026-06-18.md).

## S05: Sound object - radius/random/looping

- Status: `opened-live`
- Warunek startowy: prawa paleta sound lub zaznaczony sound marker w area.
  Do nauki dzwiekow najpierw znalezc lokacje z wieksza liczba elementow, zeby
  radius/ambient byl oceniany na gestszej scenie.
- Minimalna akcja: otworzyc Sound Properties i zidentyfikowac radius oraz
  random/looping settings.
- Oczekiwany efekt: widoczny dialog Sound Properties i/lub marker radiusu.
- Dowod: screenshot dialogu oraz screenshot markerow w area; live doc:
  [Sound Properties findings](aurora-toolset-sound-properties-findings-2026-06-18.md).
- Rollback / cancel: zamknac bez zmian.
- Pulapki: sound marker moze byc trudny do odroznienia od placeable markerow;
  wymagac screenshotu.
- Wynik HB-S47-001: powtorzono `hx_tygiel_under -> Sounds -> Fireplace`,
  otwarto `Sound Properties`, kliknieto `Play`, potem `Stop`, przetestowano
  suwak volume dialog-only i przywrocono raw `127` przed `Cancel`. `TTrackBar`
  uzywa raw skali `0..127`, a nie prostego `0..10`. Szczegoly:
  [Sound playback and volume refresh](aurora-toolset-sound-playback-volume-refresh-2026-06-18.md).

## S06: Door + Area Transition

- Status: `opened-live`
- Warunek startowy: drzwi zaznaczone albo paleta doors widoczna.
- Minimalna akcja: otworzyc Door Properties i zakladke/dialog Area Transition.
- Oczekiwany efekt: widoczne pola target area/type/connection/door/waypoint.
- Dowod: screenshot Door Properties i Area Transition; live doc:
  [Door Properties and Area Transition findings](aurora-toolset-door-transition-findings-2026-06-18.md).
  HB-S48 rozszerzyl dowod o karty `Basic`, `Scripts`, `Lock`,
  `Description`, `Area Transition`, `Advanced`, `Comments` i `Trap`:
  [Door Properties tabs refresh](aurora-toolset-door-properties-tabs-refresh-2026-06-18.md).
- Rollback / cancel: zamknac przez `Cancel`.
- Pulapki: bledne transition moze zepsuc nawigacje; najpierw tylko obserwacja.
  Dwurzedowy `TPageControl` moze zmieniac trafienie koordynatow po zmianie
  aktywnej zakladki; dla pelnych screenow bezpieczniejsze sa osobne otwarcia i
  `Cancel` po kazdej karcie.

## S07: Trigger volume + scripts

- Status: `opened-live`; otwarcie istniejacego `Trigger Properties` po
  HB-S49 jest `safe-repeatable`, ale rysowanie nowego trigger volume pozostaje
  `gap`.
- Warunek startowy: istnieje area z triggerami; w znanej probie skuteczna byla
  area `d_und` z rozwinietym `d_und -> Triggers`.
- Minimalna akcja: zaznaczyc istniejacy trigger i otworzyc `Trigger
  Properties` z context menu.
- Oczekiwany efekt: widoczne karty `Basic`, `Scripts`, `Advanced`, `Comments`.
- Dowod: screenshot selection volume i properties; live doc:
  [Trigger Properties findings](aurora-toolset-trigger-properties-findings-2026-06-18.md).
  Refresh HB-S49:
  [Trigger Properties refresh](aurora-toolset-trigger-properties-refresh-2026-06-18.md).
- Rollback / cancel: zamknac bez zmian.
- Pulapki: rysowanie nowego triggera to mutacja geometryczna; nie laczyc z
  sama obserwacja properties. Podwojny klik triggera w drzewie tylko focusuje
  obiekt na scenie. Dla menu triggera skuteczne bylo `WM_CHAR p` do popup
  `#32768`; samo `WM_KEYDOWN P` i `WM_COMMAND 19` nie otwieraly dialogu w tej
  probie. Overlay triggerow moze obnizyc czytelnosc kolejnych screenshotow.
  Po HB-S49 dodatkowa pulapka: w procesie moze istniec ukryty `TfrmPreview`
  z tytulem `Trigger Properties`; prawdziwy dialog do klikania kart to
  `TdlgTriggerEdit`.

## S08: Tile/Terrain + lighting

- Status: `partial-live` dla calej rodziny; `mutated-live` dla pojedynczego
  paint `[T] Floor Up, MAIN`; `gap` dla `Tile Properties` i weryfikacji po
  reopenie.
- Warunek startowy: area otwarta i widoczny terrain/tile palette albo wybrany
  tile.
- Minimalna akcja: otworzyc Tile Properties, wybrac tile palette bez malowania
  albo wykonac pojedynczy kontrolowany paint na zielonym preview.
- Oczekiwany efekt: dla properties widoczne metadata/lighting/color controls;
  dla paint widoczna zmiana geometrii na canvasie.
- Dowod: screenshot selected tile i properties. Czesc palety terrain zostala
  odtworzona live:
  [Terrain palette findings](aurora-toolset-terrain-palette-findings-2026-06-18.md).
- Rollback / cancel: dla paint uzyc gornego toolbaru `Undo`, potem
  `Select Objects` i powrot na palete `Placeables`; nie zapisywac modulu bez
  osobnej zgody.
- Pulapki: tile paint jest trudniejszy do cofniecia niz dialog cancel. Wybor
  `Terrain -> Floor` moze zostawic zielony preview/selection outline na
  scenie; `Esc` i wybor root kategorii nie musza go zdejmowac. Nie klikac w
  canvas po wyborze template, jesli celem jest tylko obserwacja. Czerwony
  preview grupy/template traktowac jako stop.
- Wynik HB-S08-001: live otworzono prawa palete `Terrain` i wybrano `Floor`
  bez malowania. Nie znaleziono jeszcze niezawodnej sciezki do live dialogu
  `Tile Properties`; `WM_COMMAND 70` nie zadzialal w tym stanie.
- Wynik HB-S36: live na `enon_bakery` przelaczono prawa palete z `Placeables`
  na terrain palette, rozpoznano rooty `Features`, `Groups`, `Terrain`,
  rozwinieto `Groups` do prefabu `Theater (5x5)`, a rollback wykonano przez
  powrot na ikone `Placeables`. Ten rollback zdjal zielony terrain preview bez
  `Esc` i bez klikniecia canvasu.
- Wynik HB-S37: `WM_COMMAND 73` przelaczyl w `Select Terrain`; celowany klik
  istniejacego tile pokazal niebieski outline zaznaczenia, a `WM_COMMAND 70`
  nie otworzyl `Tile Properties`. `WM_COMMAND 74` (`Select Objects`) zdjal
  zaznaczenie tile i przywrocil czytelny stan. To potwierdza selection atom,
  ale nie otwarcie properties.
- Wynik HB-S38/S39: klasyczne `WM_RBUTTONDOWN/UP` na zaznaczonym tile otwiera
  popup z pozycja `Tile Properties`; przez `MN_GETHMENU` ustalono ID pozycji
  `222`. Popup moze pojawic sie na pierwszym ekranie przy biezacej pozycji
  kursora systemowego. Targetowany klik/`Enter` w popup oraz `WM_COMMAND 222`
  do glownej ramki, canvasu, viewer area, tab sheet i application nie otworzyly
  dialogu. Status `Tile Properties` nadal `gap` dla dialogu, ale context menu
  jest `opened-live`.
- Wynik HB-S40: bezposrednie `WM_MOUSEMOVE`/`WM_LBUTTONDOWN`/`WM_LBUTTONUP`
  do popupu `#32768`, `SendMessage/PostMessage WM_COMMAND 222` do ramki,
  `WM_MENUCOMMAND` z `HMENU` oraz `WM_COMMAND 222` do samego popupu nie
  aktywowaly pozycji. Popup ma `parent=0`, `owner=0`, wiec problem pozostaje
  w menu-loop/owner-draw VCL. Dialog `Tile Properties` nadal `gap`.
- Wynik HB-S50: powtorzono `Select Terrain` (`WM_COMMAND 73`) i klik
  istniejacego tile na `d_und`; selection outline pojawil sie bez paint.
  Popup `Tile Properties` znowu otworzyl sie po targetowanym prawym kliknieciu,
  ale na pierwszym ekranie przy pozycji kursora systemowego. `SendMessage
  WM_CHAR 't'` do popupu nie otworzyl dialogu i zablokowal skrypt do timeoutu;
  uzywac tylko `PostMessage` albo `SendMessageTimeout` przy dalszych probach.
  Popup zamknieto `PostMessage Escape`, a tryb przywrocono przez
  `WM_COMMAND 74`. Szczegoly:
  [Tile Properties HB-S50 findings](aurora-toolset-tile-properties-hb-s50-findings-2026-06-18.md).
- Wynik HB-S41: `Groups -> Theater (5x5)` przelaczyl Toolset w tryb `Paint`
  i pokazal duzy preview grupy. Targetowany `WM_MOUSEMOVE` przesuwal preview,
  ale testowane pozycje byly czerwone (`green=0`), wiec nie wykonano paint
  grupy.
- Wynik HB-S42: wybrano `[T] Floor Up, MAIN`, zielony preview pojedynczego
  tile kliknieto w `TScrollBox` canvasu (`client 391,628`), a po paint pojawil
  sie nowy fragment podlogi/wnetrza na `enon_bakery`. Rollback przez gorny
  toolbar `Undo` usunal testowy tile, po czym przywrocono `Select Objects` i
  palete `Placeables`. Szczegoly:
  [Terrain paint Floor Up MAIN](aurora-toolset-terrain-paint-floor-up-main-findings-2026-06-18.md).
- Wynik HB-S43/S44: otwarto `enon_test_build`, gdzie `Groups` sa
  tileset-dependent (`[Jungle]`/`[Swamp]`, bez `Theater (5x5)`). `[Jungle] Camp
  1 (2x2)` dawal czerwony preview w probkach, `[Jungle] Camp 2 (1x2)` dal
  stabilny zielony preview, ale klikniecia zielonego preview nie pokazaly
  jednoznacznej nowej grupy po paint. Group preview jest `opened-live`, group
  paint nadal `gap`/nierozstrzygniety. Szczegoly:
  [Terrain group preview](aurora-toolset-terrain-group-preview-findings-2026-06-18.md).
- Wynik HB-S45: przetestowano hipoteze origin/top-left dla `[Jungle] Camp 2
  (1x2)`. Wykryta ramka zielonego preview odpowiadala mniej wiecej
  `client 434..856`, `403..614` aktywnego canvasu; klik `client 444,413` nie
  dal jednoznacznej nowej grupy, tylko zgaszenie tresci preview i zielony
  outline. `Undo` + restore wykonane; group paint nadal `gap`.

## S09: Creature basic properties

- Status: `opened-live`
- Warunek startowy: `nwtoolset.exe` dziala, drugi ekran pokazuje czytelny
  Toolset, area `d_und` jest otwarta, a `d_und -> Creatures` jest rozwiniete.
- Minimalna akcja: zaznaczyc istniejacy creature, np. `Inzynier`, i otworzyc
  `Creature Properties`.
- Oczekiwany efekt: widoczny preview 3D oraz pola name/tag/race/appearance;
  mozna przejsc po kartach `Basic`, `Statistics`, `Appearance`, `Classes`,
  `Skills`, `Scripts`, `Advanced`, `Feats`, `Spells`, `Special Abilities`,
  `Comments`.
- Dowod: screenshot dialogu i kart; szczegoly w
  [Creature Properties findings](aurora-toolset-creature-properties-findings-2026-06-18.md).
- Rollback / cancel: zamknac przez `Cancel`.
- Pulapki: creature wizard finish moze od razu tworzyc zasob; rozdzielic wizard
  od edycji properties. Dialog moze istniec jako `TdlgCreatureEdit`, ale byc
  schowany pod glownym oknem; wtedy trzeba podniesc dialog na wierzch i dopiero
  screenshot liczyc jako dowod. Dla creature skuteczne bylo `WM_COMMAND 19` do
  lewego `TTreeView`, a nie metoda popup-`WM_CHAR p` znana z triggera.
- Wynik HB-S09-001: live otworzono `Creature Properties` dla `Inzynier`
  (`d_und_engineer`), przejrzano wszystkie widoczne zakladki i zamknieto przez
  `Cancel`; bez zapisu modulu.

## S10: Conversation, Journal, Script binding

- Status: `opened-live` dla Conversation Editora, Script Editora i Journal
  Editora.
- Warunek startowy: modul otwarty, aktualny screenshot pokazuje czytelny
  Toolset, edytory dostepne z menu lub properties.
- Minimalna akcja: otworzyc jeden edytor bez zapisu i zidentyfikowac glowny
  panel. W przebiegu HB-S10 uzyto `Tools` ID `125`, ktore otworzylo
  `Conversation Editor - untitled000`; w przebiegu HB-S12 uzyto `Tools` ID
  `127`, ktore otworzylo `Script Editor`; w przebiegu HB-S13 uzyto `Tools`
  ID `128`, ktore otworzylo `Journal Editor`.
- Oczekiwany efekt: widoczny tree dialogue, journal entries albo script editor.
- Dowod: nie jeden screenshot, tylko seria: overview oraz kazda widoczna
  zakladka/wiekszy panel. Szczegoly w
  [Conversation Editor findings](aurora-toolset-conversation-editor-findings-2026-06-18.md)
  oraz [Script Editor findings](aurora-toolset-script-editor-findings-2026-06-18.md)
  oraz [Journal Editor findings](aurora-toolset-journal-editor-findings-2026-06-18.md).
- Rollback / cancel: zamknac bez zapisu.
- Pulapki: script compile/save moze tworzyc zasoby; pierwszy atom ma byc tylko
  otwarciem i orientacja. Po otwarciu edytora enumerowac top-level okna, bo
  w tle moze pozostac modal z poprzedniej proby, np. `Creature Properties`.
- Wynik HB-S10-001: live otworzono `Conversation Editor - untitled000`,
  przejrzano panele `Data`, `Bookmarks`, `Search`, `Text Appears When ...`,
  `Actions Taken`, `Other Actions`, `Comments`, zamknieto przez `Done`; bez
  zapisu modulu.
- Wynik HB-S12-001: live otworzono `Script Editor`, przejrzano prawy panel
  `Functions`, `Variables`, `Constants`, `Templates` oraz dolne zakladki
  `Compiler`, `Help`, `Bookmarks`, `Search Results`, zamknieto przez `Exit`;
  bez wpisywania kodu, kompilacji i zapisu modulu.
- Wynik HB-S13-001: live otworzono `Journal Editor`, udokumentowano drzewo
  `Root`, pionowy toolbar, panel `Category`, panel `Comments` oraz przyciski
  `Apply`/`OK`/`Cancel`, zamknieto przez `Cancel`; bez zapisu modulu.

## S11: Faction Editor / relacje fakcji

- Status: `opened-live`
- Warunek startowy: modul otwarty, aktualny screenshot pokazuje czytelny
  Toolset, brak modalnych okien z poprzednich prob.
- Minimalna akcja: otworzyc `Faction Editor` bez zapisu. W przebiegu
  HB-S11 uzyto `Tools` ID `126`.
- Oczekiwany efekt: widoczna karta `Basic` z wykresem relacji i lista fakcji
  oraz karta `Advanced` z macierza relacji.
- Dowod: seria screenshotow `Basic`, `Advanced`, zamkniecie przez `Cancel`;
  szczegoly w
  [Faction Editor findings](aurora-toolset-faction-editor-findings-2026-06-18.md).
- Rollback / cancel: zamknac przez `Cancel`.
- Pulapki: `OK`, `Add Faction`, `Remove Faction`, checkbox `Global Effect` i
  komorki macierzy moga mutowac modul. Nie klikac ich w atomie orientacyjnym.
- Wynik HB-S11-001: live otworzono `Faction Editor`, rozpoznano karty `Basic`
  i `Advanced`, zamknieto przez `Cancel`; bez zapisu modulu.

## S12: Toolset Options / ustawienia globalne

- Status: `opened-live`
- Warunek startowy: modul otwarty, aktualny screenshot pokazuje czytelny
  Toolset, brak modalnych okien.
- Minimalna akcja: otworzyc `Options` bez zmiany ustawien. W przebiegu HB-S14
  `Tools` ID `130` otworzylo `Options`; `Tools` ID `129` nie otworzylo
  widocznego top-level okna w tym kontekście.
- Oczekiwany efekt: widoczny dialog `Options` z lewa lista sekcji.
- Dowod: seria screenshotow sekcji `General`, `Area`, `Script Editor`,
  `Conversation Editor`, `Spell Checking`, `Sounds`, `Language`; szczegoly w
  [Options findings](aurora-toolset-options-findings-2026-06-18.md).
- Rollback / cancel: zamknac przez `Cancel`.
- Pulapki: `OK`, checkboxy, suwaki, kolory i pola sciezek moga zmieniac
  globalne zachowanie Toolsetu. W atomie orientacyjnym klikac tylko lewa liste
  kategorii.
- Wynik HB-S14-001: live otworzono `Options`, przejrzano wszystkie widoczne
  sekcje, zamknieto przez `Cancel`; bez zapisu modulu i bez zmiany ustawien.
- Aktualizacja HB-S24: live screenshot menu `Tools` pokazal, ze ID `129` to
  separator przed `Options`, a nie ukryty dialog do dalszego rozpoznawania.

## S13: Creature inventory / equipment

- Status: `opened-live`
- Warunek startowy: `d_und` otwarta, `d_und -> Creatures` rozwiniete,
  zaznaczony istniejacy creature, np. `Inzynier`.
- Minimalna akcja: otworzyc `Creature Properties`, kliknac `Inventory ...`,
  przejsc przez warning przez `OK`, udokumentowac `Inventory Contents`.
- Oczekiwany efekt: widoczny dialog `Inventory Contents` z panelami
  `Standard Equipment`, `Natural Equipment`, `Contents`, `Standard Items`,
  `Custom Items` i `Options`.
- Dowod: seria screenshotow inventory oraz zweryfikowana seria kart creature
  properties; szczegoly w
  [Creature Inventory / Equipment findings](aurora-toolset-creature-inventory-equipment-findings-2026-06-18.md).
- Rollback / cancel: zamknac `Inventory Contents` przez `Cancel`, potem
  zamknac `Creature Properties` przez `Cancel`.
- Pulapki: po `Inventory ...` pojawia sie `Warning`; nie zaznaczac `Never warn
  again`, bo to zmienia preferencje Toolsetu. `OK` w inventory moze
  zatwierdzic mutacje, wiec w atomie obserwacyjnym uzywac `Cancel`.
- Wynik HB-S16-001: live otworzono inventory/equipment creature `Inzynier`,
  udokumentowano wszystkie wieksze panele i zamknieto przez `Cancel`; bez
  dodawania itemow, bez zapisu modulu.

## S14: Find Instance / wyszukiwanie instancji

- Status: `opened-live` dla samego dialogu; `gap` dla wyszukiwania po tagu.
- Warunek startowy: Toolset widoczny na drugim ekranie, modul otwarty, brak
  modalnych okien.
- Minimalna akcja: otworzyc `Edit`, wybrac `Find Instance`, udokumentowac
  dialog i pola wyszukiwania.
- Oczekiwany efekt: widoczny dialog `Find Instance` z lista typow, polami
  `In Area`, `From Blueprint`, `With Tag`, lista wynikow oraz przyciskami
  `Clear`, `Search`, `Done`.
- Dowod: screenshot dialogu i cropy pol/wynikow; live doc:
  [Find Instance findings](aurora-toolset-find-instance-findings-2026-06-18.md).
- Rollback / cancel: zamknac przez `Done`; jesli Toolset zrobi ghost window,
  zrestartowac i wybrac `Tak` przy backup recovery.
- Pulapki: `GetWindowText` z pola `With Tag` nie jest dowodem wpisania filtra.
  W HB-S19 pole technicznie raportowalo `ZEP_SAFE001`, ale UI pozostalo puste
  i `Search` nie pokazal celu. `UIAutomationClient` / `ValuePattern` i
  eksperymenty keypost na tym VCL polu doprowadzily do zawieszenia/ghost
  window; nie uzywac ich jako standardowej metody.
- Wynik HB-S18/HB-S19: dialog otwarty live przez `Alt+E` do glownej ramki i
  `WM_CHAR f` do popup menu `#32768`; tag-search pozostaje blockerem.

## S15: Module Properties / globalne ustawienia modulu

- Status: `opened-live`.
- Warunek startowy: Toolset widoczny na drugim ekranie, modul otwarty, brak
  modalnych okien.
- Minimalna akcja: otworzyc `Edit -> Module Properties`, przejsc wszystkie
  widoczne zakladki i zamknac przez `Cancel`.
- Oczekiwany efekt: widoczny dialog `Module Properties` z kartami `Basic`,
  `Events`, `Advanced`, `Description`, `Custom Content`.
- Dowod: screenshot menu `Edit`, screenshot kazdej karty oraz screen po
  `Cancel`; live doc:
  [Module Properties findings](aurora-toolset-module-properties-findings-2026-06-18.md).
- Rollback / cancel: zamknac przez `Cancel`, nie `OK`.
- Pulapki: `Custom Content` dotyczy HAK/TLK i kolejnosci pakow; `Events`
  dotyczy globalnych hookow modulu; `Start Area` i `Starting X/Y/Z` wplywaja
  na start gry. Nie mutowac bez osobnej zgody.
- Wynik HB-S21-001: live otworzono `Module Properties` przez `Alt+E` i
  `WM_CHAR m`, udokumentowano wszystkie widoczne zakladki, zamknieto przez
  `Cancel`; bez zapisu modulu.

## S16: Module event script slot -> Script Editor

- Status: `opened-live`.
- Warunek startowy: `Module Properties` otwarte, karta `Events` widoczna,
  wybrany istniejacy slot skryptu, np. `OnAcquireItem = _main_on_acqu`.
- Minimalna akcja: kliknac `Edit` dla tego slotu bez zmiany comboboxa; w
  przebiegu HB-S22 skuteczne bylo `BM_CLICK` do konkretnego `TButton`.
- Oczekiwany efekt: otwiera sie `Script Editor` z karta istniejacego skryptu.
- Dowod: screenshot `Events` przed `Edit`, screenshot Script Editora oraz
  screeny paneli `Functions`, `Variables`, `Constants`, `Templates`,
  `Compiler`, `Help`, `Bookmarks`, `Search Results`; live doc:
  [Module event script binding findings](aurora-toolset-module-event-script-binding-findings-2026-06-18.md).
- Rollback / cancel: zamknac `Script Editor` przez `Exit`, potem `Module
  Properties` przez `Cancel`; nie uzywac `OK`.
- Pulapki: to globalny hook modulu. Nie klikac ikon save/compile, nie pisac w
  kodzie i nie zmieniac przypisania skryptu w comboboxie bez osobnej zgody.
- Wynik HB-S22-001: live otworzono `_main_on_acqu` z
  `Module Properties -> Events -> OnAcquireItem -> Edit`, udokumentowano
  panele Script Editora i zamknieto bez zmian; bez zapisu skryptu i modulu.

## S17: Module event script slot -> Select Resource

- Status: `opened-live`.
- Warunek startowy: `Module Properties` otwarte, karta `Events` widoczna,
  wybrany istniejacy slot skryptu, np. `OnAcquireItem = _main_on_acqu`.
- Minimalna akcja: kliknac `...` dla slotu i tylko obejrzec selektor zasobu.
- Oczekiwany efekt: otwiera sie `Select Resource` z zasobami typu
  `NWScript Source`, aktualnym `Resource Name` i filtrami zrodel.
- Dowod: screenshot `Events` przed `...`, screenshot `Select Resource`,
  screeny filtrow `Module Resources Only`, `All Resources`, `Hak Pak
  Resources Only`; live doc:
  [Module event resource picker findings](aurora-toolset-module-event-resource-picker-findings-2026-06-18.md).
- Rollback / cancel: przywrocic `Module Resources Only`, zamknac `Select
  Resource` przez `Cancel`, potem `Module Properties` przez `Cancel`.
- Pulapki: `Open` moze przepiac globalny event hook. `BM_CLICK` na `...` moze
  zablokowac skrypt sterujacy, bo otwiera modal; po timeoutcie sprawdzic
  screenshot i `Responding`, zanim uzna sie awarie.
- Wynik HB-S23-001: live otworzono `Select Resource` dla
  `OnAcquireItem = _main_on_acqu`, udokumentowano filtry zasobow i zamknieto
  bez zmian; bez `Open`, bez `OK`, bez zapisu modulu.

## S18: top menu atlas / nie-mutujace rozpoznanie menu

- Status: `opened-live`.
- Warunek startowy: Toolset widoczny na drugim ekranie, brak modalnych okien.
- Minimalna akcja: otworzyc pojedyncze menu glowne, zrobic screenshot i
  zamknac je przez `Esc`, bez wyboru pozycji.
- Oczekiwany efekt: widoczne pozycje menu i potencjalne submenu.
- Dowod: screenshot menu `Tools`, `Environment`, `View`, `Build`; live doc:
  [Menu atlas findings](aurora-toolset-menu-atlas-findings-2026-06-18.md).
- Rollback / cancel: wyslac `Esc` do popupu `#32768`; zweryfikowac screenshotem
  brak otwartego menu.
- Pulapki: samo otwarcie menu jest bezpieczne, ale pozycje takie jak
  `Build Module`, `Test Module`, `Fog`, `Use Area Lighting`, `Open`,
  `Options` moga byc mutujace albo szerokie.
- Wynik HB-S24-001: live udokumentowano menu `Tools`, `Environment`, `View`,
  `Build`; bez wyboru pozycji i bez zapisu modulu.
- Wynik HB-S25-001: live otworzono podmenu `View -> Toolbars` oraz
  `View -> Interface Panels`; `Selection Mode` i `Object Filters` byly
  wyszarzone/brak aktywnego canvasu, wiec pozostaja gap w tym stanie.
- Wynik HB-S27-001: po otwarciu canvasu `enon_bakery` live otworzono
  `Environment`, `View -> Selection Mode` i `View -> Object Filters`.
  `Select Objects` zostal ustawiony jako tryb roboczy, ale zielony preview
  terrain nie zniknal nawet po `Esc`; czyszczenie preview pozostaje gap.

## S19: area tree context menu -> View Area

- Status: `opened-live`.
- Warunek startowy: Toolset widoczny na drugim ekranie, `Areas` rozwiniete,
  area zaznaczone w drzewie, brak modalnych okien.
- Minimalna akcja: otworzyc menu kontekstowe area i wybrac `View Area`.
- Oczekiwany efekt: otwiera sie karta/render area w glownym workspace.
- Dowod: screenshot menu z `View Area`, screenshot renderu po komendzie oraz
  enumeracja `TfrmViewerArea - <area>`; live doc:
  [Area context View Area findings](aurora-toolset-area-view-context-findings-2026-06-18.md).
- Rollback / cancel: nie wymaga rollbacku, bo to tylko otwarcie widoku; w razie
  pomylki zamknac ewentualny dialog przez `Cancel`.
- Pulapki: `Properties` w tym samym menu otwiera `Area Properties`, a nie
  canvas. `Create Copy` i `Remove` sa mutujace/szerokie.
- Wynik HB-S26-001: live otworzono `enon_bakery` przez `View Area`; canvas
  renderuje sie poprawnie, bez zapisu modulu.

## S20: Go to Start Location / reset widoku area

- Status: `partial-live`.
- Warunek startowy: aktywny canvas area, brak modalnych okien.
- Minimalna akcja: wywolac `Go to Start Location` z
  `View -> Object Filters` albo przez znane ID menu `99`.
- Oczekiwany efekt: widok area centruje sie/przeskakuje do start location.
- Dowod: screenshot przed/po i wyrazny diff kadru; live doc:
  [Go to Start Location findings](aurora-toolset-go-to-start-location-findings-2026-06-18.md).
- Rollback / cancel: brak mutacji modulu; jezeli widok ucieknie, powtorzyc
  reset albo uzyc znanych kontrolek kamery.
- Pulapki: jesli widok byl juz blisko startu, diff moze byc zbyt maly, by
  zaliczyc atom. Nie uznawac samego `WM_COMMAND` za dowod resetu.
- Wynik HB-S28-001: komenda ID `99` wykonana live na `enon_bakery`, Toolset
  pozostal responsywny, ale diff screenshotow byl tylko ok. `0.53%`; status
  pozostaje `partial-live`.
- Wynik HB-S35: kontrolowany pan w prawo/dol zmienil kadr bardzo wyraznie
  (`32.867%` probkowanych roznic), ale `Go to Start Location` wywolane przez ID
  `99` i przez realne menu zmienilo kadr tylko o ok. `0.028%`. Dla panowania
  dolnymi przyciskami nie traktowac tej komendy jako pewnego resetu; rollback
  wykonac odwrotnymi panami albo osobno zweryfikowana kontrolka resetu.

## S21: Object Filters - Show None / Show All

- Status: `safe-repeatable` dla widokowego filtra i rollbacku.
- Warunek startowy: aktywny canvas area, brak modalnych okien, najlepiej gesty
  kadr z widocznymi placeable/dekoracjami.
- Minimalna akcja: `View -> Object Filters -> Show None`, a potem rollback
  `View -> Object Filters -> Show All`.
- Oczekiwany efekt: po `Show None` znikaja widoczne obiekty/placeable, ale
  geometria/tile i granice tile zostaja; po `Show All` obiekty wracaja.
- Dowod: screenshot przed, screenshot po `Show None`, screenshot po `Show All`;
  live doc:
  [Object Filters findings](aurora-toolset-object-filters-findings-2026-06-18.md).
- Rollback / cancel: zawsze wykonac `Show All` przed kolejnymi screenshotami.
- Pulapki: nie mylic filtra obiektow z filtrem geometrii ani z czyszczeniem
  zielonego terrain preview. Samo podswietlenie pozycji menu nie jest dowodem
  stanu.
- Wynik HB-S29-001: na `enon_bakery` live wybrano `Show None` przez popup menu;
  dekoracje/placeable zniknely, potem `Show All` przywrocil widok. Brak zapisu
  modulu.

## S22: Environment - Display Grid

- Status: `safe-repeatable`.
- Warunek startowy: aktywny canvas area, brak modalnych okien, znany stan
  poczatkowy gridu.
- Minimalna akcja: przelaczyc `Environment -> Display Grid` i natychmiast
  przywrocic stan poczatkowy.
- Oczekiwany efekt: czerwone linie grid/tile bounds znikaja albo wracaja,
  zależnie od stanu poczatkowego.
- Dowod: screenshot przed, screenshot po toggle, screenshot po rollbacku oraz
  odczyt stanu menu; live doc:
  [Display Grid findings](aurora-toolset-display-grid-findings-2026-06-18.md).
- Rollback / cancel: drugi toggle do stanu startowego; nie zostawiac gridu w
  nieznanym stanie.
- Pulapki: uzywac `TfrmFrame`, a nie `TApplication`, przy celowanych
  komunikatach. `Display Grid` nie ukrywa obiektow i nie zastępuje
  `Object Filters`.
- Wynik HB-S30-001: na `enon_bakery` stan przeszedl `0x108 -> 0x100 -> 0x108`;
  grid zniknal i wrocil, Toolset pozostal responsywny, brak zapisu modulu.
- Wynik HB-010: na aktywnym `d_und` `PostMessage WM_COMMAND 104` zmienil stan
  menu `0x108 -> 0x100 -> 0x108`, ale before/after/rollback mialy identyczny
  SHA256. Liczyc jako `menu-state-only`; nie awansowac do visual-success bez
  repaintu albo widocznego pixel diffu.

## S23: Environment - Use Area Lighting

- Status: `safe-repeatable` dla widokowego toggle z obowiazkowym restore.
- Warunek startowy: aktywny canvas `enon_bakery`, brak modalnych okien, znany
  stan poczatkowy `Use Area Lighting`.
- Minimalna akcja: przelaczyc `Environment -> Use Area Lighting` i natychmiast
  przywrocic stan poczatkowy.
- Oczekiwany efekt: po wlaczeniu Toolset uzywa oswietlenia area; na
  `enon_bakery` scena robi sie prawie czarna, widac glownie swiatla/markery.
- Dowod: screenshot przed, screenshot po wlaczeniu, screenshot po rollbacku
  oraz odczyt stanu menu; live doc:
  [Use Area Lighting findings](aurora-toolset-use-area-lighting-findings-2026-06-18.md).
- Rollback / cancel: zawsze przywrocic stan startowy przed kolejnymi
  screenshotami; w tym przebiegu bylo `0x100 -> 0x108 -> 0x100`.
- Pulapki: ciemny screen po wlaczeniu nie oznacza zlego modulu, tylko aktywny
  podglad oswietlenia. Nie zostawiac tego wlaczonego, bo kolejne screeny beda
  nieczytelne.
- Wynik HB-S31-001: na `enon_bakery` podglad oswietlenia zadzialal i zostal
  przywrocony do stanu startowego; brak zapisu modulu.
- Wynik HB-S46-002: powtorzono atom na aktywnym `enon_bakery`. `WM_COMMAND 107`
  zrobil prawie czarny podglad, drugi toggle przywrocil czytelny widok.
  Pixel diff `before -> toggle` wyniosl `24.347%`, a `before -> restored`
  tylko `0.305%`. Brak zapisu modulu.
- Wynik HB-012: live-pilot probowal powtorzyc atom, ale zatrzymal sie przed
  lighting, bo aktywna karta byla `d_und`, a targetowy klik `TPageControl` nie
  przelaczyl pewnie na `enon_bakery`. Lighting ID `107` nie zostalo wyslane;
  final `Responding=True`, brak modali, `cleanFinal=True`. Przed kolejnym
  testem lighting wymagany jest osobny atom stabilnego przelaczania area-tabow.

## S24: Environment - Fog

- Status: `safe-repeatable` dla widokowego toggle z obowiazkowym restore.
- Warunek startowy: aktywny canvas `enon_bakery`, brak modalnych okien, znany
  stan poczatkowy `Fog`.
- Minimalna akcja: przelaczyc `Environment -> Fog` i natychmiast przywrocic
  stan poczatkowy.
- Oczekiwany efekt: Toolset wlacza podglad fog; na `enon_bakery` efekt w
  obecnym kadrze jest subtelny, wiec stan menu/toolbar jest czescia dowodu.
- Dowod: screenshot przed, screenshot po wlaczeniu, screenshot po rollbacku
  oraz odczyt stanu menu; live doc:
  [Fog toggle findings](aurora-toolset-fog-toggle-findings-2026-06-18.md).
- Rollback / cancel: zawsze przywrocic stan startowy przed kolejnymi
  screenshotami; w tym przebiegu bylo `0x100 -> 0x108 -> 0x100`.
- Pulapki: to nie jest edycja fog w `Area Properties`, tylko podglad renderu.
  Nie zostawiac wlaczonego fog przed dokumentowaniem innych okien.
- Wynik HB-S32-001: na `enon_bakery` `Fog` wlaczyl sie i zostal przywrocony do
  off; brak zapisu modulu.
- Wynik HB-011: na aktywnym `d_und` `Fog` ID `106` zmienil stan menu
  `0x100 -> 0x108 -> 0x100`; hash after-toggle byl inny, a hash rollbacku
  identyczny jak before. To mocny dowod clean rollback dla widokowego toggle,
  ale nadal nie jest mutacja wartosci fog w `Area Properties`.

## Szablon wyniku heartbeat

```text
Atom:
Data/czas:
Status przed:
Stan startowy:
Akcja:
Dowod przed:
Dowod po:
Wynik: success / partial / blocker
Czy byla mutacja modulu: tak/nie
Czy modul zapisano: nie, chyba ze uzytkownik zgodzil sie jawnie
Nastepny krok:
```
