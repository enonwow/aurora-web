# Aurora Toolset: Module event script binding findings

Data: 2026-06-18

Ten dokument opisuje live atom `Module Properties -> Events -> Edit` dla
globalnego skryptu modulu `the_last_city - codex.mod`. Zakres: otwarcie
istniejacego skryptu w `Script Editor`, dokumentacja paneli i zamkniecie bez
edycji, kompilacji, zapisu skryptu ani zapisu modulu.

## Kontekst proby

- Toolset: `BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17`.
- Modul: `the_last_city - codex.mod` / wariant pliku z em-dash.
- Stan startowy: Toolset widoczny na drugim ekranie, drzewo `Areas`
  rozwiniete, zaznaczone `enon_bakery`.
- Uwaga: tytul Toolsetu mial `*` juz przed tym atomem po wczesniejszym `OK` w
  `Area Properties`. W tym atomie nie wykonano nowej mutacji i nie zapisano
  modulu.

## Sekwencja, ktora zadzialala

1. Otworzyc `Module Properties` przez menu `Edit -> Module Properties`.
2. Przejsc na karte `Events`.
3. Na pierwszym wierszu `OnAcquireItem` widoczny byl skrypt
   `_main_on_acqu`.
4. Pierwsza proba zwyklego klikniecia celowanymi komunikatami myszy w przycisk
   `Edit` nie dala widocznego efektu.
5. Skuteczna metoda w tej sesji: `BM_CLICK` do konkretnego przycisku `Edit`
   przy wierszu `OnAcquireItem`.
6. Otworzyl sie top-level `Script Editor` (`TdlgScriptEditor`) na drugim
   ekranie, z karta skryptu `_main_on_acqu`.
7. Udokumentowano prawy panel referencji i dolny panel wynikow.
8. Zamknieto `Script Editor` przez `Exit`.
9. Zamknieto pozostale `Module Properties` przez `Cancel`.

## Rozpoznane elementy Script Editora

- Karta edycji skryptu: `_main_on_acqu`.
- Lewy panel kodu z numerami linii i edytorem `TSEdit`.
- Prawy panel referencji:
  - `Filter`;
  - `Functions`;
  - `Variables`;
  - `Constants`;
  - `Templates`.
- Dolny panel:
  - `Compiler`;
  - `Help`;
  - `Bookmarks`;
  - `Search Results`.
- Dolny prawy przycisk `Exit`.

## Obserwacja skryptu

Edytor otworzyl istniejacy skrypt `_main_on_acqu`. Widoczna zawartosc jest
minimalnym handlerem `void main()` z odczytem:

```c
object oPC = GetModuleItemAcquiredBy();
object oItem = GetModuleItemAcquired();
```

To jest tylko obserwacja zawartosci, nie mutacja.

## Dowody

| Plik | Znaczenie |
| --- | --- |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-246-s22-module-events-tab-before-edit.png` | `Module Properties -> Events`, przed kliknieciem `Edit`, widoczny `_main_on_acqu`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-247-s22-module-event-edit-click-result.png` | Pierwsza proba klikniecia `Edit`; brak jeszcze widocznego Script Editora. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-248-s22-after-bmclick-edit-second.png` | `Script Editor` otwarty po `BM_CLICK`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-249-s22-script-editor-right-functions.png` | Prawy panel `Functions`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-250-s22-script-editor-right-variables.png` | Prawy panel `Variables`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-251-s22-script-editor-right-constants.png` | Prawy panel `Constants`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-252-s22-script-editor-right-templates.png` | Prawy panel `Templates`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-253-s22-script-editor-bottom-compiler.png` | Dolny panel `Compiler`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-254-s22-script-editor-bottom-help.png` | Dolny panel `Help`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-255-s22-script-editor-bottom-bookmarks.png` | Dolny panel `Bookmarks`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-256-s22-script-editor-bottom-search-results.png` | Dolny panel `Search Results`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-257-s22-after-script-editor-exit.png` | Po `Exit` z Script Editora; widoczne `Module Properties`. |
| `../.codex-tmp/toolset-heartbeat-20260618/hb-258-s22-after-module-properties-cancel.png` | Po `Cancel` w `Module Properties`; powrot do glownego okna Toolsetu. |

## Pulapki

- `Events` to globalne hooki modulu. Zmiana comboboxa, `...`, `Edit` z pustym
  slotem, compile/save albo `OK` moga tworzyc lub przepinac zasoby.
- Nie uzywac ikon zapisu/kompilacji w Script Editorze w atomie obserwacyjnym.
- Nie pisac do edytora kodu, jesli celem jest tylko rozpoznanie UI.
- Zwykle celowane klikniecie w przycisk `Edit` nie bylo w tej sesji
  niezawodne; `BM_CLICK` do konkretnego `TButton` otworzyl edytor.
- Po otwarciu Script Editora `Module Properties` nadal istnieje w top-level
  oknach, wiec po `Exit` z edytora zamykac je przez `Cancel`, nie `OK`.
- Jezeli Toolset przestanie odpowiadac po `Edit`, zrobic screenshot,
  zrestartowac Toolset i przy backup recovery wybrac `Tak`/`Yes`.

## Status

- `Module event script binding`: `opened-live`.
- Mutacje: brak.
- Kompilacja/zapis skryptu: brak.
- Zapis modulu: brak.
- Nastepny eksperyment: `...` przy slocie eventu zostalo rozpoznane osobno w
  [aurora-toolset-module-event-resource-picker-findings-2026-06-18.md](aurora-toolset-module-event-resource-picker-findings-2026-06-18.md).
  Kolejny kandydat to `Cached Scripts`, tylko obserwacyjnie i bez przepinania
  globalnych hookow.
