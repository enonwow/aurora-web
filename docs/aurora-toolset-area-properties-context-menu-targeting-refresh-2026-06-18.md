# Aurora Toolset: Area Properties context menu targeting refresh

Data: 2026-06-18  
Modul: `the_last_city - codex.mod`  
Area docelowa: `enon_bakery`  
Status: `partial-live`; popup `Properties` otwarty live, ale aktywacja pozycji
bez globalnej myszy pozostaje `gap`.

## Cel

Odswiezyc atom `Area Properties` dla `enon_bakery` w aktualnym stanie Toolsetu,
bez przejmowania globalnego kursora i bez globalnego `SendKeys`.

Wczesniejszy snapshot safe-cancel nadal jest wazny jako dowod, ze `Area
Properties` i `Environment Options` byly otwarte i udokumentowane. Ten dokument
opisuje nowszy wariant sterowania tylko przez celowane komunikaty HWND.

## Stan startowy

- Toolset dzialal na drugim ekranie.
- Otwarta byla karta `enon_bakery*`; obok nadal byla karta `enon_test_build`.
- Lewy tree `TTreeView` mial uchwyt `329966`.
- Glowna ramka Toolsetu miala uchwyt `458816`.
- Brak uzycia globalnego kursora.

## Przebieg live

1. Zastany popup area context menu nadal byl otwarty na `enon_bakery`.
2. `MN_GETHMENU` dla popupu `#32768` potwierdzil pozycje:
   `View Area`, `Create Copy`, `Remove`, `Export Area`, `Properties`.
3. `Properties` mialo ID menu `19`.
4. Klik przez `SendMessage WM_LBUTTONDOWN/UP` w popup nie otworzyl dialogu.
5. `WM_COMMAND 19` do `TfrmFrame` tez nie otworzyl dialogu.
6. `WM_CHAR p` wyslany do popupu zamknal menu i doprowadzil do blednej selekcji
   `enon_butcher`; po chwili otworzyl sie `Area Properties` dla zlego obszaru.
7. Dialog `Area Properties` dla `enon_butcher` zamknieto przez `Cancel`.
8. Poprawna selekcje `enon_bakery` uzyskano dopiero przez bezposredni klik w
   lewy `TTreeView` `329966`, klient `69,122`.
9. Popup context menu na `enon_bakery` otworzyl sie stabilnie po
   `PostMessage WM_RBUTTONDOWN/UP` do tego samego `TTreeView`.
10. Proby aktywacji `Properties` z popupu przez:
    `PostMessage WM_LBUTTONDOWN/UP`, `VK_END + VK_RETURN` oraz `WM_COMMAND 19`
    do `Tree`, `Frame` i `Application` nie otworzyly dialogu.

## Dowody

| Plik | Znaczenie |
| --- | --- |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-468-s46-current-state-before-area-properties.png` | Zastany popup context menu na `enon_bakery`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-469-s46-after-click-area-properties-menu-item.png` | Klik `SendMessage` w popup; dialog sie nie otworzyl. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-471-s46-after-popup-char-p-properties.png` | `WM_CHAR p` zamknal popup i zostawil blednie zaznaczone `enon_butcher`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-472-s46-after-post-click-properties-menu-row.png` | `Area Properties` otwarte dla zlego `enon_butcher`; wazna pulapka. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-473-s46-after-cancel-wrong-area-properties.png` | Powrot po `Cancel`; brak zatwierdzenia zlego dialogu. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-474-s46-after-direct-tree-select-enon-bakery.png` | Pewna selekcja `enon_bakery` przez `TTreeView` `329966`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-475-s46-context-menu-enon-bakery-direct-tree.png` | Popup `enon_bakery` otwarty stabilnie z wlasciwego tree. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-476-s46-after-popup-post-click-properties-enon-bakery.png` | `PostMessage` klik w `Properties`; brak dialogu. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-477-s46-after-popup-end-enter-properties.png` | `VK_END + VK_RETURN`; brak dialogu. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-478-s46-after-wm-command-id19-selected-enon-bakery.png` | `WM_COMMAND 19` do kilku uchwytow; brak dialogu. |

## Wnioski operacyjne

- Dla celowanej automatyzacji nie wolno polegac na `WindowFromPoint` w lewym
  drzewie, bo moze zwrocic ramke `TfrmFrame`, nie wlasciwy `TTreeView`.
- Pewna selekcja `enon_bakery` w tym stanie to komunikaty bezposrednio do
  `TTreeView` `329966`, klient okolo `69,122`.
- Sam popup area context menu jest `opened-live` i jego ID mozna odczytac przez
  `MN_GETHMENU`.
- Aktywacja pozycji `Properties` bez globalnego kursora jest nadal gapem w tej
  sesji. Nie promowac tego wariantu do `safe-repeatable`.
- `WM_CHAR p` jest ryzykowne: moze zamknac popup i dzialac na aktualnie
  zaznaczonym wezle, co w tej probie otworzylo properties dla `enon_butcher`.

## Rollback / cancel

- Blednie otwarte `Area Properties` dla `enon_butcher` zamknieto przez
  `Cancel`.
- Nie klikano `OK` ani `Apply`.
- Modulu nie zapisano.

## Bezpieczenstwo

- Brak przejecia globalnego kursora.
- Brak globalnego `SendKeys`.
- Brak zapisu modulu.
- Po tescie `Use Area Lighting` stan widoku przywrocono do czytelnego.
