# Aurora Toolset: Terrain palette findings

Data proby: 2026-06-18

Status: `partial-live`

## Kontekst

- Modul: `the_last_city -- codex.mod` / wariant pliku z em-dash w nazwie.
- Toolset: `BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17`.
- Monitor: drugi ekran.
- Area live: `d_und`.
- Cel checklisty: S08 `Tile/Terrain + lighting`.
- Mutacja modulu: nie.
- Zapis modulu: nie.

Ten heartbeat nie otworzyl jeszcze live dialogu `Tile Properties`. Udal sie
natomiast bezpieczny, live fragment atomu: otwarcie i rozpoznanie palety
`Terrain` oraz wybor kategorii/template bez klikniecia w canvas.

## Dowody

| Plik | Znaczenie |
| --- | --- |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-056-current-state-after-s07.png` | Toolset widoczny i czytelny po atomie triggerow. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-057-s08-terrain-palette-expanded-attempt.png` | Paleta `Terrain` rozwinieta po prawej stronie. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-058-s08-terrain-floor-expanded.png` | Wybrany wpis `Floor`; na scenie pojawia sie zielony preview/selection outline. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-059-s08-after-targeted-escape.png` | Targetowane `Esc` nie zdjelo zielonego outline. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-060-s08-neutralized-terrain-parent.png` | Wybor nadrzednego `Terrain` nie zdjal zielonego outline. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-061-s08-features-parent-after-preview.png` | Wybor root `Features` rowniez nie zdjal zielonego outline. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-062-s08-wm-command-70-attempt.png` | `WM_COMMAND 70` nie otworzyl `Tile Properties` w tym stanie. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-063-s08-after-selection-mode-click.png` | Klik w pierwszy przycisk `Selection Mode` nie zdjal outline. |

## Paleta Terrain

Po rozwinieciu `Terrain` widoczne byly kategorie:

- `Bridge`
- `Corridor`
- `Doorway`
- `Eraser`
- `Fence`
- `Floor`
- `Pit`
- `Raise/Lower`
- `Wall`

Wybor `Floor` nie wymagal klikniecia w canvas, ale spowodowal pojawienie sie
zielonego outline na scenie. Na tym etapie nie wykonano malowania terenu.

## Proby otwarcia `Tile Properties`

Nieudane lub niewystarczajace sciezki w tej probie:

- `WM_COMMAND 70` do glownej ramki Toolsetu nie otworzyl `Tile Properties`.
- Context menu na wpisie `Floor` w prawym `TTreeView` nie pojawilo sie.
- Menu glowne Toolsetu jest czesciowo owner-draw: odczyt ID menu jest mozliwy,
  ale wiele captionow zwraca puste napisy, wiec nie dalo sie w tej probie
  bezpiecznie znalezc komendy `Tile Properties`.

## Referencje ekranowe

Galeria/manuale pokazuja, ze docelowy dialog `Tile Properties` zawiera:

- `Main Light 1`
- `Main Light 2`
- `Source Light 1`
- `Source Light 2`
- `Animation Loop 1`
- `Animation Loop 2`
- `Animation Loop 3`
- przyciski `Defaults`, `OK`, `Cancel`

Najbardziej uzyteczna referencja lokalna:

`../.codex-tmp/original-aurora-reference-screens/extracted-batch43/toolset-manual-v106-properties-palettes-editors/19_tile-properties-light-animation.jpg`

Uwaga: czesc pozycji w galerii z etykieta `tile-properties` faktycznie pokazuje
`Trigger Properties`, wiec nie nalezy bezkrytycznie brac etykiety CSV za dowod
ksztaltu dialogu.

## Pulapki

- Wybor terrain template moze zostawic aktywny zielony outline na scenie.
- `Esc`, wybor root `Terrain`, wybor root `Features` i pierwszy przycisk
  `Selection Mode` nie usunely outline w tej probie.
- Po wyborze `Floor` nie klikac w canvas, jesli celem jest tylko obserwacja,
  bo to moze stac sie mutacja geometrii.
- Nie awansowac calego S08 do `opened-live` dla `Tile Properties`: live mamy
  na razie palete terrain i wybor `Floor`, a nie dialog lighting.

## Nastepny eksperyment

1. Znalezc niezawodna sciezke do `Tile Properties` bez malowania.
2. Sprawdzic, czy `Tile Properties` wymaga zaznaczenia istniejacego tile/region
   w konkretnym trybie selection, a nie samego wybrania template z palety.
3. Jesli potrzebny jest test z canvasem, wykonac go na jawnie testowym obszarze
   albo po zgodzie na kontrolowana mutacje.

## HB-S36: Terrain palette, Groups i rollback preview

Cel: odtworzyc na aktywnej area `enon_bakery` podstawowa nawigacje palette
terrain/group bez malowania canvasu.

Stan startowy:

- aktywny canvas: `enon_bakery`;
- prawa paleta byla w trybie `Placeables`;
- Toolset odpowiadal i byl widoczny na drugim ekranie;
- brak modalnych okien;
- status dolny pozostawal `Select`.

Akcja:

1. Screenshot stanu startowego: `hb-344-s36-before-terrain-palette.png`.
2. Celowane klikniecie w gorna ikone Terrain/Palette na panelu palety.
3. Screenshot po przelaczeniu: `hb-345-s36-after-click-top-terrain-palette-icon.png`.
4. Celowane klikniecie `Groups`.
5. Screenshot po wyborze `Groups`: `hb-346-s36-after-expand-groups.png`.
6. Celowany `Right Arrow` do prawego `TTreeView`, aby rozwinac `Groups`.
7. Screenshot po rozwinieciu: `hb-347-s36-after-groups-right-arrow.png`.
8. Celowane klikniecie widocznego prefabu `Theater (5x5)`.
9. Screenshot po probie wyboru prefabu: `hb-348-s36-after-select-theater-group.png`.
10. Rollback widokowy: celowane klikniecie ikony `Placeables` w toolbarze
    palety (`TToolBar`, client ok. `119,18`).
11. Screenshot po rollbacku: `hb-349-s36-after-restore-placeables-palette.png`.

Wynik:

- Przelaczenie z `Placeables` na terrain palette jest live i powtarzalne przez
  gorna ikone w panelu palety.
- Terrain palette dla `enon_bakery` pokazuje rooty `Features`, `Groups` i
  `Terrain`.
- `Groups` rozwija sie do co najmniej jednego prefabu: `Theater (5x5)`.
- `Terrain` rozwija sie do listy narzedzi/template:
  `[C] Corridor`, `[C] Doorway`, `[C] Doorway, Double`,
  `[C] Floorside Middlelayer`, `[C] Window`, `[T] Floor Low`,
  `[T] Floor Up, High Ceiling`, `[T] Floor Up, MAIN`,
  `[T] Floor Up, Underlayer`, `[T] Wall`, `Eraser`.
- Sam wybor/rozwiniecie palette nie maluje canvasu i nie zapisuje modulu.
- Powrot na ikone `Placeables` wyczyscil zielony preview/outline z canvasu w
  tym przebiegu. To jest mocniejszy rollback niz wczesniejsze `Esc` i wybor
  root `Terrain`/`Features`.

Dowody dodatkowe:

| Plik | Znaczenie |
| --- | --- |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-344-s36-before-terrain-palette.png` | Start: `enon_bakery`, prawa paleta `Placeables`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-345-s36-after-click-top-terrain-palette-icon.png` | Po przelaczeniu na terrain palette; widoczne `Features`, `Groups`, `Terrain` i duzy zielony preview. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-346-s36-after-expand-groups.png` | `Groups` zaznaczone, `Terrain` zwiniety. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-347-s36-after-groups-right-arrow.png` | `Groups` rozwiniete; widoczny prefab `Theater (5x5)`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-348-s36-after-select-theater-group.png` | Proba wyboru `Theater (5x5)` bez klikniecia canvasu. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-349-s36-after-restore-placeables-palette.png` | Rollback: powrot do `Placeables`, zielony preview zdjety. |

Wniosek operacyjny:

- Do samego rozpoznania tile/group uzywac palette, nie canvasu.
- Po eksperymencie terrain/group najbezpieczniejszy znany rollback preview to
  przelaczenie palety z powrotem na `Placeables`.
- `Theater (5x5)` jest pierwszym live rozpoznanym prefabem z `Groups`, ale nie
  zostal jeszcze namalowany ani zweryfikowany po reopenie.
- `Tile Properties` nadal pozostaje osobnym gapem.

## HB-S37: Select Terrain i proba Tile Properties bez malowania

Cel: sprawdzic, czy `Tile Properties` otwiera sie po wybraniu trybu
`Select Terrain` i kliknieciu istniejacego tile na canvasie.

Stan startowy:

- aktywny canvas: `enon_bakery`;
- prawa paleta przywrocona do `Placeables`;
- brak modalnych okien;
- status roboczy czytelny, bez zielonego preview po HB-S36.

Akcja:

1. Wyslano `WM_COMMAND 73` do glownej ramki Toolsetu, co odpowiada
   `View -> Selection Mode -> Select Terrain`.
2. Screenshot: `hb-350-s37-after-select-terrain-mode-command73.png`.
3. Celowane klikniecie istniejacego tile na canvasie, bez przeciagania i bez
   aktywnego template paint.
4. Screenshot: `hb-351-s37-after-click-existing-tile-select-terrain.png`.
5. Wyslano `WM_COMMAND 70`, czyli znana sciezke `Object Properties`.
6. Screenshot po probie: `hb-352-s37-after-object-properties-command70-for-tile.png`.
7. Enumeracja top-level windows nie pokazala zadnego nowego dialogu properties.
8. Rollback: `WM_COMMAND 74` do glownej ramki, czyli `Select Objects`.
9. Screenshot po rollbacku: `hb-354-s37-after-restore-select-objects.png`.

Wynik:

- `Select Terrain` przez ID `73` jest live: po kliknieciu istniejacego tile
  pojawia sie niebieski outline zaznaczenia tile/regionu.
- Samo zaznaczenie tile nie wygladalo na mutacje geometrii i nie otworzylo
  modala.
- `WM_COMMAND 70` po takim zaznaczeniu nie otworzyl `Tile Properties` w tym
  stanie.
- `Select Objects` przez ID `74` zdjal niebieskie zaznaczenie tile i przywrocil
  czytelny stan canvasu.
- `Tile Properties` nadal pozostaje gapem, ale mamy teraz pewna sciezke do
  nie-mutujacego wyboru terrain/tile.

Dowody dodatkowe:

| Plik | Znaczenie |
| --- | --- |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-350-s37-after-select-terrain-mode-command73.png` | Po przejsciu w `Select Terrain`; pojawia sie zielony preview/outline stanu terrain. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-351-s37-after-click-existing-tile-select-terrain.png` | Po kliknieciu istniejacego tile; niebieski outline pokazuje zaznaczenie regionu/tile. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-352-s37-after-object-properties-command70-for-tile.png` | Po `WM_COMMAND 70`; brak dialogu `Tile Properties`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-354-s37-after-restore-select-objects.png` | Po `Select Objects`; zaznaczenie tile zdjete, canvas czytelny. |

Wniosek operacyjny:

- Dla bezpiecznego zaznaczania tile uzywac sekwencji:
  `WM_COMMAND 73` -> celowany klik istniejacego tile -> screenshot ->
  `WM_COMMAND 74` jako rollback.
- Nie zakladac, ze `Object Properties` (`70`) dziala dla tile tak jak dla
  placeable. W tym stanie nie dziala.
- Nastepny eksperyment powinien sprawdzic inne sciezki do `Tile Properties`:
  menu kontekstowe na zaznaczonym tile, pozycje glownego menu po aktywnym
  zaznaczeniu terrain albo podwojny klik tile w `Select Terrain`.

## HB-S38/S39: context menu `Tile Properties`

Cel: znalezc bezpieczna, powtarzalna sciezke do `Tile Properties` dla
zaznaczonego tile bez malowania canvasu i bez przejmowania globalnego kursora.

Stan startowy:

- aktywny canvas: `enon_bakery`;
- prawa paleta przywrocona do `Placeables`;
- brak modalnych okien;
- Toolset responsywny;
- znana sekwencja selection z HB-S37:
  `WM_COMMAND 73` -> klik istniejacego tile -> `WM_COMMAND 74` rollback.

Akcje i wyniki:

1. `WM_CONTEXTMENU` wyslany do `TScrollBox` canvasu nie otworzyl popupu.
2. Podwojny klik wybranego tile w `Select Terrain` nie otworzyl dialogu.
3. Proba otwarcia glownego `Edit` menu targeted clickiem nie pokazala menu.
4. Pasywna enumeracja glownego `HMENU` pokazala, ze `Edit` ma pozycje ID
   `56-69`, ale bez czytelnych captionow; `Tile Properties` nie jest tam
   jawnie widoczne.
5. Klasyczne `WM_RBUTTONDOWN/WM_RBUTTONUP` na `TScrollBox` otworzylo popup
   `#32768` z pojedyncza pozycja `Tile Properties`.
6. Popup pojawil sie na pierwszym ekranie przy biezacej pozycji kursora
   systemowego, mimo ze kursor nie byl ruszany. To wazna pulapka VCL: samo
   targetowane `WM_RBUTTON*` moze wywolac UI poza drugim monitorem.
7. Odczyt `MN_GETHMENU` z okna popupu zwrocil realne menu:
   jedna pozycja `&Tile Properties`, ID `222`.
8. Zwykly targetowany klik w popup oraz targetowany `Enter` do popupu/ramki
   zamykaly popup, ale nie otwieraly dialogu.
9. Bezposredni `WM_COMMAND 222` nie otworzyl `Tile Properties`, gdy byl wyslany
   do `TfrmFrame`, `TScrollBox`, `TfrmViewerArea`, `TTabSheet` ani
   `TApplication`.
10. Rollback po probach: `WM_COMMAND 74` (`Select Objects`), brak modalnych
    okien, brak zapisu modulu.

Dowody:

| Plik | Znaczenie |
| --- | --- |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-355-s38-start-before-tile-context.png` | Start S38, przed context menu. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-357-s38-after-select-existing-tile.png` | Tile zaznaczony w `Select Terrain`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-358-s38-after-contextmenu-on-selected-tile.png` | Po `WM_CONTEXTMENU`; brak popupu. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-359-s38-after-doubleclick-selected-tile.png` | Po podwojnym kliknieciu; brak dialogu. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-364-s38-rbutton-popup-on-first-screen.png` | Popup na pierwszym ekranie; widoczna pozycja `Tile Properties`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-368-s39-tile-properties-popup-before-click.png` | Drugi zrzut popupu przed proba wyboru pozycji. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-372-s39-after-enter-to-popup.png` | Po `Enter` do popupu; brak dialogu. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-377-s39-after-command222-tile-properties.png` | Po `WM_COMMAND 222` do glownej ramki; brak dialogu. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-381-s39-after-command222-to-scrollbox.png` | Po `WM_COMMAND 222` do `TScrollBox`; brak dialogu. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-385-s39-after-command222-to-viewerarea.png` | Po `WM_COMMAND 222` do `TfrmViewerArea`; brak dialogu. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-388-s39-after-command222-more-targets-restore-select-objects.png` | Koncowy rollback po testach owner-targets. |

Wniosek operacyjny:

- Mamy pewna sciezke do ujawnienia menu `Tile Properties`, ale nie mamy jeszcze
  bezpiecznej, w pelni targetowanej sciezki do wybrania tej pozycji i otwarcia
  dialogu.
- Popup `Tile Properties` ma ID `222`, ale samo `WM_COMMAND 222` nie odtwarza
  klikniecia popupu wprost.
- Do czasu znalezienia lepszej metody nie wolno deklarowac `Tile Properties`
  jako `opened-live`.
- Poniewaz popup potrafi pojawic sie na pierwszym ekranie przy aktualnej pozycji
  kursora, nastepne proby powinny unikac `WM_RBUTTON*` albo najpierw znalezc
  sposob ustawienia miejsca popupu bez ruszania kursora.

## HB-S40: proby aktywacji popupu bez globalnego klikniecia

Cel: sprawdzic, czy pozycje `Tile Properties` z popupu tile da sie aktywowac
bez globalnego klikniecia i bez ruszania kursora.

Stan startowy:

- aktywny canvas: `enon_bakery`;
- brak modalnych okien;
- Toolset responsywny;
- znany popup: `WM_COMMAND 73` -> klik tile -> `WM_RBUTTONDOWN/UP` na
  `TScrollBox` -> popup `#32768` z `Tile Properties`;
- znane ID pozycji popupu: `222`.

Akcje i wyniki:

1. Popup odtworzono ponownie; `MN_GETHMENU` potwierdzil `hmenu=644746951`,
   jedna pozycja `&Tile Properties`, ID `222`.
2. `GetParent`, `GetWindow(GW_OWNER)` i `GetAncestor` dla popupu pokazaly brak
   prostego wlasciciela Win32 (`parent=0`, `owner=0`, root to popup).
3. `SendMessage` bezposrednio do `#32768`:
   `WM_MOUSEMOVE`, `WM_LBUTTONDOWN`, `WM_LBUTTONUP` w srodku pozycji nie
   podswietlily pozycji i nie otworzyly dialogu.
4. W trakcie otwartego popupu probowano:
   - `SendMessage WM_COMMAND 222` do `TfrmFrame`;
   - `PostMessage WM_COMMAND 222` do `TfrmFrame`;
   - `SendMessage WM_MENUCOMMAND` z pozycja `0` i `HMENU` do `TfrmFrame`;
   - `SendMessage WM_COMMAND 222` do samego `#32768`.
5. Zadna z tych prob nie otworzyla dialogu `Tile Properties`.
6. Kazdy przebieg zakonczono `Esc` + `WM_COMMAND 74` (`Select Objects`).

Dowody:

| Plik | Znaczenie |
| --- | --- |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-389-s40-start-before-popup-activation-tests.png` | Start S40 przed probami aktywacji popupu. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-395-s40-popup-before-direct-mouse.png` | Popup `Tile Properties` przed bezposrednim mouse message do `#32768`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-396-s40-popup-after-sendmessage-mousemove.png` | Po `WM_MOUSEMOVE` do popupu; brak highlightu. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-397-s40-after-sendmessage-click-popup-window.png` | Po `WM_LBUTTONDOWN/UP` do popupu; brak dialogu. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-400-s40-open-popup-sendmessage-command222-frame.png` | Popup nadal otwarty po `SendMessage WM_COMMAND 222` do ramki. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-401-s40-open-popup-postmessage-command222-frame.png` | Popup nadal otwarty po `PostMessage WM_COMMAND 222` do ramki. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-402-s40-open-popup-sendmessage-menucommand-frame.png` | Popup nadal otwarty po `WM_MENUCOMMAND`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-403-s40-open-popup-sendmessage-command222-popup.png` | Popup nadal otwarty po `WM_COMMAND 222` do `#32768`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-404-s40-after-open-menu-command-tests-restore.png` | Stan po rollbacku `Select Objects`. |

Wniosek operacyjny:

- Popup `Tile Properties` jest udokumentowany, ale jego pozycja zachowuje sie
  jak owner-draw/menu-loop VCL, ktore nie przyjmuje prostych sztucznych
  `WM_MOUSE*`, `WM_COMMAND` ani `WM_MENUCOMMAND`.
- Bez globalnego klikniecia nadal nie mamy bezpiecznej aktywacji pozycji
  `Tile Properties`.
- Nie awansowac dialogu `Tile Properties` do `opened-live`.
- Nastepne bezpieczne kierunki: znalezc alternatywna sciezke menu/akceleratora,
  sprawdzic komunikaty wysylane przy prawdziwej aktywacji w osobnym, swiadomie
  zatwierdzonym eksperymencie, albo odlozyc dialog tile i isc w kolejny atom
  terrain/group bez malowania.

## HB-S41/S42: `Groups` preview i pojedynczy paint terrain

Cel: przejsc od samej obserwacji palety do kontrolowanego, screenshotowego
dowodu mutacji terrain bez globalnego kursora.

Stan startowy:

- aktywny canvas: `enon_bakery`;
- prawa paleta przywrocona do `Placeables`;
- brak modalnych okien;
- sterowanie tylko przez targetowane komunikaty do kontrolek Toolsetu.

Akcje i wyniki:

1. Screenshot startowy: `hb-405-s41-start-before-group-paint-attempt.png`.
2. Klik w ikone terrain/palette na prawym panelu przelaczyl palete na terrain.
3. Rozwinieto `Groups`, ujawniajac `Theater (5x5)`.
4. Lokalny `Down` na prawym `TTreeView` wybral `Theater (5x5)` i wlaczyl
   status `Paint`.
5. `WM_MOUSEMOVE` do canvasu przesuwal preview grupy. Preview zmienil kolor na
   czerwony; probki pozycji `430,430`, `500,500`, `620,440`, `700,530`,
   `880,430`, `360,560` mialy `green=0`, wiec grupa nie zostala kliknieta.
6. Wybrano root `Terrain`, rozwinieto liste template i wybrano
   `[T] Floor Up, MAIN`.
7. Zielony preview pojedynczego tile zostal klikniety w `TScrollBox` canvasu
   (`client 391,628`).
8. Po kliknieciu pojawil sie nowy fragment podlogi/wnetrza w dolnej lewej
   czesci kadru. To jest pierwszy live dowod `mutated-live` dla terrain paint.
9. Rollback wykonano przez gorny toolbar `Undo`, a nastepnie przywrocono
   `Select Objects` i palete `Placeables`.

Dowody:

| Plik | Znaczenie |
| --- | --- |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-405-s41-start-before-group-paint-attempt.png` | Start S41: `enon_bakery`, `Placeables`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-408-s41-after-second-click-groups-root.png` | `Groups` rozwiniete, widoczny `Theater (5x5)`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-410-s41-after-local-down-to-theater-item.png` | `Theater (5x5)` wybrany, status `Paint`, zielony preview. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-411-s41-after-targeted-mousemove-preview-position.png` | Targetowany `WM_MOUSEMOVE`; czerwony preview grupy. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-412-s41-probe-client-430-430.png` | Jedna z prob czerwonego preview grupy. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-417-s41-probe-client-360-560.png` | Ostatnia probka czerwonego preview grupy. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-420-s42-after-local-right-expand-terrain-root.png` | Lista terrain template po rozwinieciu root `Terrain`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-421-s42-after-select-floor-up-main-template.png` | `[T] Floor Up, MAIN` wybrany; zielony preview pojedynczego tile. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-422-s42-after-click-paint-floor-up-main.png` | Po paint: nowy fragment geometrii widoczny na canvasie. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-423-s42-after-toolbar-undo-terrain-paint.png` | Po `Undo`: testowy tile cofniety, ale paint preview nadal aktywny. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-424-s42-after-restore-placeables-select.png` | Koniec: `Placeables`, status `Select`, czytelny canvas. |

Szczegoly mutacji i rollbacku:
[Terrain paint `Floor Up, MAIN`](aurora-toolset-terrain-paint-floor-up-main-findings-2026-06-18.md).

Wniosek operacyjny:

- `Groups -> Theater (5x5)` jest juz nie tylko `opened-live`, ale ma
  przetestowany preview w trybie `Paint`; na `enon_bakery` wszystkie
  sprawdzone pozycje byly czerwone, wiec nie wykonano paint grupy.
- `[T] Floor Up, MAIN` zostal wybrany i namalowany live. Status dla tego
  konkretnego paint atomu to `mutated-live`.
- Rollback przez toolbar `Undo` dziala dla tej proby, ale nie jest jeszcze
  `verified-after-reopen`, bo zmiana zostala cofnieta i modul nie byl
  zapisywany.
- `Tile Properties` pozostaje osobnym gapem.

## HB-S43/S44: groups na `enon_test_build`

Cel: sprawdzic group preview i potencjalny group paint na pustszym/testowym
obszarze niz `enon_bakery`.

Wyniki:

1. Dwuklik w lewym drzewie otworzyl `enon_test_build` jako nowy canvas
   (`TfrmViewerArea - enon_test_build`, aktywny `TScrollBox` `40242048`).
2. Paleta `Groups` byla inna niz na `enon_bakery`: zamiast `Theater (5x5)`
   pokazala prefaby `[Jungle]` i `[Swamp]`.
3. `[Jungle] Camp 1 (2x2)` mial czerwony preview w kilku testowanych
   pozycjach; nie klikano go jako mutacji.
4. `[Jungle] Camp 2 (1x2)` dal stabilny zielony preview po reselect.
5. Dwie proby klikniecia zielonego preview nie daly jednoznacznego dowodu
   nowej namalowanej grupy: znikala polprzezroczysta tresc preview, zostawal
   zielony outline i nie bylo wyraznej nowej geometrii/dekoracji.
6. Wykonano `Undo` i restore do `Placeables` + `Select`.

Dowody i szczegoly:
[Terrain groups preview on enon_test_build](aurora-toolset-terrain-group-preview-findings-2026-06-18.md).

Wniosek operacyjny:

- Group preview awansuje do `opened-live` takze na `enon_test_build`, ale
  group paint pozostaje nierozstrzygniety/gap.
- Kolor preview trzeba oceniac po ustabilizowaniu; zielony preview jest
  kandydatem, ale nie jest jeszcze dowodem mutacji.
- Nastepna proba powinna sprawdzic origin/top-left klik albo inny prefab, a
  sukces musi miec bardzo wyrazne before/after.

## HB-S45: origin/top-left nie wystarczyl dla group paint

Cel: sprawdzic hipoteze, ze `[Jungle] Camp 2 (1x2)` wymaga klikniecia w
origin/top-left zielonego preview.

Wynik:

- Odtworzono zielony preview `[Jungle] Camp 2 (1x2)` na `enon_test_build`.
- Wykryto ramke preview i kliknieto ok. `client 444,413` aktywnego canvasu
  `TScrollBox 40242048`, czyli blisko top-left/origin.
- Po kliknieciu nadal nie bylo jednoznacznej nowej geometrii/dekoracji grupy;
  zniknela polprzezroczysta tresc preview, zostal zielony outline.
- `Undo` i restore do `Placeables` + `Select` wykonane.

Dowody:

- `hb-456-s45-camp2-green-preview-before-origin-detection.png`
- `hb-457-s45-after-click-origin-top-left-camp2-group.png`
- `hb-458-s45-after-undo-origin-top-left-camp2-group.png`
- `hb-459-s45-after-restore-origin-top-left-test.png`

Szczegoly:
[Terrain group preview on enon_test_build](aurora-toolset-terrain-group-preview-findings-2026-06-18.md).

Wniosek operacyjny: group paint nadal nie awansuje do `mutated-live`.

## HB-S50: Tile Properties popup i akcelerator `t`

Cel: powtorzyc bezpieczny wybor istniejacego tile i sprawdzic, czy popup
`Tile Properties` da sie aktywowac akceleratorem bez globalnego kursora.

Wynik:

- `WM_COMMAND 73` ponownie przelaczyl Toolset w `Select Terrain`.
- Celowany klik w istniejacy tile na `d_und` (`client 455,752`) dal niebieski
  outline selection i nie wykonal paint.
- Celowany prawy klik otworzyl popup `Tile Properties`, ale popup pojawil sie
  na pierwszym ekranie przy pozycji kursora systemowego.
- `SendMessage WM_CHAR 't'` do popupu `#32768` nie otworzyl dialogu i
  zablokowal skrypt automatyzacji do timeoutu.
- Toolset pozostal responsywny; popup zamknieto targetowanym `PostMessage
  Escape`, a stan przywrocono przez `WM_COMMAND 74` (`Select Objects`).

Dowody i szczegoly:
[Tile Properties HB-S50 findings](aurora-toolset-tile-properties-hb-s50-findings-2026-06-18.md).

Wniosek operacyjny: dialog `Tile Properties` nadal jest `gap`; nie powtarzac
zwyklego `SendMessage WM_CHAR` do popupu bez timeoutu.
