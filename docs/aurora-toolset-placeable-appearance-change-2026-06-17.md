# Aurora Toolset: changing placeable appearance

Data: 2026-06-17

Ten dokument opisuje odtworzona umiejetnosc zmiany wygladu placeable przez
`Placeable Object Properties`.

## Kontekst proby

- Modul: `the_last_city — codex.mod`.
- Area: `_ikea`.
- Obiekt: placeable wybrany z galezi `_ikea -> Placeables`.
- Dialog:
  - class: `TdlgPlaceableEdit`,
  - title: `Placeable Object Properties`.
- Pole zmiany wygladu: zakladka `Basic`, combobox `Appearance Type`.

## Zmiana wykonana w probie

- Przed:
  - `Tag`: `nwic_desertplant_14`,
  - `Appearance Type`: `NWIC: Garden, Desert, Plant 14`,
  - indeks w comboboxie: `100`.
- Po:
  - `Tag`: `nwic_desertplant_14`,
  - `Appearance Type`: `NWIC: Containers, Chest, 01`,
  - indeks w comboboxie: `27`.

Zmiana zostala zatwierdzona przyciskiem `OK` w dialogu properties. Toolset
oznaczyl modul gwiazdka w tytule okna, co potwierdza zmiane w biezacej sesji
edytora. Modul nie zostal zapisany na dysk.

## Odtwarzalna sekwencja

1. Otworzyc area `_ikea`.
2. Rozwinac `_ikea -> Placeables`.
3. Zaznaczyc wybrany placeable.
4. Otworzyc `Edit -> Object Properties`.
   - Zweryfikowana komenda Toolsetu: `WM_COMMAND 70`.
5. W dialogu `Placeable Object Properties` wejsc na zakladke `Basic`.
6. W polu `Appearance Type` wybrac nowy wpis.
7. Zatwierdzic `OK`.
8. Opcjonalnie otworzyc properties ponownie i sprawdzic, czy `Appearance Type`
   pokazuje nowy wpis.

## Wariant automatyzowany

W tej probie wartosc w comboboxie zostala zmieniona przez:

1. `CB_SETCURSEL` na indeks `27`.
2. Powiadomienie `CBN_SELCHANGE` wyslane do rodzica kontrolki.
3. Klik `OK` w dialogu.
4. Ponowne otwarcie `Object Properties` przez `WM_COMMAND 70`.

Po ponownym otwarciu combobox zwrocil:

- `SelectedIndex=27`,
- `Text=NWIC: Containers, Chest, 01`.

## Screeny dowodowe

- Przed zmiana:
  `C:\Projects\aurora-web\.codex-tmp\toolset-placeable-properties-20260617\appearance-change\appearance-before-plant14.png`
- Po zmianie comboboxa, przed zatwierdzeniem:
  `C:\Projects\aurora-web\.codex-tmp\toolset-placeable-properties-20260617\appearance-change\appearance-after-combobox-chest01.png`
- Po zatwierdzeniu `OK`, scena Toolsetu:
  `C:\Projects\aurora-web\.codex-tmp\toolset-placeable-properties-20260617\appearance-change\appearance-after-ok-scene.png`
- Ponowne otwarcie properties i potwierdzenie nowego wygladu:
  `C:\Projects\aurora-web\.codex-tmp\toolset-placeable-properties-20260617\appearance-change\appearance-reopen-confirm-chest01.png`

## Wnioski

- Zmiana wygladu placeable jest kontrolowana przez `Appearance Type` na
  zakladce `Basic`.
- Zmiana samego pola w dialogu aktualizuje preview w oknie properties.
- Dopiero `OK` zatwierdza zmiane do instancji w aktualnej sesji Toolsetu.
- Ponowne otwarcie properties po `OK` jest najlepsza szybka weryfikacja, ze
  zmiana zostala przyjeta przez instancje.
- Gwiazdka `*` przy nazwie modulu oznacza, ze Toolset ma niezapisane zmiany.

## Zasady bezpieczenstwa

- Nie przejmowac globalnego kursora uzytkownika.
- Nie zapisywac modulu na dysk bez osobnej decyzji.
- Po `Access violation` zamknac Toolset i odtworzyc kroki od poczatku.
