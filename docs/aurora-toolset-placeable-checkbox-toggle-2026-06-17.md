# Aurora Toolset: toggling placeable Basic flags

Data: 2026-06-17

Ten dokument opisuje odtworzona operacje zaznaczenia i odznaczenia opcji
`Plot`, `Useable` i `Static` w `Placeable Object Properties`.

## Kontekst proby

- Modul: `the_last_city — codex.mod`.
- Area: `_ikea`.
- Dialog:
  - class: `TdlgPlaceableEdit`,
  - title: `Placeable Object Properties`.
- Zakladka: `Basic`.
- Placeable:
  - tag: `nwic_desertplant_14`,
  - `Appearance Type`: `NWIC: Containers, Chest, 01`.

## Stan startowy

Odczyt checkboxow przed operacja:

- `Plot`: `off`.
- `Useable`: `off`.
- `Static`: `off`.

## Odtworzona sekwencja

1. Zaznaczono `Plot`.
2. Zaznaczono `Useable`.
3. Toolset automatycznie zablokowal `Static` (`Enabled=false`), gdy `Useable`
   bylo wlaczone.
4. Odznaczono `Useable`.
5. Zaznaczono `Static`.
6. Odznaczono `Static`.
7. Odznaczono `Plot`.
8. Koncowy odczyt checkboxow:
   - `Plot`: `off`,
   - `Useable`: `off`,
   - `Static`: `off`.

## Wazna obserwacja

`Useable` i `Static` sa w praktyce wzajemnie ograniczone w tym dialogu:

- po wlaczeniu `Useable`, checkbox `Static` staje sie nieaktywny,
- zeby wlaczyc `Static`, trzeba najpierw odznaczyc `Useable`.

Nie wymuszac stanu `Useable=on` i `Static=on` przez niskopoziomowe ustawianie
bitow checkboxa, bo UI Toolsetu traktuje taka kombinacje jako niedozwolona.

## Screeny dowodowe

- `Plot=on`, `Useable=on`, `Static` zablokowane:
  `C:\Projects\aurora-web\.codex-tmp\toolset-placeable-properties-20260617\checkbox-toggle\checkboxes-plot-useable-on-static-disabled.png`
- `Plot=on`, `Static=on`, `Useable=off`:
  `C:\Projects\aurora-web\.codex-tmp\toolset-placeable-properties-20260617\checkbox-toggle\checkboxes-plot-static-on-useable-off.png`
- Stan koncowy, wszystkie trzy opcje odznaczone:
  `C:\Projects\aurora-web\.codex-tmp\toolset-placeable-properties-20260617\checkbox-toggle\checkboxes-final-all-off.png`

## Zasady bezpieczenstwa

- Nie uzywac globalnego kursora uzytkownika.
- Nie zapisywac modulu na dysk bez osobnej decyzji.
- Po `Access violation` zamknac Toolset i odtworzyc kroki od poczatku.
