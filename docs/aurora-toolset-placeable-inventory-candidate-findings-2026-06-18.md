# Aurora Toolset: Placeable Inventory candidate findings

Data proby: 2026-06-18

Status: `gap` dla live otwarcia placeable inventory

## Kontekst

- Modul: `the_last_city -- codex.mod` / wariant pliku z em-dash w nazwie.
- Cel: znalezc bezpieczna sciezke do `Inventory...` / contents editor dla
  placeable.
- Mutacja modulu: nie.
- Zapis modulu: nie.

Ten przebieg byl przygotowaniem do atomu placeable inventory. Nie otwarto
jeszcze live edytora inventory dla placeable, wiec status `S03` nie awansuje.

## Wynik read-only z parsera

Read-only zapytanie przez istniejace moduly backendowe odczytalo plik:

`C:\Users\enonw\Documents\Neverwinter Nights\modules\the_last_city - codex.mod`

Wynik:

- znaleziono `116` placeables z `hasInventory=true`;
- wsrod aktualnie otwartych area tabow (`_ikea`, `enon_bakery`,
  `hx_tygiel_under`, `d_und`) kandydat byl jeden;
- area: `_ikea`;
- index: `213`;
- `templateResRef`: `zep_safe002`;
- tag: `ZEP_SAFE001`;
- pozycja: `x=158.1147`, `y=151.2584`, `z=5`;
- template name: `Sejf`;
- template file: `zep_safe002.utp`.

To jest dobry kandydat do kolejnego live eksperymentu, ale sam odczyt parsera
nie jest dowodem otwarcia inventory w Toolsecie.

## Dowody

| Plik | Znaczenie |
| --- | --- |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-140-s15-find-instance-revealed-attempt.png` | Proba podniesienia ukrytego `TdlgFindInstance`; okno bylo puste/niezainicjalizowane. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-141-s15-find-instance-hidden-after-blank.png` | Dialog `Find Instance` schowany po nieudanej probie. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-182-s17-placeable-inventory-readability-gate.png` | Bramka czytelnosci: `_ikea` jeszcze nieaktywna, Toolset widoczny na drugim ekranie. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-183-s17-after-ikea-tab-click.png` | `_ikea` aktywna po celowanym kliknieciu w `TPageControl` area. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-188-s17-left-tree-ikea-top-before-placeables-expand.png` | Widoczny wezel `_ikea -> Placeables` w lewym `TTreeView`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-189-s17-left-tree-placeables-expanded-attempt.png` | `Placeables` rozwiniete; wpisy instancji sa widoczne jako puste/bez nazw. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-192-s17-tree-command19-selected-placeable-attempt.png` | `WM_COMMAND 19` do lewego `TTreeView` otworzyl properties dla pobliskiego placeable `witcher_pheasant`, nie celu. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-200-s17-clean-index-213-properties-attempt.png` | Czysta proba offsetu otworzyla `witcher2_sejf`, czyli pobliski sejf z indeksu `211`, nie `ZEP_SAFE001`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-204-s17-clean-214-properties-attempt.png` | Korekta offsetu nie otworzyla properties; drzewo/focus pozostaly kruche. |

## Co nie zadzialalo

- Istniejacy/ukryty top-level `TdlgFindInstance` dalo sie przesunac i pokazac
  na drugim ekranie, ale jego zawartosc byla pusta albo niezainicjalizowana.
- Ten dialog nie jest obecnie wiarygodna sciezka do znalezienia instancji
  `ZEP_SAFE001`.
- W HB-S18/HB-S19 `Find Instance` dalo sie otworzyc poprawnie z menu `Edit`,
  ale wpisanie `With Tag = ZEP_SAFE001` bez globalnego inputu nadal nie jest
  potwierdzone. Techniczny readback `GetWindowText` pokazywal wartosc, lecz UI
  rysowal puste pole, a `Search` nie zwrocil celu. Szczegoly:
  [Find Instance findings](aurora-toolset-find-instance-findings-2026-06-18.md).
- Proste zejscie po drzewie po indeksie nie jest jeszcze stabilna sciezka.
  `214 Down` z pierwszego stanu trafilo w pobliski `witcher_pheasant`
  (parser index `215`), a czysta procedura `212 Down` trafila w
  `witcher2_sejf` (parser index `211`). Korekta o kolejne `Down` po zamknieciu
  dialogu nie otwierala juz properties, prawdopodobnie przez utrate focusu albo
  niestabilny stan selekcji `TTreeView`.
- Menu kontekstowe na zaznaczonym pustym wpisie drzewa nie pojawilo sie w tej
  probie, wiec popup-`p` nie dalo sie wykorzystac dla tego konkretnego stanu.
- Nie nalezy promowac placeable inventory do `opened-live` na podstawie tego
  przebiegu.

## Live wniosek z HB-S17

Live potwierdzono, ze da sie:

1. aktywowac `_ikea` przez celowany klik w glowny `TPageControl` area;
2. rozwinac `_ikea -> Placeables` bez czytania remote-memory TreeView;
3. otworzyc `Placeable Object Properties` dla wpisu z drzewa przez
   `WM_COMMAND 19` wyslany do lewego `TTreeView`;
4. skorelowac pobliskie wpisy z parserem:
   - index `211`: `witcher2_sejf` / `witcher215`;
   - index `213`: `ZEP_SAFE001` / `zep_safe002`;
   - index `215`: `witcher_pheasant` / `witcher746`.

Nie potwierdzono jeszcze live otwarcia properties dla `ZEP_SAFE001`. Najblizszy
udany dialog byl `witcher2_sejf`, z tagiem widocznym w UI i wyszarzonym
`Has Inventory`.

## Nastepny eksperyment

1. Otworzyc `_ikea`.
2. Znalezc instancje `ZEP_SAFE001` / `zep_safe002` w drzewie albo przez
   poprawnie wywolany Find Instance.
3. Otworzyc `Placeable Object Properties` dla tego konkretnego placeable.
4. Zrobic screenshot zakladki `Basic` z widocznym `Has Inventory` albo
   przyciskiem `Inventory...`.
5. Kliknac `Inventory...` i zamknac edytor przez `Cancel`.
6. Nie dodawac itemow i nie zatwierdzac `OK` w pierwszym przebiegu.

Proponowana korekta nastepnej proby:

1. Najpierw wymusic/utrzymac focus lewego `TTreeView` po kazdym zamknieciu
   properties.
2. Po dojściu do pobliskiego `witcher2_sejf` nie zamykac i nie probowac
   korygowac offsetu na slepo; zamiast tego znalezc stabilny sposob wyboru
   sasiedniego wpisu, np. przez prawidlowe `Find Instance`, aktywny popup menu
   albo inne polecenie Toolsetu.
3. Rozwazyc osobna probe z canvasem dopiero po jawnym potwierdzeniu trybu
   `Select Objects`, bo prawa paleta Terrain moze zostawic aktywny zielony
   outline i klik w canvas moze byc ryzykowny.

## Pulapki

- Wlaczenie `Has Inventory` na obiekcie bez inventory jest mutacja i powinno byc
  osobnym atomem.
- `Find Instance` jako samo HWND nie wystarcza; screenshot musi pokazac
  czytelna, zainicjalizowana zawartosc.
- Parserowy kandydat jest wskazowka, nie dowodem live UI.
- Placeable inventory pozostaje rozdzielone od creature inventory. Creature
  inventory udalo sie otworzyc live w osobnym dokumencie, ale to nie dowodzi
  sciezki dla placeable.
- Nie zakladac, ze `index` parsera mapuje sie bezposrednio na liczbe
  `VK_DOWN` od wezla `Placeables`; stan rozwiniecia, scroll i focus zmieniaja
  wynik.
- `WM_COMMAND 19` do `TTreeView` jest obiecujace, ale w tej probie dzialalo
  tylko po czystym wyborze z drzewa. Po zamknieciu properties samo przesuniecie
  klawiszami nie dawalo juz powtarzalnego otwarcia dialogu.
- W obecnym stanie nie klikac w canvas, dopoki nie ma pewnosci, ze aktywny jest
  `Select Objects`, a nie tryb/podglad Terrain.

## Bezpieczenstwo

- Nie przejeto globalnego kursora.
- Nie uzyto globalnego `SendKeys`.
- Nie klikano w canvas.
- Nie zmieniono `Has Inventory`.
- Modul nie zostal zapisany.
