# Aurora Toolset: Placeables palette context attempt

Data: 2026-06-18  
Modul: `the_last_city - codex.mod`  
Area: `enon_bakery`  
Status: `partial-live`; paleta `Placeables` otwarta live, context menu palety
nadal `gap`.

## Cel

Sprawdzic atom `S02: palette context menu`: otworzyc prawa palete blueprintow,
przelaczyc ja na `Placeables`, sprobowac context menu na folderach/templateach i
zamknac wszystko bez wyboru mutujacej opcji.

## Stan startowy

- Toolset otwarty na drugim ekranie.
- Aktywny canvas `enon_bakery`.
- Prawa paleta byla w stanie `Terrain`.
- Brak modalnych okien.

## Przebieg live

1. Zidentyfikowano prawa palete:
   - `TfraMainPalette`;
   - toolbar palety: `TToolBar`;
   - drzewo palety: `TTreeView`.
2. Proba context menu na `Terrain` nie pokazala popupu.
3. Rozwinieto `Terrain` i udokumentowano liste narzedzi:
   - `[C] Corridor`;
   - `[C] Doorway`;
   - `[C] Doorway, Double`;
   - `[C] Floorside Middlelayer`;
   - `[C] Window`;
   - `[T] Floor Low`;
   - `[T] Floor Up, High Ceiling`;
   - `[T] Floor Up, MAIN`;
   - `[T] Floor Up, Underlayer`;
   - `[T] Wall`;
   - `Eraser`.
4. Context menu na `Terrain` i probowanych pozycjach terrain nie pokazalo
   popupu.
5. Celowany klik w toolbar palety przelaczyl prawa palete na `Placeables`.
6. Widoczne kategorie `Placeables`:
   - `Battlefield`;
   - `Building Adornments`;
   - `Containers & Switches`;
   - `Military`;
   - `Miscellaneous`;
   - `Miscellaneous Interior`;
   - `Parks & Nature`;
   - `Pennants & Signs`;
   - `Projectile Trap Origin`;
   - `Secret Object`;
   - `Trades & Academic & Farm`;
   - `Treasure`;
   - `Visual Effects`.
7. Context menu na kategorii `Battlefield` nie pokazalo popupu.
8. Proby rozwiniecia `Battlefield` przez `Right` i klik w glyph nie ujawnily
   template-listy w tym przebiegu.
9. Po kliknieciach palety status Toolsetu przeszedl w `Paint`; przywrocono
   `Select Objects` przez menu command `74`.

## Dowody

| Plik | Znaczenie |
| --- | --- |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-316-s34-before-palette-context-menu.png` | Stan przed probami context menu palety. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-317-s34-palette-context-menu-terrain-row.png` | Right-click na `Terrain`; brak popupu, row zaznaczony. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-319-s34-palette-terrain-expanded-attempt.png` | `Terrain` rozwiniete, lista narzedzi terrain widoczna. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-323-s34-after-palette-toolbar-category-click.png` | Paleta przelaczona na `Placeables`; widoczne kategorie blueprintow. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-325-s34-placeable-palette-context-battlefield.png` | Right-click na `Battlefield`; brak popupu. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-330-s34-after-click-battlefield-expand-glyph.png` | Proba expand glyph; kategorie nadal widoczne, status bar `Paint`/`Loading Tiles`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-333-s34-after-restore-select-objects.png` | Po przywroceniu `Select Objects`; koncowy status po prawej `Select`. |

## Wnioski operacyjne

- Przelaczenie prawej palety na `Placeables` jest live odtworzone.
- Terrain palette nie zachowuje sie jak blueprint context menu; prawy klik na
  row/folder nie pokazal popupu.
- Placeables folder/category row tez nie pokazal context menu w tym przebiegu.
- Proby na palecie moga przestawic Toolset w `Paint`; po takich probach trzeba
  przywrocic `Select Objects`.
- Context menu palety z pozycjami typu `Find Text`, `Edit Copy`,
  `Update Instances` pozostaje `gap` i wymaga innej sciezki, prawdopodobnie
  konkretnego template-liścia albo innej zakladki palety.

## Rollback / stan koncowy

- Nie wybrano zadnej pozycji z context menu, bo popup sie nie pojawil.
- Nie zapisano modulu.
- Przywrocono `Select Objects` przez `WM_COMMAND 74`.
- Toolset pozostal responsywny.

## Bezpieczenstwo

- Brak przejecia globalnego kursora.
- Brak globalnego `SendKeys`.
- Brak wyboru `Update Instances` albo innej mutujacej opcji.
- Brak zapisu modulu.
