# Aurora Toolset: roadmapa nauki atomow

Data rozbicia: 2026-06-18

Roadmapa sluzy do pracy heartbeatowej: jeden maly atom, jedna kontrolowana
akcja, jeden dowod przed/po. Aurora Toolset jest jednowatkowy, wiec planowanie
moze byc asynchroniczne, ale mutacje UI wykonujemy seryjnie.

## Format eksperymentu 1-minutowego

Kazdy eksperyment powinien miec:

- Cel: jeden atom, nie caly workflow.
- Stan startowy: jaki modul, area, dialog albo zaznaczony obiekt.
- Akcja: jedna operacja UI.
- Dowod przed: screenshot albo odczyt stanu.
- Dowod po: screenshot, reopened properties, object count albo diff.
- Dla conversation/properties i innych wielozakladkowych okien dowod po ma
  byc seria screenshotow: overview oraz kazda widoczna zakladka albo wiekszy
  panel funkcjonalny.
- Kryterium sukcesu: co musi byc prawda, zeby atom awansowal.
- Miejsce zapisu wyniku: doc atomu albo nowy krotki doc pod `docs/`.

Nie wolno:

- zaliczac atomu, tworzyc wnioskow operacyjnych ani nazywac screena dowodem,
  jezeli Aurora Toolset nie jest uruchomiona i nie ma aktualnego realnego
  screenshota Toolsetu;
- przejmowac globalnego kursora uzytkownika;
- uzywac globalnego `SendKeys`;
- zapisywac modulu bez zgody;
- kontynuowac po `Access violation` bez restartu Toolsetu i odtworzenia
  znanych krokow;
- kontynuowac po ghost window / `Responding=False`, jezeli dialog nie daje sie
  zamknac przez celowane komunikaty;
- promowac atomu do `verified-after-reopen` bez twardego dowodu.

## Pierwsza kolejka eksperymentow

| ID | Atom | Cel | Stan startowy | Jedna akcja | Sukces | Gdzie dopisac wynik |
| --- | --- | --- | --- | --- | --- | --- |
| EXP-001 | `Adjust Location` | Otworzyc dialog dokladnej pozycji dla selected placeable. | `_ikea`, zaznaczony `test - codex` albo inny potwierdzony placeable. | Wywolac `Adjust Location` z context menu albo komendy, bez edycji wartosci. | Widoczny dialog lokalizacji i screenshot. | Checklist `S01`; nowy doc jesli metoda zadziala. |
| EXP-002 | Palette context menu | Rozpoznac menu palety i pozycje find/copy/update. | Prawa paleta z wybranym template. | Otworzyc context menu. | Screenshot menu + lista pozycji, bez wyboru mutujacej opcji. | Checklist `S02`. |
| EXP-003 | Placeable inventory | Otworzyc contents editor dla placeable. | Placeable properties otwarte; obiekt testowy preferowany. | Kliknac `Inventory...` albo wlaczyc minimalnie sciezke do edytora. | Widoczny contents editor; bez dodawania itemu w pierwszym przebiegu. | Checklist `S03`. |
| EXP-004 | Area Properties lighting/fog | Otworzyc visual/environment controls area. | `enon_bakery` otwarta; to docelowy obszar do nauki oswietlenia. | Otworzyc Area Properties i karte visual/environment. | Screenshot fog/lighting/day-night controls. | Checklist `S04`. |
| EXP-005 | Sound radius | Otworzyc Sound Properties i radius marker. | Area z wieksza liczba elementow; przed nauka dzwiekow najpierw znalezc gestsza lokacje. | Otworzyc properties sound marker. | Screenshot radius/positioning controls na tle gestszej sceny. | Checklist `S05`. |
| EXP-006 | Door transition | Otworzyc Door Properties + Area Transition. | Area z drzwiami albo door blueprint. | Otworzyc transition tab/dialog. | Screenshot target area/type/door fields. | Checklist `S06`. |
| EXP-007 | Trigger volume | Otworzyc Trigger Properties dla triggera. | Trigger volume istnieje albo paleta triggerow widoczna. | Zaznaczyc trigger i otworzyc properties. | Screenshot selection volume + Basic/Advanced/Scripts. | Checklist `S07`. |
| EXP-008 | Tile/Terrain properties | Otworzyc Tile Properties bez malowania. | Area otwarta, wybrany tile/terrain region. | Otworzyc properties wybranego tile. | Screenshot metadata/lighting controls. | Checklist `S08`. |
| EXP-009 | Creature basic | Otworzyc Creature Properties Basic. | `d_und -> Creatures` rozwiniete, wybrany istniejacy creature. | Zaznaczyc creature i otworzyc properties bez wizard finish. | Screenshot preview 3D i fields; [Creature Properties findings](aurora-toolset-creature-properties-findings-2026-06-18.md). | Checklist `S09`; status `opened-live`. |
| EXP-010 | Conversation/Journal/Script | Otworzyc edytor i rozpoznac panele. | Modul otwarty. | Otworzyc jeden edytor bez zapisu. | Seria screenshotow tree/editor/function panels; [Conversation Editor findings](aurora-toolset-conversation-editor-findings-2026-06-18.md); [Script Editor findings](aurora-toolset-script-editor-findings-2026-06-18.md); [Journal Editor findings](aurora-toolset-journal-editor-findings-2026-06-18.md). | Checklist `S10`; Conversation Editor, Script Editor i Journal Editor `opened-live`. |
| EXP-011 | Faction Editor | Otworzyc edytor fakcji i rozpoznac relacje. | Modul otwarty, brak modalnych okien. | Wywolac `Tools` ID `126`, przejsc `Basic` i `Advanced`. | Screenshot wykresu/listy fakcji oraz macierzy relacji; [Faction Editor findings](aurora-toolset-faction-editor-findings-2026-06-18.md). | Checklist `S11`; status `opened-live`. |
| EXP-012 | Toolset Options | Otworzyc globalne opcje bez zmiany ustawien. | Modul otwarty, brak modalnych okien. | Wywolac `Tools` ID `130`, przejsc wszystkie sekcje, zamknac `Cancel`. | Screenshot kazdej sekcji; [Options findings](aurora-toolset-options-findings-2026-06-18.md). | Checklist `S12`; status `opened-live`; `Tools` ID `129` rozpoznany jako separator menu. |
| EXP-013 | Creature inventory/equipment | Otworzyc inventory istniejacego creature i rozpoznac panele bez zmian. | `d_und`, zaznaczony `Inzynier`, `Creature Properties` otwarte. | Kliknac `Inventory ...`, przejsc warning przez `OK`, zrobic serie screenow, zamknac `Cancel`. | `Inventory Contents` widoczny; screeny `Standard Equipment`, `Natural Equipment`, `Contents`, `Standard Items`, `Custom Items`, `Options`; [Creature Inventory / Equipment findings](aurora-toolset-creature-inventory-equipment-findings-2026-06-18.md). | Checklist `S13`; status `opened-live`. |
| EXP-014 | Find Instance | Otworzyc systemowe wyszukiwanie instancji bez globalnego inputu. | Modul otwarty, brak modalnych okien. | `Edit -> Find Instance`, udokumentowac pola i wyniki. | Dialog widoczny; tag-search dopiero po widocznym filtrze i wyniku. | Checklist `S14`; [Find Instance findings](aurora-toolset-find-instance-findings-2026-06-18.md). |
| EXP-015 | Module Properties | Otworzyc globalne ustawienia modulu bez mutacji. | Modul otwarty, brak modalnych okien. | `Edit -> Module Properties`, screen kazdej zakladki, `Cancel`. | Karty `Basic`, `Events`, `Advanced`, `Description`, `Custom Content` widoczne. | Checklist `S15`; [Module Properties findings](aurora-toolset-module-properties-findings-2026-06-18.md). |
| EXP-016 | Module event Script Editor | Otworzyc istniejacy skrypt z globalnego event slotu modulu. | `Module Properties -> Events`, istniejacy slot `OnAcquireItem = _main_on_acqu`. | `Edit` przy slocie, tylko otwarcie i dokumentacja Script Editora. | Script Editor pokazuje `_main_on_acqu`; screeny paneli referencji i outputu; zamkniecie `Exit` + `Cancel`. | Checklist `S16`; [Module event script binding findings](aurora-toolset-module-event-script-binding-findings-2026-06-18.md). |
| EXP-017 | Module event resource picker | Otworzyc selektor skryptu dla globalnego event slotu bez przepiecia zasobu. | `Module Properties -> Events`, slot `OnAcquireItem = _main_on_acqu`. | `...` przy slocie, obejrzec filtry, `Cancel`. | Widoczny `Select Resource`, filtry `Module/All/Hak`, brak `Open` i brak `OK`. | Checklist `S17`; [Module event resource picker findings](aurora-toolset-module-event-resource-picker-findings-2026-06-18.md). |
| EXP-018 | Top menu atlas | Zmapowac menu bez wyboru pozycji. | Toolset widoczny, brak modali. | Otworzyc menu, screenshot, `Esc`. | Screenshoty `Tools`, `Environment`, `View`, `Build`; brak mutacji. | Checklist `S18`; [Menu atlas findings](aurora-toolset-menu-atlas-findings-2026-06-18.md). |
| EXP-019 | Area context View Area | Otworzyc realny canvas area z drzewa. | `Areas` rozwiniete, `enon_bakery` zaznaczone. | Context menu area -> `View Area`. | Widoczny render `enon_bakery`, `TfrmViewerArea - enon_bakery`. | Checklist `S19`; [Area context View Area findings](aurora-toolset-area-view-context-findings-2026-06-18.md). |
| EXP-020 | Go to Start Location | Zweryfikowac reset/recenter widoku area. | Aktywny canvas `enon_bakery`. | `View -> Object Filters -> Go to Start Location` / ID `99`. | Wyrazna zmiana kadru po wczesniejszym pan/zoom. | Checklist `S20`; [Go to Start Location findings](aurora-toolset-go-to-start-location-findings-2026-06-18.md). |
| EXP-021 | Object Filters Show None/All | Nauczyc widokowe ukrycie i przywrocenie obiektow. | Aktywny canvas `enon_bakery`, widoczne placeable/dekoracje. | `View -> Object Filters -> Show None`, potem `Show All`. | Obiekty znikaja i wracaja po rollbacku; modul niezapisany. | Checklist `S21`; [Object Filters findings](aurora-toolset-object-filters-findings-2026-06-18.md). |
| EXP-022 | Display Grid | Nauczyc wlaczenie/wylaczenie gridu tile. | Aktywny canvas `enon_bakery`, znany stan startowy gridu. | `Environment -> Display Grid`, potem rollback. | Linie grid/tile bounds znikaja/wracaja, stan menu przywrocony; jesli hash sie nie zmienia, zapisac jako `menu-state-only`. | Checklist `S22`; [Display Grid findings](aurora-toolset-display-grid-findings-2026-06-18.md). |
| EXP-023 | Use Area Lighting | Nauczyc bezpieczny podglad area lighting i restore. | Aktywny canvas `enon_bakery`, stan startowy lighting off. | `Environment -> Use Area Lighting`, potem rollback. | Scena pokazuje area lighting i wraca do czytelnego stanu; brak zapisu. | Checklist `S23`; [Use Area Lighting findings](aurora-toolset-use-area-lighting-findings-2026-06-18.md). Przed replayem z innej karty najpierw potwierdzic atom przelaczania area-tabow. |
| EXP-024 | Fog toggle | Nauczyc bezpieczny podglad fog i restore. | Aktywny canvas `enon_bakery`, stan startowy fog off. | `Environment -> Fog`, potem rollback. | Fog toggle potwierdzony menu/toolbar i widok wraca do startu; clean rollback moze miec identyczny hash before/final. | Checklist `S24`; [Fog toggle findings](aurora-toolset-fog-toggle-findings-2026-06-18.md). |
| EXP-025 | Terrain paint + rollback | Nauczyc pojedynczy tile paint i natychmiastowy rollback. | `enon_bakery`, paleta `Terrain`, zielony preview `[T] Floor Up, MAIN`. | Kliknac zielony preview w canvas, screenshot, `Undo`, restore `Placeables`. | Nowy fragment tile widoczny po paint i znikniety po `Undo`; brak save. | Checklist `S08`; [Terrain paint Floor Up MAIN](aurora-toolset-terrain-paint-floor-up-main-findings-2026-06-18.md). |
| EXP-026 | Terrain group preview | Nauczyc tileset-dependent `Groups`, green/red preview i warunek bezpiecznego klikniecia. | `enon_test_build`, paleta `Terrain -> Groups`, prefab `[Jungle] Camp 2 (1x2)`. | Ustabilizowac preview, screenshot, ewentualny klik tylko przy zielonym preview, `Undo`, restore. | Zielony/czerwony preview udokumentowany; group paint tylko po wyraznym before/after. | Checklist `S08`; [Terrain group preview](aurora-toolset-terrain-group-preview-findings-2026-06-18.md). |
| EXP-027 | Terrain group origin click | Sprawdzic, czy group paint wymaga klikniecia w top-left/origin preview. | `enon_test_build`, `[Jungle] Camp 2 (1x2)`, stabilny zielony preview. | Klik `client 444,413`, screenshot, `Undo`, restore. | Jesli po kliknieciu nie ma wyraznej nowej geometrii, nie awansowac paint. | Checklist `S08`; HB-S45 w [Terrain group preview](aurora-toolset-terrain-group-preview-findings-2026-06-18.md). |

## Wynik EXP-006 / HB-S48 z 2026-06-18

EXP-006 ma potwierdzony refresh `opened-live` dla wielozakladkowego
`Door Properties`. Na `hx_tygiel_under` otwarto istniejace drzwi
`hx_undertyg_gatemain`, zrobiono screeny kart `Basic`, `Scripts`, `Lock`,
`Description`, `Area Transition`, `Advanced`, `Comments` i `Trap`, a nastepnie
zamknieto dialog przez `Cancel`. Szczegoly:
[Door Properties tabs refresh](aurora-toolset-door-properties-tabs-refresh-2026-06-18.md).

Wniosek operacyjny:

1. `Door Properties` ma dwurzedowy `TPageControl`; recapture jednej karty na
   osobne otwarcie jest pewniejszy niz klikanie stalej sekwencji koordynatow.
2. `Setup Area Transition` nadal jest gapem i wymaga osobnej zgody/testowego
   duplikatu, bo moze mutowac polaczenia nawigacyjne.
3. `Trap` na realnych drzwiach moze byc juz wlaczony; przed mutacja trzeba
   zawsze zapisac stan startowy.
4. W tej iteracji nie zapisano modulu, bo nie wykonano kontrolowanej mutacji.

## Wynik EXP-007 / HB-S49 z 2026-06-18

EXP-007 ma potwierdzony refresh dla istniejacego triggera. Startowo sprawdzono
`hx_tygiel_under`, ale galaz `Triggers` nie pokazala dzieci; do atomu uzyto
`d_und`, otwartego przez context menu `View Area`. Nastepnie rozwinieto
`d_und -> Triggers`, otwarto `Trigger Properties` dla `d_und_t_left`, zrobiono
screeny kart `Basic`, `Scripts`, `Advanced`, `Comments` i zamknieto przez
`Cancel`. Szczegoly:
[Trigger Properties refresh](aurora-toolset-trigger-properties-refresh-2026-06-18.md).

Wniosek operacyjny:

1. Dla pracy na triggerach preferowac `d_und`; `hx_tygiel_under` w tej probie
   nie dal dzieci pod `Triggers`.
2. Po otwarciu `Trigger Properties` szukac klasy `TdlgTriggerEdit`, nie samego
   tytulu okna, bo istnieje ukryty `TfrmPreview` o tym samym tytule.
3. Otwarcie istniejacego triggera i przejscie kart mozna traktowac jako
   `safe-repeatable` po tej korekcie.
4. Rysowanie nowego trigger volume nadal jest `gap` i wymaga osobnej zgody,
   bo jest mutacja geometrii.

## Awans statusu

| Z | Na | Warunek |
| --- | --- | --- |
| `screen-supported` | `opened-live` | Dialog/edytor/palette otwarty w live Toolsecie i udokumentowany screenshotem. |
| `opened-live` | `mutated-live` | Wykonana pojedyncza kontrolowana mutacja, bez zapisu modulu. |
| `mutated-live` | `verified-after-reopen` | Po `OK` dialog/properties zostaly otwarte ponownie i pokazuja zmiane. |
| `verified-after-reopen` | `safe-repeatable` | Sekwencja zostala opisana jako checklist, z pulapkami i bezpiecznym rollbackiem. |

## Bramka czytelnosci screenshotow

Kazdy heartbeat zaczyna sie od potwierdzenia, ze realny screenshot pokazuje
czytelny Toolset albo wlasciwy dialog. Jezeli monitor, popup albo modal sprawia,
ze na screenie prawie nic nie widac, wynik nie awansuje statusu atomu. W takiej
sytuacji trzeba najpierw przywrocic czytelnosc widoku, znalezc dialog na innym
ekranie albo podniesc konkretny HWND na wierzch, a dopiero potem robic dowod.

## Kompozycje workflow

Te kompozycje nie sa jeszcze w calosci `verified-live`. To mapy, jak skladac
pojedyncze atomy po ich nauczeniu.

| Workflow | Cel | Atomy skladowe | Status |
| --- | --- | --- | --- |
| Skrzynia z lootem | Dodac pojemnik, nazwac go, ustawic jako interaktywny i dodac zawartosc. | Add placeable, rename, flags, inventory/contents, reopened properties. | Mixed: placeable verified, placeable inventory gap/partial. |
| Drzwi z przejsciem | Dodac albo wybrac drzwi i polaczyc je z target area/door/waypoint. | Door properties, lock/key, Area Transition, validation markerow. | Mixed: Door Properties tabs `opened-live`, `Setup Area Transition` i rzeczywiste polaczenie nadal gap. |
| Ambient zaulka | Dodac sound marker i ustawic radius/looping/random dla klimatu miejsca. | Sound placement/properties, radius, area visual validation; uczyc na gestszej lokacji z wieloma elementami. | Screen-supported. |
| Mgla i swiatlo obszaru | Ustawic fog/lighting/day-night dla klimatu Last City. | Area Properties na `enon_bakery`, environment controls, screenshot before/after. | Screen-supported. |
| NPC z dialogiem | Dodac NPC, ustawic basic properties, przypiac conversation. | Creature properties, creature inventory/equipment, conversation editor, script binding. | Mixed: Creature Properties, Creature Inventory/Equipment, Conversation Editor i Script Editor opened-live; creation/binding screen-supported. |
| Trigger sceny | Dodac trigger volume i przypiac skrypt lub event. | Trigger volume, Trigger Properties Scripts, Script Editor. | Mixed: Trigger Properties i Script Editor opened-live, creation/binding screen-supported. |
| Prosty rozrost wnetrza | Dodac pojedynczy pas/komore tile i natychmiast potwierdzic, ze da sie cofnac. | Terrain palette, `[T] Floor Up, MAIN`, green/red preview, paint, toolbar Undo, restore Placeables. | Single-tile paint `mutated-live`; reopen verification nadal gap. |
| Szybki prefab grupy | Wybrac pasujaca grupe tilesetu i ustawic preview na poprawnej kratce. | `Terrain -> Groups`, tileset-dependent lista, green/red preview, origin/top-left click sprawdzony negatywnie dla `[Jungle] Camp 2`. | Group preview `opened-live`; group paint nadal gap/nierozstrzygniety. |
| Szybka walidacja kadru | Po mutacji potwierdzic, ze scena dalej renderuje sie i obiekt jest tam, gdzie powinien. | Camera, reset/recenter, screenshot diff, reopened properties. | Partly safe-repeatable. |

## Jak dopisywac wyniki

1. Jezeli eksperyment tylko otwiera dialog, dopisac wynik do checklisty i
   status `opened-live`.
2. Jezeli eksperyment robi mutacje, stworzyc osobny doc w stylu istniejacych
   placeable notes.
3. Kazdy doc mutacji musi miec:
   - kontekst proby;
   - sekwencje;
   - dowody screenshotowe;
   - status rezultatu;
   - zasady bezpieczenstwa.
4. Dopiero po takim docu zaktualizowac indeks statusow.

## Korekta heartbeat z 2026-06-18

Po tescie z wylaczonymi ekranami Toolset przestal byc stabilnym widocznym
targetem, a pozniejsze screenshoty pokazywaly Codex albo nieprawidlowy
prostokat okna. To nie moze byc traktowane jako dowod pracy w Aurorze.

Nowa regola dla petli:

1. Na poczatku heartbeat sprawdzic, czy `nwtoolset.exe` dziala.
2. Potwierdzic widoczny `TfrmFrame` Toolsetu i aktywny modul.
3. Zrobic realny screenshot Aurory.
4. Dopiero po takim dowodzie wykonywac atom z checklisty.
5. Jezeli Aurora nie dziala albo screen nie pokazuje Toolsetu, pierwszym atomem
   jest odzyskanie/uruchomienie Aurory, a nie dalsza dokumentacja operacji.

Regula backup recovery:

1. Jezeli po restarcie Toolset pyta, czy odzyskac modul znaleziony w backupie,
   wybrac `Tak`/`Yes`.
2. Po zaakceptowaniu backup recovery nie otwierac tego samego modulu drugi raz
   przez `File > Open`.
3. Traktowac odzyskany stan jako aktualny stan modulu, zrobic screenshot
   potwierdzajacy i kontynuowac od najblizszego atomu checklisty.

Regula ghost window:

1. Jezeli Windows pokazuje klasy `Ghost` dla Toolsetu albo dialogu, nie
   walczyc dalej z tym samym atomem.
2. Zapisac screenshot i wniosek jako blocker.
3. Wymusic restart Toolsetu, potem wybrac `Tak` w backup recovery.
4. Po recovery nie otwierac modulu drugi raz, tylko kontynuowac z odzyskanego
   drzewa modulu.

Regula lighting/fog:

1. Testy oswietlenia wykonywac na `enon_bakery`.
2. Po testach przywrocic z gornego paska domyslny czytelny widok/render, zeby
   kolejne screenshoty nadal mialy wartosc dowodowa.
3. Nie zostawiac wlaczonej mgly, przyciemnienia albo innego trybu podgladu,
   ktory zaslania scene, chyba ze screenshot dotyczy wlasnie tego efektu.

## Wynik EXP-004 / partial z 2026-06-18

EXP-004 ma dodatkowy live material po recovery:

- `enon_bakery` otwiera `Area Properties` z poprawnym `Name`;
- udokumentowano karty `Basic`, `Visual`, `Audio`, `Events`, `Advanced`,
  `Comments`;
- klik `OK` w properties oznaczyl modul jako dirty (`*`), ale nie pokazal
  canvasu;
- ponowny `Enter` na `enon_bakery` ponownie otworzyl `Area Properties`;
- zakonczono przez `Cancel`, bez zapisu modulu.

Dowod i szczegoly:
[aurora-toolset-area-properties-environment-findings-2026-06-18.md](aurora-toolset-area-properties-environment-findings-2026-06-18.md).

Nastepny krok: znalezc bezpieczna sciezke do realnego renderu `enon_bakery`
po recovery albo pracowac na wczesniej otwartym renderze, zanim bedziemy
mutowac lighting/fog.

## Wynik EXP-004 / HB-S33 safe-cancel refresh

Swiezy przebieg zapisano w:
[aurora-toolset-area-properties-enon-bakery-safe-cancel-2026-06-18.md](aurora-toolset-area-properties-enon-bakery-safe-cancel-2026-06-18.md).

Wniosek operacyjny:

1. Pewna sciezka do `Area Properties` dla `enon_bakery` to context menu area i
   klik `Properties`.
2. `Enter` do `TTreeView` i akcelerator `p` nie sa pewne w tym stanie.
3. Udokumentowano wszystkie zakladki i `Environment Options`.
4. `Environment Options` pokazuje `Always Dark`, `Moon Fog Amount = 10`,
   `Fog Clip Distance = 45`, `Shadow Opacity = 60`, weather `0`, `Sky Box =
   None`.
5. Oba dialogi zamknieto przez `Cancel`; nadal nie ma kontrolowanej mutacji
   lighting/fog.

## Wynik EXP-004 / HB-S46 targeted-only refresh

Swiezy przebieg zapisano w:
[aurora-toolset-area-properties-context-menu-targeting-refresh-2026-06-18.md](aurora-toolset-area-properties-context-menu-targeting-refresh-2026-06-18.md).

Wniosek operacyjny:

1. Pewna selekcja `enon_bakery` wymaga bezposredniego celowania w lewy
   `TTreeView` `329966`, klient okolo `69,122`.
2. Popup context menu area otwiera sie stabilnie przez `PostMessage`
   `WM_RBUTTONDOWN/UP` do tego `TTreeView`.
3. `Properties` w popupie ma ID `19`, ale w tej sesji nie udalo sie otworzyc
   dialogu przez `WM_COMMAND`, `PostMessage` click ani `VK_END + VK_RETURN`.
4. `WM_CHAR p` jest ryzykowne, bo moze wykonac akcje na blednie zaznaczonym
   obszarze; w tej probie otworzyl `Area Properties` dla `enon_butcher`.
5. Do kolejnej proby potrzebny jest inny mechanizm aktywacji popup-menu albo
   alternatywna sciezka do Area Properties bez globalnej myszy.

## Wynik EXP-023 / HB-S46 refresh

Powtorzono `Environment -> Use Area Lighting` na aktywnym `enon_bakery`.

Dowody:

- `hb-479-s46-use-area-lighting-before.png`
- `hb-480-s46-use-area-lighting-after-toggle.png`
- `hb-481-s46-use-area-lighting-restored.png`

Wniosek: po toggle scena robi sie prawie czarna, drugi toggle przywraca
czytelny widok. Pixel diff `before -> toggle` wyniosl `24.347%`, a
`before -> restored` `0.305%`. Atom pozostaje `safe-repeatable`, pod warunkiem
natychmiastowego restore.

## Wynik EXP-005 / HB-S47 playback-volume refresh

Swiezy przebieg zapisano w:
[aurora-toolset-sound-playback-volume-refresh-2026-06-18.md](aurora-toolset-sound-playback-volume-refresh-2026-06-18.md).

Wniosek operacyjny:

1. `hx_tygiel_under` nadal jest dobrym targetem dla soundow, bo jest gestszy od
   `enon_bakery` i ma wiele markerow.
2. `Fireplace` mozna otworzyc przez `hx_tygiel_under -> Sounds -> Fireplace`,
   popup i `WM_CHAR p`.
3. `Play/Stop` mozna wykonac przez `BM_CLICK`, ale screenshot nie dowodzi
   slyszalnosci audio.
4. `Volume` w dialogu ma raw skale `0..127`; raw `127` to wizualne maksimum
   `10`, raw `64` okolice srodka. Nie uzywac raw `10` jako ludzkiego `10/10`.
5. Po tescie przywrocono raw `127` i zamknieto `Cancel`, bez zapisu.

## Wynik EXP-002 / HB-S34 partial

Swiezy przebieg zapisano w:
[aurora-toolset-palette-placeables-context-attempt-findings-2026-06-18.md](aurora-toolset-palette-placeables-context-attempt-findings-2026-06-18.md).

Wniosek operacyjny:

1. Prawa paleta moze zostac przelaczona na `Placeables` z toolbaru palety.
2. Widoczne sa kategorie placeable blueprintow, m.in. `Battlefield`,
   `Containers & Switches`, `Treasure`, `Visual Effects`.
3. Right-click na `Terrain`, narzedziach terrain i kategorii `Battlefield` nie
   pokazal context menu.
4. Proby palety moga przelaczyc Toolset w `Paint`; po eksperymencie trzeba
   wrocic do `Select Objects`.
5. Wlasciwe context menu palety z `Find Text`/`Edit Copy`/`Update Instances`
   nadal pozostaje gapem.

## Wynik EXP-007 z 2026-06-18

EXP-007 zostal odtworzony live na area `d_und`, trigger `d_und_t_left_2`.
Dowod i kroki sa w:
[aurora-toolset-trigger-properties-findings-2026-06-18.md](aurora-toolset-trigger-properties-findings-2026-06-18.md).

Wniosek operacyjny:

1. `d_und` jest dobra lokacja do nauki triggerow, bo ma duzo istniejacych
   wpisow w `Triggers`.
2. Podwojny klik triggera w drzewie focusuje obiekt, ale nie otwiera
   properties.
3. Dla `Properties` z menu triggera skuteczny byl `WM_CHAR p` wyslany do
   popup menu `#32768`.
4. Po pracy z triggerami sprawdzic czytelnosc screena, bo overlay czerwonych
   grid lines, niebieskich trigger volumes i zoltych markerow moze utrudnic
   pozniejsze dowody.

## Wynik EXP-008 / partial z 2026-06-18

EXP-008 ma na razie status czesciowy. Live odtworzono prawa palete `Terrain`
i wybor `Floor` bez klikniecia w canvas. Dowod i szczegoly:
[aurora-toolset-terrain-palette-findings-2026-06-18.md](aurora-toolset-terrain-palette-findings-2026-06-18.md).

Wniosek operacyjny:

1. `Terrain` rozwija sie do kategorii `Bridge`, `Corridor`, `Doorway`,
   `Eraser`, `Fence`, `Floor`, `Pit`, `Raise/Lower`, `Wall`.
2. Wybor `Floor` tworzy zielony outline na scenie, ale sam w sobie nie jest
   dowodem malowania terenu.
3. Po wyborze `Floor` nie klikac canvasu bez zgody, bo moze to wykonac mutacje
   geometrii.
4. `Tile Properties` nadal wymaga osobnego eksperymentu; w tej probie
   `WM_COMMAND 70` nie otworzyl dialogu.

Aktualizacja HB-S36:

1. Na `enon_bakery` przelaczono prawa palete z `Placeables` na terrain palette
   przez gorna ikone palety, bez globalnego kursora.
2. Terrain palette pokazala `Features`, `Groups`, `Terrain`.
3. `Groups` rozwinieto przez celowany `Right Arrow`; widoczny prefab:
   `Theater (5x5)`.
4. Lista `Terrain` w tym stanie obejmuje m.in. `[C] Corridor`, `[C] Doorway`,
   `[T] Floor Low`, `[T] Wall` i `Eraser`.
5. Powrot na ikone `Placeables` wyczyscil zielony preview/outline z canvasu;
   to jest aktualnie najlepszy rollback dla samego podgladu palette.
6. Nie wykonano malowania, nie otwarto `Tile Properties`, nie zapisano modulu.

Aktualizacja HB-S37:

1. `WM_COMMAND 73` przelacza `View -> Selection Mode -> Select Terrain`.
2. Klik istniejacego tile w tym trybie daje niebieski outline selection; to
   jest pierwszy bezpieczny live atom wyboru terrain/tile.
3. `WM_COMMAND 70` po tym wyborze nie otwiera `Tile Properties`.
4. `WM_COMMAND 74` (`Select Objects`) zdejmuje selection outline i wraca do
   czytelnego stanu.
5. Nastepna proba dla `Tile Properties`: context menu na zaznaczonym tile albo
   menu glowne po aktywnym terrain selection, bez malowania.

Aktualizacja HB-S38/S39:

1. `WM_CONTEXTMENU` na canvasie nie otwiera menu tile, ale
   `WM_RBUTTONDOWN/UP` na zaznaczonym tile otwiera popup `Tile Properties`.
2. Popup potrafi pojawic sie na pierwszym ekranie przy biezacej pozycji kursora
   systemowego, mimo ze kursor nie byl ruszany.
3. `MN_GETHMENU` z popupu daje ID `222` dla `&Tile Properties`.
4. Direct `WM_COMMAND 222` do glownej ramki i znanych wlascicieli canvasu nie
   otwiera dialogu, wiec dialog `Tile Properties` nadal nie jest `opened-live`.
5. Nastepna proba: znalezc sposob aktywacji pozycji popupu bez globalnego
   klikniecia albo alternatywna sciezke menu/akceleratora.

Aktualizacja HB-S40:

1. Popup `Tile Properties` nadal daje ID `222`, ale nie ma prostego ownera
   Win32 (`parent=0`, `owner=0`).
2. Sztuczne komunikaty do popupu `#32768` nie podswietlaja i nie aktywuja
   pozycji.
3. `WM_COMMAND 222` i `WM_MENUCOMMAND` w trakcie otwartego menu nie otwieraja
   dialogu.
4. Ten atom zostaje `partial-live`: selection + popup sa opanowane, dialog nie.
5. Kolejny krok: albo alternatywna sciezka do dialogu, albo przerwa od tile
   properties i przejscie do nastepnego atomu terrain/group bez malowania.

Aktualizacja HB-S50:

1. Powtorzono `Select Terrain` (`WM_COMMAND 73`) i klik istniejacego tile na
   `d_und`; selection outline pojawil sie bez paint.
2. Popup `Tile Properties` nadal otwiera sie po targetowanym prawym kliknieciu,
   ale moze pojawic sie na pierwszym ekranie przy pozycji kursora systemowego.
3. `SendMessage WM_CHAR 't'` do popupu `#32768` nie otworzyl dialogu i
   zablokowal skrypt automatyzacji do timeoutu narzedzia.
4. Kolejne proby aktywacji popupu musza uzywac `PostMessage` albo
   `SendMessageTimeout`; zwykly `SendMessage` bez timeoutu jest zakazany dla
   tego atomu.
5. Szczegoly i dowody:
   [Tile Properties HB-S50 findings](aurora-toolset-tile-properties-hb-s50-findings-2026-06-18.md).

## Wynik EXP-003 / partial z 2026-06-18

EXP-003 nadal jest partial/gap dla placeable inventory. Parser read-only
wskazal kandydata `_ikea` `ZEP_SAFE001` / `zep_safe002` z `hasInventory=true`,
ale live sciezka do otwarcia jego inventory nie zostala jeszcze odtworzona.
Dowod i szczegoly:
[aurora-toolset-placeable-inventory-candidate-findings-2026-06-18.md](aurora-toolset-placeable-inventory-candidate-findings-2026-06-18.md).

Wniosek operacyjny:

1. Kandydat do nastepnego eksperymentu to `_ikea`, placeable `ZEP_SAFE001`.
2. Ukryty `TdlgFindInstance` pokazal puste/niezainicjalizowane okno, wiec nie
   jest jeszcze bezpieczna sciezka.
3. Nie promowac placeable inventory na podstawie creature inventory; to osobne
   atomy.

Aktualizacja HB-S17:

1. `_ikea -> Placeables` da sie rozwinac live, ale wpisy instancji sa puste /
   bez nazw.
2. `WM_COMMAND 19` do lewego `TTreeView` potrafi otworzyc
   `Placeable Object Properties` dla wybranego wpisu.
3. Parserowa okolica celu: `witcher2_sejf` index `211`, `ZEP_SAFE001` index
   `213`, `witcher_pheasant` index `215`.
4. Otworzono live pobliskie properties `witcher2_sejf` i `witcher_pheasant`,
   ale nie potwierdzono jeszcze `ZEP_SAFE001`; EXP-003 pozostaje `gap`.
5. Nastepna proba powinna zaczac od stabilizacji wyboru w `TTreeView` albo od
   poprawnego `Find Instance`, a nie od kolejnych losowych offsetow.

## Wynik EXP-013 z 2026-06-18

EXP-013 zostal odtworzony live na area `d_und`, creature `Inzynier`
(`d_und_engineer`). Dowod i szczegoly:
[aurora-toolset-creature-inventory-equipment-findings-2026-06-18.md](aurora-toolset-creature-inventory-equipment-findings-2026-06-18.md).

Wniosek operacyjny:

1. Dla creature w tym stanie skuteczna sciezka do properties to `WM_COMMAND 19`
   do lewego `TTreeView`.
2. Klik `Inventory ...` moze najpierw otworzyc `Warning`; screenshot warningu
   jest osobnym dowodem, a `Never warn again` zostawiamy nietkniete.
3. `Inventory Contents` ma osobne panele `Standard Equipment`,
   `Natural Equipment`, `Contents`, `Standard Items`, `Custom Items` i
   `Options`; kazdy warto dokumentowac osobnym screenem.
4. Pierwszy atom inventory zamykac przez `Cancel`, bez dodawania itemow i bez
   zapisu modulu.

## Wynik EXP-014 / partial z 2026-06-18

EXP-014 ma status mieszany:

- `Find Instance` jako dialog: `opened-live`;
- wyszukiwanie po tagu `ZEP_SAFE001`: `gap`;
- metody `UIAutomationClient` / `ValuePattern` i keypost do `TEdit`: zakazane
  na teraz, bo doprowadzily do ghost window i restartu.

Dowod i szczegoly:
[aurora-toolset-find-instance-findings-2026-06-18.md](aurora-toolset-find-instance-findings-2026-06-18.md).

Wniosek operacyjny:

1. Bezpieczne otwarcie: `Alt+E` do glownej ramki, potem `WM_CHAR f` do popupu
   `#32768`.
2. Nie liczyc technicznego readbacku `GetWindowText` jako dowodu filtra.
3. Po ghost window restartowac Toolset i wybrac `Tak` przy backup recovery.
4. Po restore nie uzywac `File > Open`; drzewo modulu jest juz odzyskane.

## Wynik EXP-015 z 2026-06-18

EXP-015 zostal odtworzony live:
[aurora-toolset-module-properties-findings-2026-06-18.md](aurora-toolset-module-properties-findings-2026-06-18.md).

Wniosek operacyjny:

1. Bezpieczne otwarcie: menu `Edit`, potem `WM_CHAR m` do popupu `#32768`.
2. `Module Properties` ma zakladki `Basic`, `Events`, `Advanced`,
   `Description`, `Custom Content`.
3. `Events` pokazuje globalne hooki skryptowe modulu; to osobny potencjalny
   atom dla script binding.
4. `Custom Content` pokazuje HAK/TLK i nie wolno mutowac kolejnosci bez zgody.
5. Atom zamykac przez `Cancel`; nie uzywac `OK` w rozpoznaniu.

## Wynik EXP-016 z 2026-06-18

EXP-016 zostal odtworzony live:
[aurora-toolset-module-event-script-binding-findings-2026-06-18.md](aurora-toolset-module-event-script-binding-findings-2026-06-18.md).

Wniosek operacyjny:

1. `Module Properties -> Events` pozwala otworzyc istniejacy skrypt globalnego
   hooka przez `Edit`.
2. Dla `OnAcquireItem = _main_on_acqu` skuteczny byl `BM_CLICK` do przycisku
   `Edit`; zwykle celowane klikniecie nie bylo wystarczajaco niezawodne.
3. Po otwarciu trzeba dokumentowac Script Editor jako wieksza funkcje:
   `Functions`, `Variables`, `Constants`, `Templates`, `Compiler`, `Help`,
   `Bookmarks`, `Search Results`.
4. Zamykac `Exit`, potem `Module Properties -> Cancel`; bez save/compile i
   bez `OK`.

## Wynik EXP-017 z 2026-06-18

EXP-017 zostal odtworzony live:
[aurora-toolset-module-event-resource-picker-findings-2026-06-18.md](aurora-toolset-module-event-resource-picker-findings-2026-06-18.md).

Wniosek operacyjny:

1. `...` przy globalnym event slocie otwiera `Select Resource` dla
   `NWScript Source`.
2. Dialog ma filtry `All Resources`, `Module Resources Only`,
   `Hak Pak Resources Only` oraz pola `Resource Name`, `Resources of Type`,
   `Name Filter`.
3. `Open` jest mutacja przypisania skryptu; w atomie obserwacyjnym uzywac
   tylko filtrow i `Cancel`.
4. Gdy przycisk otwierajacy modal wywoluje timeout skryptu sterujacego, nie
   zakladac od razu awarii. Najpierw sprawdzic screenshot i `Responding`.

## Wynik EXP-018 z 2026-06-18

EXP-018 zostal odtworzony live:
[aurora-toolset-menu-atlas-findings-2026-06-18.md](aurora-toolset-menu-atlas-findings-2026-06-18.md).

Wniosek operacyjny:

1. `Environment` zawiera przelaczniki grid/shadows/fog/area lighting oraz
   ambient/placed sound playback, ale bez aktywnego renderu wiele pozycji jest
   wyszarzonych.
2. `View` jest kandydatem do osobnych atomow `Selection Mode`,
   `Interface Panels` i `Object Filters`.
3. `Build` zawiera szerokie operacje `Build Module` i `Test Module`; nie
   wybierac ich w atomach obserwacyjnych.
4. `Tools` potwierdza, ze ID `129` to separator przed `Options`.
5. HB-S25 otworzyl `View -> Toolbars` i `View -> Interface Panels`;
   `Selection Mode` oraz `Object Filters` byly wyszarzone bez aktywnego
   canvasu, wiec wymagaja powrotu po odzyskaniu renderu area.
6. HB-S27 po otwarciu `enon_bakery` potwierdzil `Selection Mode` i
   `Object Filters` jako `opened-live`; `Object Filters` zawiera m.in.
   `Show All`, typy obiektow i `Go to Start Location`.
7. `Select Objects` nie wyczyscil zielonego terrain preview; osobny atom
   czyszczenia preview pozostaje do nauczenia.

## Wynik EXP-019 z 2026-06-18

EXP-019 zostal odtworzony live:
[aurora-toolset-area-view-context-findings-2026-06-18.md](aurora-toolset-area-view-context-findings-2026-06-18.md).

Wniosek operacyjny:

1. Brak canvasu po samym zaznaczeniu area nie oznacza automatycznie zlego
   zaladowania modulu.
2. Dla `enon_bakery` skuteczna sciezka to context menu wpisu area i `View
   Area`.
3. `Properties` jest osobna pozycja w tym samym menu i prowadzi do dialogu, a
   nie do renderu.
4. Po otwarciu canvasu mozna wracac do atomow `Environment`, `Selection Mode`
   i `Object Filters`, ktore bez aktywnego renderu byly wyszarzone.

## Wynik EXP-020 / partial z 2026-06-18

EXP-020 ma status partial:
[aurora-toolset-go-to-start-location-findings-2026-06-18.md](aurora-toolset-go-to-start-location-findings-2026-06-18.md).

Wniosek operacyjny:

1. `Go to Start Location` jest dostepne w `View -> Object Filters` i odpowiada
   ID menu `99`.
2. Komenda nie zawiesila Toolsetu i nie mutowala modulu.
3. W tym przebiegu diff przed/po byl tylko ok. `0.53%`, wiec nie wystarcza do
   statusu `safe-repeatable`.
4. Nastepna proba musi zaczac od kontrolowanego przesuniecia/zoomu widoku,
   potem dopiero reset.

Aktualizacja HB-S35:

1. Kontrolowany pan dolnymi przyciskami zmienil kadr wyraznie: ok. `32.867%`
   probkowanych roznic.
2. `Go to Start Location` wywolane przez ID `99` oraz przez realne menu po tym
   panie prawie nie zmienilo kadru: ok. `0.028%` probkowanych roznic.
3. Wniosek: nie uzywac tej komendy jako pewnego rollbacku po panowaniu
   canvasu. Najpierw rozdzielic testy start location, zoomu, rotacji i pan.
4. Widok przywrocono recznie odwrotnymi panami, bez zapisu modulu.

## Wynik EXP-021 z 2026-06-18

EXP-021 zostal odtworzony live:
[aurora-toolset-object-filters-findings-2026-06-18.md](aurora-toolset-object-filters-findings-2026-06-18.md).

Wniosek operacyjny:

1. `Show None` ukrywa obiekty/placeable, ale nie ukrywa geometrii/tile.
2. `Show All` jest obowiazkowym rollbackiem po tym atomie.
3. Najmocniejszy dowod dal wybor z realnego popupu menu; sama proba przez ID
   menu nie byla wystarczajaca jako dowod.
4. Zielony terrain preview pozostaje osobnym gapem.

## Wynik EXP-022 z 2026-06-18

EXP-022 zostal odtworzony live:
[aurora-toolset-display-grid-findings-2026-06-18.md](aurora-toolset-display-grid-findings-2026-06-18.md).

Wniosek operacyjny:

1. `Environment -> Display Grid` ma ID `104`.
2. W tym stanie startowym grid byl wlaczony: `0x108`.
3. Toggle wylaczyl czerwone linie grid/tile bounds: `0x100`.
4. Drugi toggle przywrocil stan startowy: `0x108`.
5. To atom widokowy, nie mutacja modulu.
6. Refresh HB-010 na `d_und` potwierdzil tylko stan menu i rollback; screenshoty
   byly bitowo identyczne. Kolejny replay musi wymusic repaint albo zapisac
   wynik jako `menu-state-only`.

## Wynik EXP-023 z 2026-06-18

EXP-023 zostal odtworzony live:
[aurora-toolset-use-area-lighting-findings-2026-06-18.md](aurora-toolset-use-area-lighting-findings-2026-06-18.md).

Wniosek operacyjny:

1. `Environment -> Use Area Lighting` ma ID `107`.
2. W tym stanie startowym podglad byl wylaczony: `0x100`.
3. Po wlaczeniu stan byl `0x108`, a `enon_bakery` stala sie prawie czarna.
4. Po rollbacku stan wrocil do `0x100` i screenshoty sa znow czytelne.
5. To nie edytuje jeszcze wartosci lighting w `Area Properties`; to podglad
   renderu.
6. Refresh HB-012 przez live-pilota nie dotknal ID `107`, bo nie udalo sie
   stabilnie przejsc z `d_und` na `enon_bakery`. To tworzy osobny atom
   prerequisite: `area-tab switch`.

## Wynik EXP-024 z 2026-06-18

EXP-024 zostal odtworzony live:
[aurora-toolset-fog-toggle-findings-2026-06-18.md](aurora-toolset-fog-toggle-findings-2026-06-18.md).

Wniosek operacyjny:

1. `Environment -> Fog` ma ID `106`.
2. W tym stanie startowym fog byl wylaczony: `0x100`.
3. Po wlaczeniu stan byl `0x108`; efekt wizualny na obecnym kadrze jest
   subtelny, wiec stan menu/toolbar jest czescia dowodu.
4. Po rollbacku stan wrocil do `0x100`.
5. To nie edytuje jeszcze wartosci fog w `Area Properties`; to podglad renderu.
