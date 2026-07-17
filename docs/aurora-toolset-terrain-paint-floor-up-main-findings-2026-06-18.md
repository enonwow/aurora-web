# Aurora Toolset: terrain paint `Floor Up, MAIN`

Data proby: 2026-06-18

Status: `mutated-live` dla pojedynczego paint + rollback; brak
`verified-after-reopen`.

## Kontekst

- Modul: `the_last_city - codex.mod`.
- Area: `enon_bakery`.
- Cel: sprawdzic, czy umiemy nie tylko wybrac palete `Terrain`, ale tez
  wykonac realne polozenie kafla bez globalnego kursora.
- Wejscie operatorskie: tylko celowane komunikaty Win32 do kontrolek Toolsetu,
  bez globalnego `SendKeys` i bez przejmowania myszy.

## Sekwencja

1. Start: `enon_bakery`, prawa paleta w trybie `Placeables`.
2. Celowany klik w gorna ikone palety terrain (`TPanel`, screen ok.
   `-313,84`) przelaczyl prawa palete na `Terrain`.
3. Celowane klikniecia/drzewo rozwinely `Groups`; widoczny prefab
   `Theater (5x5)`.
4. Lokalny `Down` na prawym `TTreeView` wybral `Theater (5x5)` i Toolset
   przeszedl w tryb `Paint`.
5. `Theater (5x5)` dal preview grupy. Po celowanym `WM_MOUSEMOVE` preview
   zmienil kolor na czerwony; kilka prob pozycji mialo `green=0`, wiec nie
   klikano grupy.
6. Lokalnie wybrano `Terrain`, rozwinieto liste template, a potem przez lokalne
   `Down` wybrano `[T] Floor Up, MAIN`.
7. Na canvasie pojawil sie zielony preview pojedynczego tile.
8. Celowany klik w `TScrollBox` canvasu (`client 391,628`) wykonal paint.
9. Po paint na canvasie pojawil sie nowy fragment podlogi/wnetrza w dolnej
   lewej czesci kadru, a zakladka `enon_bakery` pokazala `*`.
10. Rollback: celowany klik w gorny toolbar `Undo` (`TToolBar`, client `88,11`)
    usunal testowy tile.
11. Stan czytelny przywrocono przez `WM_COMMAND 74` (`Select Objects`) i klik
    w ikone `Placeables` (`TToolBar`, client `119,18`).

## Dowody

| Plik | Znaczenie |
| --- | --- |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-405-s41-start-before-group-paint-attempt.png` | Start: `enon_bakery`, paleta `Placeables`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-408-s41-after-second-click-groups-root.png` | `Groups` rozwiniete; widoczny `Theater (5x5)`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-410-s41-after-local-down-to-theater-item.png` | `Theater (5x5)` wybrany; status `Paint`, duzy zielony preview grupy. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-411-s41-after-targeted-mousemove-preview-position.png` | Celowany `WM_MOUSEMOVE` przesuwa preview; kolor czerwony oznacza pozycje niepoprawna/kolizyjna. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-412-s41-probe-client-430-430.png` | Proba pozycji grupy; czerwony preview. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-417-s41-probe-client-360-560.png` | Ostatnia proba pozycji grupy; nadal czerwony preview. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-420-s42-after-local-right-expand-terrain-root.png` | `Terrain` rozwiniete; widoczna lista `[C]` i `[T]`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-421-s42-after-select-floor-up-main-template.png` | `[T] Floor Up, MAIN` wybrane; zielony preview pojedynczego tile. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-422-s42-after-click-paint-floor-up-main.png` | Po paint: nowy fragment podlogi/wnetrza widoczny na canvasie. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-423-s42-after-toolbar-undo-terrain-paint.png` | Po `Undo`: testowy tile zniknal, preview zostal. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-424-s42-after-restore-placeables-select.png` | Stan koncowy: `Placeables`, status `Select`, czytelny canvas. |

## Wnioski operacyjne

- Przelaczenie palety na `Terrain`, wybor `Groups`, wybor `Theater (5x5)`,
  wybor `[T] Floor Up, MAIN` i pojedynczy paint sa odtwarzalne przez celowane
  komunikaty do okien Toolsetu.
- Kolor preview jest waznym warunkiem przed kliknieciem: czerwony traktujemy
  jako stop, zielony jako kandydat do kontrolowanego paint.
- `Theater (5x5)` na `enon_bakery` byl zbyt ryzykowny w testowanych pozycjach:
  wszystkie probki po `WM_MOUSEMOVE` byly czerwone (`green=0`), wiec nie
  wykonano paint grupy.
- `[T] Floor Up, MAIN` dal zielony preview i po kliknieciu zmienil geometrie
  area. To pierwszy live dowod mutacji tile/terrain.
- Rollback przez gorny toolbar `Undo` cofnal testowy kafel. Po rollbacku trzeba
  jeszcze przywrocic `Select Objects` i palete `Placeables`, bo sam `Undo` nie
  wychodzi z trybu paint/preview.
- Nie ma tu dowodu `verified-after-reopen`: testowy tile zostal cofniety i modul
  nie byl zapisywany.

## Pulapki

- Wybieranie itemu w `TTreeView` moze nie trafic kliknieciem tekstu; lokalne
  klawisze do samego drzewa (`Down`, `Right`) byly pewniejsze.
- `Theater (5x5)` przechodzi w `Paint`, ale duzy prefab latwo daje czerwony
  preview. Nie klikac, dopoki preview nie jest zielony.
- Zakladka area juz byla oznaczona `*` przed testem z innych historycznych
  zmian, wiec sama gwiazdka nie jest dowodem tej mutacji. Dowodem jest roznica
  wizualna miedzy screenshotem przed i po paint.
- `Undo` cofa widoczny testowy tile, ale nie nalezy zakladac, ze cofa inne
  starsze zmiany w module.
