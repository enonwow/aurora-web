# Aurora Toolset: changing placeable numeric values by +10

Data: 2026-06-17

Ten dokument opisuje zmiane wartosci liczbowych na zakladce `Basic` w
`Placeable Object Properties`.

## Kontekst proby

- Modul: `the_last_city — codex.mod`.
- Area: `_ikea`.
- Dialog:
  - class: `TdlgPlaceableEdit`,
  - title: `Placeable Object Properties`.
- Placeable:
  - tag: `nwic_desertplant_14`,
  - `Appearance Type`: `NWIC: Containers, Chest, 01`.

## Zmiana wykonana w dialogu

Interpretacja polecenia: zmiana wartosci o `+10`.

| Pole | Przed | Po |
| --- | ---: | ---: |
| `Hardness` | `5` | `15` |
| `Hit Points` | `10` | `20` |
| `Fortitude Save` | `5` | `15` |
| `Reflex Save` | `0` | `10` |
| `Will Save` | `0` | `10` |

## Odtworzona sekwencja

1. Otworzyc `Placeable Object Properties`.
2. Przejsc na zakladke `Basic`.
3. Dla kazdego pola liczbowego uzyc strzalki `up` w kontrolce spinbox:
   - `Hardness`: 10 krokow lacznie,
   - `Hit Points`: 10 krokow,
   - `Fortitude Save`: 10 krokow,
   - `Reflex Save`: 10 krokow,
   - `Will Save`: 10 krokow.
4. Zweryfikowac wartosci wizualnie i przez odczyt kontrolek.

W tej probie pierwszy klik testowy podniosl `Hardness` z `5` na `6`, potem
dodano jeszcze 9 klikniec dla `Hardness`.

## Wazna obserwacja

Samo ustawienie tekstu w polach `TEdit` nie wystarcza. Kontrolki raportowaly
nowe wartosci technicznie, ale UI nadal rysowalo stare liczby. Poprawna sciezka
to uzycie mechanizmu spinboxa (`TUpDown`), ktory aktualizuje wewnetrzna wartosc
Toolsetu i widoczny tekst.

## Dowody

- Test po jednym kliknieciu `Hardness +1`:
  `C:\Projects\aurora-web\.codex-tmp\toolset-placeable-properties-20260617\numeric-values\numeric-after-hardness-up-test-232407.png`
- Finalny stan po zmianie o `+10`:
  `C:\Projects\aurora-web\.codex-tmp\toolset-placeable-properties-20260617\numeric-values\numeric-values-plus-10-final-232501.png`

Finalny odczyt kontrolek:

- `Hardness=15`
- `Hit Points=20`
- `Fortitude Save=15`
- `Reflex Save=10`
- `Will Save=10`

## Akceptacja zmian

Po ustawieniu wartosci kliknieto `OK` w oknie `Placeable Object Properties`.

Zweryfikowany rezultat:

- dialog `Placeable Object Properties` zostal zamkniety,
- Toolset pozostal uruchomiony,
- tytul glownego okna pokazal `the_last_city — codex.mod*`, czyli modul ma
  niezapisane zmiany w biezacej sesji edytora,
- modul nie zostal zapisany na dysk.

Screenshot po akceptacji:

`C:\Projects\aurora-web\.codex-tmp\toolset-placeable-properties-20260617\acceptance\placeable-changes-accepted-after-ok.png`

## Zasady bezpieczenstwa

- Nie uzywac globalnego kursora uzytkownika.
- Nie zapisywac modulu na dysk bez osobnej decyzji.
- Po `Access violation` zamknac Toolset i odtworzyc kroki od poczatku.
