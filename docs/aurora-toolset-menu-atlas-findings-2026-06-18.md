# Aurora Toolset: menu atlas findings

Data: 2026-06-18

Ten dokument opisuje live, nie-mutujacy atom mapowania menu Toolsetu. Zakres:
otworzenie menu `Tools`, `Environment`, `View` i `Build`, screenshot kazdego
menu i zamkniecie bez wyboru pozycji.

## Kontekst proby

- Toolset: `BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17`.
- Modul: `the_last_city - codex.mod` / wariant pliku z em-dash.
- Stan startowy: Toolset widoczny na drugim ekranie, drzewo `Areas`
  rozwiniete, zaznaczone `enon_bakery`.
- Uwaga: tytul Toolsetu mial `*` juz przed tym atomem po wczesniejszym `OK` w
  `Area Properties`. W tym atomie nie wykonano zadnej mutacji i nie zapisano
  modulu.

## Sekwencja

1. Otworzyc wybrane menu celowanym mnemonicznym `Alt+...` do glownej ramki
   `TfrmFrame`.
2. Zrobic screenshot drugiego ekranu.
3. Zamknac popup menu przez `Esc` wyslane do popupu `#32768`.
4. Powtorzyc dla kolejnych menu.

Nie wybrano zadnej pozycji menu.

## `Tools`

Widoczne pozycje:

- `Conversation Editor` (`Ctrl+Alt+V`);
- `Faction Editor` (`Ctrl+Alt+F`);
- `Script Editor` (`Ctrl+Alt+S`);
- `Journal Editor` (`Ctrl+Alt+J`);
- separator;
- `Options`.

Wniosek: poprzednio testowane `Tools` ID `129` odpowiada separatorowi przed
`Options`, a nie ukrytemu dialogowi.

## `Environment`

Widoczne pozycje:

- `Refresh` (`F5`);
- `Display Grid`;
- `Display Shadows`;
- `Fog`;
- `Use Area Lighting`;
- `Fade Geometry` z submenu;
- `Render AABB Nodes`;
- `Play Ambient Sound`;
- `Play Ambient Music`;
- `Play Placed Sounds`.

W tym stanie wiele pozycji bylo wyszarzonych, bo nie byl widoczny aktywny
render area. To menu jest istotne dla przyszlych testow oswietlenia i dzwieku:
po lighting/fog trzeba przywrocic czytelny stan widoku, a przy soundach tu
widac globalne przelaczniki odtwarzania ambient/placed sounds.

## `View`

Widoczne pozycje:

- `Selection Mode` z submenu;
- `Toolbars` z submenu;
- `Interface Panels` z submenu;
- `Object Filters` z submenu;
- `Full Screen` (`F11`);
- `Show Preview Window`.

To menu jest kandydatem do osobnych atomow:

- wybor trybu selekcji;
- pokazywanie/ukrywanie toolbarow;
- object filters dla placeables/doors/triggers/sounds;
- preview window.

Aktualizacja HB-S25:

- `Toolbars` otworzylo submenu z pozycjami `File`, `Display`,
  `Selection Mode`, `Object Filters`, `Preview`; wszystkie byly zaznaczone.
- `Interface Panels` otworzylo submenu z pozycjami `Message Log`,
  `Module Contents`, `Palettes`, `Toolbar`, `Visual Camera Controls`;
  `Message Log`, `Module Contents` i `Toolbar` byly zaznaczone, a `Palettes`
  oraz `Visual Camera Controls` byly wyszarzone w tym stanie.
- `Selection Mode` i `Object Filters` byly wyszarzone/brak aktywnego renderu,
  wiec nie otworzyly osobnych submenu w tej probie. Nie promowac ich jako
  odtworzonych, dopoki nie bedzie aktywnego canvasu.

Aktualizacja HB-S27 po otwarciu canvasu `enon_bakery`:

- `Environment` pokazuje aktywne pozycje `Refresh`, `Display Grid`,
  `Display Shadows`, `Fog`, `Use Area Lighting`, `Fade Geometry`,
  `Render AABB Nodes`, `Play Ambient Sound`, `Play Ambient Music`,
  `Play Placed Sounds`.
- `View -> Selection Mode` otwiera submenu z `Select Terrain` i
  `Select Objects`.
- `View -> Object Filters` otwiera submenu:
  - `Show All`;
  - `Show None`;
  - `Show Creatures`;
  - `Show Doors`;
  - `Show Encounters`;
  - `Show Items`;
  - `Show Merchants`;
  - `Show Placeables`;
  - `Show Sounds`;
  - `Show Triggers`;
  - `Show Waypoints`;
  - `Go to Start Location`.
- Wybrano `Select Objects` jako bezpieczny tryb roboczy do dalszych atomow,
  ale zielony outline po wczesniejszym wyborze terrain/floor nie zniknal.
  `Esc` do glownej ramki/canvasu tez go nie usunal.
- HB-S29 odtworzyl mutacje widokowa `Object Filters`:
  `Show None` ukryl widoczne obiekty/placeable na `enon_bakery`, a `Show All`
  przywrocil pelny widok. Szczegoly:
  [Object Filters findings](aurora-toolset-object-filters-findings-2026-06-18.md).
- HB-S30 odtworzyl `Environment -> Display Grid`: ID `104`, stan
  `0x108 -> 0x100 -> 0x108`, czerwone linie grid/tile bounds zniknely i
  wrocily. Szczegoly:
  [Display Grid findings](aurora-toolset-display-grid-findings-2026-06-18.md).
- HB-S31 odtworzyl `Environment -> Use Area Lighting`: ID `107`, stan
  `0x100 -> 0x108 -> 0x100`; po wlaczeniu `enon_bakery` byla prawie czarna,
  wiec restore jest obowiazkowy. Szczegoly:
  [Use Area Lighting findings](aurora-toolset-use-area-lighting-findings-2026-06-18.md).
- HB-S46 odswiezyl `Use Area Lighting` na tym samym obszarze: `WM_COMMAND 107`
  znowu zrobil prawie czarny podglad, a drugi toggle przywrocil czytelny widok
  (`before -> restored` diff ok. `0.305%`).
- HB-S32 odtworzyl `Environment -> Fog`: ID `106`, stan
  `0x100 -> 0x108 -> 0x100`; efekt wizualny na obecnym kadrze byl subtelny,
  wiec dowod opiera sie tez na stanie menu/toolbar. Szczegoly:
  [Fog toggle findings](aurora-toolset-fog-toggle-findings-2026-06-18.md).

## `Build`

Widoczne pozycje:

- `Verify Area`;
- `Build Module`;
- `Test Module` (`F9`);
- `Area Statistics`.

W atomie atlasowym nie wybierac tych pozycji. `Build Module` i `Test Module`
moga uruchomic szerokie operacje, a `Area Statistics`/`Verify Area` wymagaja
osobnego celu i aktualnego renderu/area.

## Dowody

| Plik | Znaczenie |
| --- | --- |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-269-s24-tools-menu-open.png` | Menu `Tools` z pozycjami edytorow, separatorem i `Options`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-270-s24-after-tools-menu-close.png` | Stan po zamknieciu menu `Tools`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-271-s24-menu-environment.png` | Menu `Environment`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-271-s24-menu-view.png` | Menu `View`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-271-s24-menu-build.png` | Menu `Build`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-272-s24-after-menu-atlas.png` | Stan po zamknieciu menu atlasu. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-273-s25-view-submenu-toolbars.png` | `View -> Toolbars` otwarte obserwacyjnie. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-273-s25-view-submenu-interface-panels.png` | `View -> Interface Panels` otwarte obserwacyjnie. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-274-s25-after-view-submenus.png` | Stan po zamknieciu probe submenu `View`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-278-s27-environment-menu-with-canvas.png` | `Environment` z aktywnym canvasem `enon_bakery`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-279-s27-view-menu-with-canvas.png` | `View` z aktywnym canvasem. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-280-s27-view-selection-mode-with-canvas.png` | `View -> Selection Mode`: `Select Terrain`, `Select Objects`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-281-s27-view-object-filters-with-canvas.png` | `View -> Object Filters` z typami obiektow i `Go to Start Location`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-283-s27-after-select-objects-mode.png` | Po wybraniu `Select Objects`; zielony outline nadal widoczny. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-284-s27-after-escape-clear-attempt.png` | Po probie `Esc`; outline nadal widoczny. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-294-s29-after-selecting-show-none-through-menu.png` | `Object Filters -> Show None`: obiekty/placeable ukryte, geometria zostaje. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-295-s29-after-selecting-show-all-through-menu.png` | `Object Filters -> Show All`: obiekty/placeable przywrocone. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-297-s30-after-display-grid-first-toggle.png` | `Environment -> Display Grid`: grid/tile bounds wylaczone. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-298-s30-after-display-grid-restore.png` | `Environment -> Display Grid`: grid/tile bounds przywrocone. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-300-s31-after-use-area-lighting-first-toggle.png` | `Environment -> Use Area Lighting`: area prawie czarna, widoczne glownie swiatla/markery. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-301-s31-after-use-area-lighting-restore.png` | `Environment -> Use Area Lighting`: czytelny widok przywrocony. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-480-s46-use-area-lighting-after-toggle.png` | `Environment -> Use Area Lighting` refresh: podglad prawie czarny. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-481-s46-use-area-lighting-restored.png` | `Environment -> Use Area Lighting` refresh: czytelny widok przywrocony. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-303-s32-after-fog-first-toggle.png` | `Environment -> Fog`: fog wlaczone, efekt subtelny w obecnym kadrze. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-304-s32-after-fog-restore.png` | `Environment -> Fog`: fog wylaczone, czytelny widok przywrocony. |

## Pulapki

- Otworzenie menu i screenshot sa bezpieczne; wybor pozycji juz nie musi byc.
- `Build Module`, `Test Module`, `Open`, `OK`, `Options` i przelaczniki
  srodowiska moga miec skutki szersze niz obserwacja.
- `Environment -> Fog` i `Use Area Lighting` moga zmienic czytelnosc kolejnych
  screenshotow, wiec ich testy wykonywac tylko z planem rollbacku.
- Wiele pozycji moze byc wyszarzonych bez aktywnego renderu area; nie wnioskowac
  z tego, ze funkcja nie istnieje.
- Nie liczyc wyszarzonego `Selection Mode` ani `Object Filters` jako
  odtworzonego submenu; wymagaja aktywnego canvasu albo innego stanu Toolsetu.
- `Select Objects` zmienia tryb roboczy, ale nie musi czyscic starego preview
  terrain. Czyszczenie zielonego outline wymaga osobnego atomu.
- HB-S36/HB-S37 doprecyzowaly rollbacki terrain preview/selection: powrot na
  ikone `Placeables` wyczyscil zielony preview po palette, a `Select Objects`
  ID `74` zdjal niebieski outline po `Select Terrain` ID `73`.
- HB-S38/S39 pokazal, ze context popup tile ma pozycje `Tile Properties` z ID
  `222`, ale popup moze pojawic sie na pierwszym ekranie przy biezacej pozycji
  kursora systemowego, mimo targetowanego komunikatu do canvasu.
- `Show None` nie jest filtrem geometrii. Przed dalszymi screenshotami zawsze
  przywrocic `Show All`.
- `Display Grid` jest widokowym toggle. Zawsze zanotowac stan poczatkowy i
  przywrocic go po tescie.
- `Use Area Lighting` moze sprawic, ze screenshot jest prawie czarny. Po kazdym
  tescie przywrocic stan startowy.
- `Fog` moze miec subtelny efekt na widoku top-down; nie opierac dowodu
  wylacznie na subiektywnym wrazeniu mgly.

## Status

- `Top menu atlas`: `opened-live`.
- `View -> Toolbars`: `opened-live`.
- `View -> Interface Panels`: `opened-live`.
- `View -> Selection Mode`: `opened-live` z aktywnym canvasem.
- `View -> Object Filters`: `opened-live` z aktywnym canvasem.
- `Object Filters -> Show None/Show All`: `safe-repeatable` dla widoku.
- `Environment -> Display Grid`: `safe-repeatable` dla widoku.
- `Environment -> Use Area Lighting`: `safe-repeatable` dla widoku, z
  obowiazkowym restore.
- `Environment -> Fog`: `safe-repeatable` dla widoku, z restore.
- Czyszczenie terrain preview/selection: `partial-live` dla rollbacku przez
  `Placeables` po palette i `Select Objects` ID `74` po `Select Terrain`;
  nadal `gap` dla uniwersalnego czyszczenia kazdego starego preview.
- Tile context popup: `opened-live` dla samego popupu `Tile Properties` ID
  `222`; `gap` dla bezpiecznego otwarcia dialogu przez targetowana aktywacje.
- HB-S40: popup `Tile Properties` nie ma prostego ownera Win32 (`parent=0`,
  `owner=0`) i nie reaguje na proste sztuczne `WM_MOUSE*`, `WM_COMMAND 222`
  ani `WM_MENUCOMMAND` jako aktywacje pozycji.
- Mutacje: brak.
- Zapis modulu: brak.
- Nastepny eksperyment: rozpoznac submenu `Selection Mode` albo
  `Object Filters` tylko obserwacyjnie, albo wrocic do `Environment` po
  odzyskaniu realnego renderu area.
