# Aurora Toolset: Door Properties and Area Transition findings

Data: 2026-06-18

Ten dokument opisuje pierwszy live-open atom dla drzwi i zakladki
`Area Transition`. Celem bylo otwarcie istniejacych drzwi, rozpoznanie pol
przejscia i zamkniecie bez mutacji.

## Kontekst proby

- Modul: `the_last_city - codex.mod`.
- Area w drzewie: `Arkona, Kanaly - zapomniany odcinek`.
- Otwarty resref area: `hx_tygiel_under`.
- Wybrane drzwi: `hx_undertyg_gate`.
- Zakres: tylko otwarcie `Door Properties` i zakladki `Area Transition`.
- Mutacje: brak.
- Zapis modulu: brak.

## Sekwencja, ktora zadzialala

1. Otworzyc `hx_tygiel_under`.
2. W drzewie modulu rozwinac:
   `Areas > Arkona, Kanaly - zapomniany odcinek > Doors`.
3. Wybrac `hx_undertyg_gate`.
4. Prawy klik na `hx_undertyg_gate`.
5. Menu kontekstowe drzwi zawiera:
   - `Focus on Object`, ID `2`;
   - `Adjust Location`, ID `3`;
   - `Remove`, ID `12`;
   - `Add To Palette`, ID `15`;
   - `Variables`, ID `18`;
   - `Properties`, ID `19`.
6. Po otwarciu menu kontekstowego wyslac akcelerator `P` do popupu, co wybiera
   `Properties`.
7. W `Door Properties` przejsc na zakladke `Area Transition`.
8. Zrobic screenshot.
9. Zamknac dialog przez `Cancel`.

## Rozpoznane pola

### Basic

- `Name`: `Door`.
- `Tag`: `hx_undertyg_gate`.
- `Appearance Type`: `Use Generic Appearance`.
- `Generic Appearance`: `Strong Metal Door`.
- `Plot`: checkbox.
- Pola obronne: `Hardness`, `Hit Points`, `Fortitude Save`, `Reflex Save`,
  `Will Save`.

### Area Transition

- `Destination Tag`.
- `Destination Type`:
  - `None`;
  - `Door`;
  - `Waypoint`.
- `Loading Screen`, domyslnie `Default`.
- Przycisk wyboru `...` przy loading screen.
- Przycisk `Setup Area Transition`.

W obserwowanym stanie `hx_undertyg_gate` mial `Destination Type = None`.

## Dowody

Stan startowy heartbeatu z `hx_tygiel_under`:

`C:\Projects\aurora-web\.codex-tmp\toolset-heartbeat-20260618\hb-035-start-door-heartbeat-current-state.png`

Rozwiniete `Doors` z widocznymi instancjami:

`C:\Projects\aurora-web\.codex-tmp\toolset-heartbeat-20260618\hb-037-actual-doors-node-expanded.png`

`Door Properties` karta `Basic`:

`C:\Projects\aurora-web\.codex-tmp\toolset-heartbeat-20260618\hb-038-door-properties-basic.png`

`Door Properties` karta `Area Transition`:

`C:\Projects\aurora-web\.codex-tmp\toolset-heartbeat-20260618\hb-040-door-properties-area-transition-tab.png`

Stan po `Cancel`:

`C:\Projects\aurora-web\.codex-tmp\toolset-heartbeat-20260618\hb-041-after-door-properties-cancel.png`

## Pulapki

- Menu drzwi ma destrukcyjne `Remove`; przed wyborem pozycji trzeba odczytac
  menu i uzyc pewnej sciezki do `Properties`.
- Nie uzywac `Setup Area Transition` w pierwszym atomie. To prawdopodobnie
  mutuje albo prowadzi do kreatora polaczen.
- Bledna konfiguracja przejscia moze zepsuc nawigacje lokacji, wiec pierwszy
  etap to tylko obserwacja.
- Zamykac przez `Cancel`, dopoki celem nie jest jawna mutacja.
- Nie bylo globalnego ruchu kursora ani globalnego `SendKeys`.

## Refresh HB-S48: pelniejsze zakladki Door Properties

W pozniejszym heartbeatcie odtworzono ten atom ponownie na tej samej area
`hx_tygiel_under`, ale faktycznie otwartym obiektem byl
`hx_undertyg_gatemain`. Dodatkowo przejrzano zakladki `Basic`, `Scripts`,
`Lock`, `Description`, `Area Transition`, `Advanced`, `Comments` i `Trap`.

Szczegoly i screeny:
[Door Properties tabs refresh](aurora-toolset-door-properties-tabs-refresh-2026-06-18.md).

Najwazniejsze wnioski:

- `TPageControl` drzwi ma dwurzedowy uklad zakladek; stale koordynaty po
  zmianie aktywnej karty moga trafic w inny tab.
- `Trap` na `hx_undertyg_gatemain` jest wlaczony: `Gas Trap, Deadly`,
  `Detection DC 20`, `Disarm DC 28`, `Detectable` checked.
- `Advanced` pokazuje `Blueprint ResRef x3_door_met004`,
  `Belongs To Faction Hostile`, `Initial State Closed`.
- Nadal nie klikano `Setup Area Transition`; ten atom pozostaje osobnym gapem.

## Status

- `Door Properties`: `opened-live`.
- `Area Transition`: `opened-live`.
- Mutacje: brak.
- Zapis modulu: brak.
