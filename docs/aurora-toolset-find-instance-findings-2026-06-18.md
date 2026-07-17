# Aurora Toolset: Find Instance findings

Data: 2026-06-18

Ten dokument opisuje live probe atomu `Find Instance`. Wynik jest celowo
ostrozny: dialog da sie otworzyc i udokumentowac, ale wyszukiwanie po tagu nie
jest jeszcze bezpiecznie odtworzone.

## Kontekst proby

- Toolset: `BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17`.
- Modul: `the_last_city - codex.mod` / `the_last_city — codex.mod`.
- Obszar roboczy przed restartem: `_ikea`.
- Cel: znalezc placeable `ZEP_SAFE001` / `zep_safe002`, zeby dojsc do
  placeable inventory bez chodzenia po kruchych offsetach drzewa.
- Zasada: bez globalnego kursora i bez globalnego `SendKeys`.

## Co zadzialalo

1. Otworzyc menu `Edit` przez celowane komunikaty do glownej ramki Toolsetu:
   `WM_SYSKEYDOWN VK_MENU` i `WM_SYSCHAR e`.
2. Na popup menu `#32768` wyslac `WM_CHAR f`.
3. Otworzyl sie dialog `Find Instance`.
4. Dialog mozna przesunac na drugi ekran przez `SetWindowPos`.
5. Rozpoznane glowne kontrolki:
   - `TCheckListBox`: typy `Creatures`, `Doors`, `Encounters`, `Items`,
     `Placeables`, `Sounds`, `Stores`, `Triggers`, `Waypoints`;
   - `TComboBox`: `In Area`;
   - `TEdit`: `From Blueprint`;
   - `TEdit`: `With Tag`;
   - `TListView`: wyniki;
   - przyciski `Clear`, `Search`, `Done`.

Status tej czesci: `opened-live`.

## Co nie zadzialalo

- Samo `SetWindowText` na polu `With Tag` ustawilo techniczny text readback
  `ZEP_SAFE001`, ale pole wizualnie pozostalo puste i `Search` nie pokazal
  prawidlowego wyniku.
- Celowane `WM_CHAR`/keypost do `TEdit` rowniez nie dalo czytelnego, uzywalnego
  wpisu w UI.
- `UIAutomationClient` / `ValuePattern` na samym `TEdit` zawiesilo wywolanie.
- Proba laczenia keypost/selection/edit messages doprowadzila do ghost windows
  (`Ghost` dla `Find Instance` i glownego Toolsetu). Wymagany byl restart
  Toolsetu.
- Po restarcie pojawil sie backup prompt i zostal obsluzony przez `Tak`.

Status wyszukiwania po tagu: `gap`.

## Dowody

| Plik | Znaczenie |
| --- | --- |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-207-s18-alt-e-menu-attempt.png` | Menu `Edit` otwarte przez celowane `Alt+E`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-209-s18-find-instance-accelerator-f.png` | `WM_CHAR f` do popupu otworzyl `Find Instance`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-210-s18-find-instance-moved-fullscreen.png` | Dialog przeniesiony na drugi ekran. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-211-s18-find-instance-window-crop.png` | Crop calego okna `Find Instance`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-212-s18-find-instance-search-controls-crop.png` | Pola `In Area`, `From Blueprint`, `With Tag`, `Clear`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-213-s18-find-instance-results-buttons-crop.png` | Lista wynikow i przyciski `Search`/`Done`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-219-s19-find-instance-search-after-internal-tag.png` | Po `Search`: pole nadal wizualnie puste, brak wiarygodnego wyniku `ZEP_SAFE001`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-220-s19-find-instance-after-keypost-timeout-state.png` | Stan po nieudanym keypost: input nadal pusty. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-222-s19-find-instance-after-wmclose.png` | Ghost window po zawieszeniu; restart byl konieczny. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-223-s19-after-restart-second.png` | Backup prompt po wymuszonym restarcie. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-224-s19-after-backup-yes-second.png` | Stan po `Tak`: modul odzyskany, bez ponownego `File > Open`. |

## Bezpieczna sekwencja tylko do otwarcia

1. Potwierdzic screenshotem, ze Toolset dziala i jest na drugim ekranie.
2. Otworzyc `Edit` celowanym `Alt+E` do glownej ramki.
3. Wyslac `WM_CHAR f` do aktywnego popupu `#32768`.
4. Przesunac `Find Instance` na drugi ekran, jesli otworzy sie na granicy
   monitorow.
5. Zrobic screenshot calego dialogu i osobne screeny pol/wynikow.
6. Zamknac przez `Done`, jesli nie wykonywano dalszego testu.

## Zakazane / ryzykowne na teraz

- Nie liczyc `GetWindowText` z `TEdit` jako dowodu wpisania filtra.
- Nie uzywac `UIAutomationClient` / `ValuePattern` na polach VCL Toolsetu w tym
  dialogu.
- Nie uzywac blokujacego `SendMessage` do `TListView` wynikow; poprzednia proba
  potrafila zawiesic wywolanie.
- Nie promowac placeable inventory na podstawie `Find Instance`, dopoki nie ma
  widocznego, poprawnego wyniku w liscie.

## Nastepny eksperyment

1. Otworzyc `Find Instance` ta sama bezpieczna sciezka.
2. Szukac alternatywnej, nieblokujacej metody inputu tylko dla dialogu, np.
   przez normalny focus kontrolki po aktywowaniu okna albo inny wbudowany
   filtr Toolsetu.
3. Za sukces uznac dopiero screenshot z widocznym tagiem w polu i/lub lista
   wynikow zawierajaca `ZEP_SAFE001`.
4. Jezeli pojawi sie ghost window albo brak odpowiedzi Toolsetu, przerwac atom,
   zrestartowac Toolset i wybrac `Tak` przy backup recovery.
