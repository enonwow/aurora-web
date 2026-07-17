# Aurora Toolset: Placeable Object Properties tabs

Data: 2026-06-17

Ten dokument opisuje zakladki w oknie `Placeable Object Properties` dla
placeable zaznaczonego w area `_ikea`.

## Kontekst proby

- Modul: `the_last_city — codex.mod`.
- Area: `_ikea`.
- Okno properties:
  - class: `TdlgPlaceableEdit`,
  - title: `Placeable Object Properties`.
- Wybrany placeable:
  - tag: `nwic_desertplant_14`,
  - appearance: `NWIC: Garden, Desert, Plant 14`,
  - blueprint resref: `nwic102`.

## Odtwarzalna sekwencja

1. Otworzyc modul `the_last_city — codex`.
2. Otworzyc area `_ikea` i potwierdzic, ze widac karte area oraz render.
3. Rozwinac `_ikea -> Placeables`.
4. Zaznaczyc dowolny wpis z listy placeables.
5. Otworzyc `Edit -> Object Properties` albo uzyc zweryfikowanej komendy
   `WM_COMMAND 70`.
6. W oknie `Placeable Object Properties` przejsc kolejno po zakladkach:
   `Basic`, `Scripts`, `Advanced`, `Description`, `Comments`.

W tej probie zakladki byly przelaczane przez kontrolke `TPageControl` w dialogu
properties. Po kazdym przelaczeniu weryfikowalem widoczna `TTabSheet`.

## Screeny zakladek

| Zakladka | Screenshot | Zweryfikowana aktywna karta |
| --- | --- | --- |
| Basic | `C:\Projects\aurora-web\.codex-tmp\toolset-placeable-properties-20260617\tabs\placeable-properties-tab-basic.png` | `Basic` |
| Scripts | `C:\Projects\aurora-web\.codex-tmp\toolset-placeable-properties-20260617\tabs\placeable-properties-tab-scripts.png` | `Scripts` |
| Advanced | `C:\Projects\aurora-web\.codex-tmp\toolset-placeable-properties-20260617\tabs\placeable-properties-tab-advanced.png` | `Advanced` |
| Description | `C:\Projects\aurora-web\.codex-tmp\toolset-placeable-properties-20260617\tabs\placeable-properties-tab-description.png` | `Description` |
| Comments | `C:\Projects\aurora-web\.codex-tmp\toolset-placeable-properties-20260617\tabs\placeable-properties-tab-comments.png` | `Comments` |

Log przejscia po kartach:

`C:\Projects\aurora-web\.codex-tmp\toolset-placeable-properties-20260617\tabs\tab-capture-log.txt`

Zbiorczy podglad wszystkich zakladek:

`C:\Projects\aurora-web\.codex-tmp\toolset-placeable-properties-20260617\tabs\placeable-properties-tabs-contact-sheet.png`

## Basic

Widoczne pola i wartosci:

- `Name`: puste.
- `Tag`: `nwic_desertplant_14`.
- `Appearance Type`: `NWIC: Garden, Desert, Plant 14`.
- `Plot`: niezaznaczone.
- `Useable`: niezaznaczone.
- `Hardness`: `5`.
- `Hit Points`: `10`.
- `Fortitude Save`: `5`.
- `Reflex Save`: `0`.
- `Will Save`: `0`.
- `Has Inventory`: widoczne, niezaznaczone.
- `Static`: niezaznaczone.
- Lewy panel pokazuje podglad modelu placeable.

## Scripts

Zakladka pokazuje sloty skryptow:

- `OnClick`
- `OnClose`
- `OnDamaged`
- `OnDeath`
- `OnHeartbeat`
- `OnDisturbed`
- `OnLock`
- `OnPhysicalAttacked`
- `OnOpen`
- `OnSpellCastAt`
- `OnUnLock`
- `OnUsed`
- `OnUserDefined`

W tej instancji pola skryptow sa puste. Przy kazdym slocie widoczne sa
kontrolki wyboru/edycji, a na dole przyciski `Save Script Set` i
`Load Script Set`.

## Advanced

Widoczne pola i wartosci:

- `Blueprint ResRef`: `nwic102`.
- `Belongs To Faction`: `Hostile`.
- `Conversation`: puste.
- `No Interrupt`: niezaznaczone.
- `Portrait`: pusty/czarny podglad.
- `Initial State`: puste albo nieaktywne dla tej instancji.
- `Treasure Model`: `Default`.
- `Variables`: przycisk `...`.

## Description

- Zakladka zawiera duze pole `Description`.
- W tej instancji opis jest pusty.
- Widoczny jest przycisk `...` w prawym dolnym rogu pola opisu.

## Comments

- Zakladka zawiera duze pole komentarzy.
- W tej instancji komentarze sa puste.

## Dodatkowa obserwacja

W drzewie kontrolek dialogu istnieje ukryta karta `Trap`, ale nie byla ona
widoczna jako zakladka dla wybranego placeable. Dlatego screeny obejmuja tylko
widoczne zakladki UI: `Basic`, `Scripts`, `Advanced`, `Description`,
`Comments`.

## Zasady bezpieczenstwa z tej proby

- Nie uzywac globalnego kursora uzytkownika.
- Nie uzywac remote-memory odczytow/zapisow na kontrolkach `TreeView`.
- Po `Access violation` w `COMCTL32.DLL` zamknac Toolset i odtworzyc kroki od
  poczatku.
