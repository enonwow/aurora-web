# Aurora Toolset: terrain groups preview on `enon_test_build`

Data proby: 2026-06-18

Status: `opened-live` / `partial-live` dla group preview; paint grupy
nierozstrzygniety wizualnie, bez awansu do `mutated-live`.

## Kontekst

- Modul: `the_last_city - codex.mod`.
- Area startowa: `enon_bakery`, po czym otwarto area testowa
  `enon_test_build`.
- Cel: sprawdzic, czy group paint mozna przejsc dalej niz sam wybor palety,
  najlepiej na pustszym/testowym obszarze.
- Wejscie operatorskie: tylko celowane komunikaty do HWND/kontrolek Toolsetu,
  bez globalnego kursora i bez globalnego `SendKeys`.

## Otwarcie testowego area

1. W lewym drzewie area widoczny byl zestaw testowy:
   `enon_test_ads`, `enon_test_ah`, `enon_test_arena`,
   `enon_test_bestiary`, `enon_test_build`.
2. Celowany klik w drzewie trafil w okolice testowych area; dwuklik otworzyl
   `enon_test_build` jako nowy tab/canvas.
3. Enumeracja okien potwierdzila:
   - `TfrmViewerArea - enon_test_build`;
   - `TTabSheet enon_test_build`;
   - aktywny canvas `TScrollBox` `40242048`.

## Paleta groups

Po przelaczeniu na palette terrain/group dla `enon_test_build` okazalo sie,
ze lista `Groups` jest tileset-dependent. Zamiast znanego z `enon_bakery`
`Theater (5x5)` widoczne byly m.in.:

- `[Jungle] Camp 1 (2x2)`;
- `[Jungle] Camp 2 (1x2)`;
- `[Jungle] Exit 1 (2x3)`;
- `[Jungle] Exit 2 (2x2)`;
- `[Jungle] Graveyard (1x2)`;
- `[Jungle] Grove 1 (3x3)`;
- `[Jungle] Lodge (2x2)`;
- `[Jungle] Ruin 1 (2x2)`;
- `[Jungle] Temple - Jungle (3x2)`;
- `[Swamp] House - Over Water (2x1)`;
- `[Swamp] Statue - Ilmater (2x2)`;
- `[Swamp] Tower - Black (3x3)`.

## Preview i proby paint

1. Wybrano `[Jungle] Camp 1 (2x2)`.
2. Kilka pozycji preview na `enon_test_build` mialo czerwony outline, np.
   client `250,250`, `360,330`, `520,310`, `690,340`, `300,520`,
   `520,560`; nie klikano ich jako mutacji.
3. Wybrano mniejszy `[Jungle] Camp 2 (1x2)`.
4. Po reselect itemu widoczny byl zielony preview z polprzezroczysta grupa.
   Sygnał utrzymywal sie po sekundzie (`green=269`, `red=646` w prostym
   liczniku kolorow), wiec to nie byl tylko jednorazowy flicker.
5. Pierwszy klik helperem, ktory przed `WM_LBUTTONDOWN/UP` robil tez
   `WM_MOUSEMOVE`, nie dal jednoznacznego dowodu paint: zniknela tresc preview,
   zostal zielony outline.
6. Druga proba po reselect wykonala tylko `WM_LBUTTONDOWN/UP` bez poprzedzajacego
   `WM_MOUSEMOVE`. Wynik byl podobny: brak jednoznacznie nowej widocznej
   geometrii lub dekoracji grupy.
7. W obu probach wykonano toolbar `Undo`, a finalnie przywrocono
   `Placeables` + `Select`.

## Dowody

| Plik | Znaczenie |
| --- | --- |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-425-s43-start-before-group-paint-test-area.png` | Start przed proba na testowym area. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-427-s43-after-doubleclick-enon-test-bestiary.png` | Dwuklik w testowe area otworzyl `enon_test_build`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-433-s43-after-key-down-select-theater-enon-test-build.png` | `Groups` dla `enon_test_build`; lista jungle/swamp, pierwszy prefab wybrany. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-435-s44-group-probe-client-360-330.png` | `[Jungle] Camp 1 (2x2)` z czerwonym preview. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-440-s44-after-select-jungle-camp-2-1x2.png` | `[Jungle] Camp 2 (1x2)` z zielonym preview. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-447-s44-camp2-reselect-after-1s.png` | Zielony preview utrzymany po sekundzie od reselect. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-448-s44-after-click-paint-jungle-camp2-group.png` | Po pierwszym kliknieciu: brak jednoznacznej nowej grupy, zostaje zielony outline. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-449-s44-after-toolbar-undo-jungle-camp2-group.png` | Po `Undo` pierwszej proby. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-451-s44-before-click-no-move-camp2-green-preview.png` | Druga proba: przed kliknieciem, zielony preview. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-452-s44-after-click-no-move-camp2-group.png` | Druga proba po `WM_LBUTTONDOWN/UP` bez `WM_MOUSEMOVE`; nadal brak jednoznacznego paint. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-453-s44-after-undo-click-no-move-camp2-group.png` | Po `Undo` drugiej proby. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-454-s44-after-final-restore-placeables-enon-test-build.png` | Finalny restore: `Placeables`, `Select`, czytelny canvas. |

## Wnioski operacyjne

- `Groups` jest zalezne od tilesetu/area. Nie zakladac, ze `Theater (5x5)`
  bedzie dostepne poza `enon_bakery`.
- `enon_test_build` nadaje sie do dalszych testow terrain/group, bo ma duzo
  otwartej przestrzeni i rzeczywisty render area.
- Czerwony preview grupy nadal oznacza stop: nie klikac i szukac innej pozycji
  albo innego prefabu.
- Zielony preview `[Jungle] Camp 2 (1x2)` zostal otwarty live, ale proby
  klikniecia nie pokazaly jednoznacznej nowej grupy po paint. Nie promowac
  group paint do `mutated-live`, dopoki nie bedzie wyraznego przed/po albo
  reopen/save evidence.
- Warto osobno ustalic, czy dla grup klik musi trafic w origin/top-left, czy
  potrzebny jest inny tryb/inna akcja niz zwykle `WM_LBUTTONDOWN/UP`.

## HB-S45: origin/top-left click

Cel: sprawdzic hipoteze, ze group paint wymaga klikniecia w origin/top-left
zielonego preview, a nie w jego srodek.

Sekwencja:

1. Start: `enon_test_build`, finalny stan po poprzednim restore:
   `Placeables` + `Select`.
2. Ponownie wybrano `[Jungle] Camp 2 (1x2)` w `Terrain -> Groups`.
3. Po sekundzie zapisano zielony preview:
   `hb-456-s45-camp2-green-preview-before-origin-detection.png`.
4. Wykryto zielona ramke preview w zrzucie: obrazowo ok.
   `x=738..1160`, `y=510..721`. Po przeliczeniu na aktywny canvas
   `TScrollBox 40242048` daje to ok. `client 434..856`, `403..614`.
5. Kliknieto blisko origin/top-left preview: `client 444,413`, bez globalnego
   kursora i bez poprzedzajacego `WM_MOUSEMOVE`.
6. Screenshot po kliknieciu:
   `hb-457-s45-after-click-origin-top-left-camp2-group.png`.
7. Wykonano toolbar `Undo`, potem `Select Objects` i restore do
   `Placeables`.

Dowody S45:

| Plik | Znaczenie |
| --- | --- |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-455-s45-start-before-group-origin-tests.png` | Start S45 na `enon_test_build`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-456-s45-camp2-green-preview-before-origin-detection.png` | Stabilny zielony preview przed testem origin. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-457-s45-after-click-origin-top-left-camp2-group.png` | Po kliknieciu `client 444,413`: brak jednoznacznej nowej grupy; zostal zielony outline bez tresci preview. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-458-s45-after-undo-origin-top-left-camp2-group.png` | Po `Undo`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-459-s45-after-restore-origin-top-left-test.png` | Finalny restore: `Placeables`, `Select`. |

Porownanie pikseli:

- `hb-456` vs `hb-457`: `4.494%` zmienionych probek, srednia delta `4.071`.
- `hb-457` vs `hb-458`: `0.505%` zmienionych probek, srednia delta `0.979`.
- `hb-456` vs `hb-459`: `4.373%` zmienionych probek, srednia delta `3.92`.

Wniosek S45:

- Klik origin/top-left nie rozwiazal group paint. Efekt nadal wyglada jak
  zgaszenie tresci preview i pozostawienie zielonego outline, bez twardego
  dowodu nowo namalowanej grupy.
- Group paint pozostaje `gap`/nierozstrzygniety.
- Nastepne bezpieczne tropy: sprawdzic czy potrzebny jest inny punkt anchor,
  dwuklik, Enter/akcelerator po zielonym preview, albo inny prefab z bardziej
  widocznym before/after.

## Bezpieczenstwo

- Nie zapisano modulu.
- Nie uzyto globalnego kursora.
- Nie uzyto globalnego `SendKeys`.
- Po probach wykonano `Undo` i przywrocono `Placeables` + `Select`.
