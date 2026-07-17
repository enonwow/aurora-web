# Aurora Toolset: Adjust Location findings

Data: 2026-06-18

Ten dokument opisuje heartbeatowa probe atomu `Adjust Location` dla
zaznaczonego placeable w module `the_last_city - codex.mod`.

## Kontekst proby

- Modul: `the_last_city - codex.mod`.
- Area: `_ikea`.
- Zaznaczony obiekt potwierdzony przez `Placeable Object Properties`:
  - `Name`: `Vendor Stall - light`,
  - `Tag`: `ZEP_CE_VST_002`,
  - `Appearance Type`: `Structure: Market Stall 03`,
  - `Static`: wlaczone.

## Co zadzialalo

1. `Object Properties` dla zaznaczonego placeable otworzylo sie przez komendy
   Toolsetu.
2. Context menu obiektu dalo sie otworzyc celowanymi komunikatami do canvasu
   `TScrollBox`.
3. Menu zostalo odczytane przez Win32 `MN_GETHMENU`.
4. Pozycja `Adjust Location` zostala potwierdzona:

| Pozycja | ID | Tekst |
| ---: | ---: | --- |
| 0 | 191 | `Add To Palette` |
| 1 | 192 | `Adjust Location` |
| 2 | 195 | `Add Popup Text` |
| 3 | 197 | `Conversation` |
| 4 | 201 | `Setup Store` |
| 5 | `-1` | `Initial State` |
| 6 | 221 | `Delete` |
| 7 | 223 | `Variables` |
| 8 | 224 | `Properties` |

## Co nie zadzialalo

- `WM_COMMAND 192` wyslane do glownego `TfrmFrame` nie otworzylo dialogu.
- Celowany klik w drugi wiersz popup menu zamknal menu, ale nie ujawnil
  widocznego dialogu lokalizacji.
- W tej sesji atom pozostaje `gap`, bo nie mamy jeszcze niezawodnej sciezki do
  dialogu pozycji.

## Dowody

Properties zaznaczonego placeable:

`C:\Projects\aurora-web\.codex-tmp\toolset-heartbeat-20260618\hb-002-placeable-properties-after-command70.png`

Context menu z widocznym `Adjust Location`:

`C:\Projects\aurora-web\.codex-tmp\toolset-heartbeat-20260618\hb-003-context-menu-adjust-location.png`

## Wazne obserwacje

- `SendMessage` dla komend otwierajacych modalny dialog moze zawiesic proces
  wywolujacy do czasu zamkniecia dialogu. Dla dalszych prob preferowac
  `PostMessage`.
- Context menu Toolsetu moze pojawic sie na aktywnym ekranie w okolicy
  systemowego kursora, nawet gdy nie przesuwamy kursora. Nie nalezy tego
  traktowac jako przejecia kursora, ale trzeba uwazac przy dowodach
  screenshotowych.
- Nie bylo globalnego ruchu kursora ani globalnego `SendKeys`.
- Modul nie zostal zapisany w ramach tej proby.

## Nastepne hipotezy

1. Sprawdzic, czy `Adjust Location` jest dostepne tylko w innym selection mode
   albo dla niestatycznych placeables.
2. Sprawdzic, czy komenda musi trafic do innego owner window niz `TfrmFrame`
   albo do aktywnego popup ownera.
3. Sprawdzic, czy istnieje alternatywna sciezka menu/toolbar do dokladnej
   pozycji obiektu.
