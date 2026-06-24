# Aurora Toolset: moving a newly created placeable

Data: 2026-06-18

Ten dokument opisuje odtworzona operacje przesuniecia placeable utworzonego
wczesniej jako `test - codex`.

## Kontekst proby

- Modul: `the_last_city - codex.mod`.
- Area: `_ikea`.
- Obiekt: placeable `test - codex`.
- Appearance: `Barrel 01`.
- Modul pozostal niezapisany na dysk; zmiany sa w biezacej sesji Toolsetu.

Przed ruchem otwarty dialog `Placeable Object Properties` potwierdzil, ze
zaznaczony obiekt ma:

- `Name = test - codex`,
- `Tag = Barrel`,
- `Appearance Type = Barrel 01`.

## Skuteczna sekwencja

1. Potwierdzic, ze obiekt `test - codex` jest zaznaczony na canvasie.
2. Przelaczyc gorny toolbar `Selection Mode` na `Select Objects`.
3. Wyslac kontrolowany drag do wewnetrznego viewportu/canvasu:
   - target: `TScrollBox`,
   - handle w tej probie: `2559416`,
   - punkt startowy w kliencie canvasu: `662,392`,
   - punkt koncowy w kliencie canvasu: `725,315`.
4. Zweryfikowac na screenshotach, ze zaznaczony obiekt przesunal sie na nowa
   pozycje.
5. Zweryfikowac licznik lewego drzewa:
   - po ruchu: `2266`,
   - bez dodatkowego placeable dodanego przez przypadek.
6. Otworzyc kontrolnie `Placeable Object Properties` po ruchu i potwierdzic,
   ze zaznaczony przesuniety obiekt nadal ma `Name = test - codex`.

## Wazne obserwacje

- Wlasciwy cel operacji sceny to wewnetrzny `TScrollBox` renderu, nie sama
  ramka `TfrmViewerArea`.
- Przed ruchem properties potwierdzily, ze zaznaczony obiekt to `test - codex`.
- Po ruchu marker zaznaczenia przesunal sie z grupy roslin na wyzsza pozycje
  na bruku.
- Nie uzyto globalnego kursora uzytkownika.
- Nie uzyto globalnego `SendKeys`.

## `Adjust Location`

Menu kontekstowe obiektu zawiera pozycje `Adjust Location`.

W tej probie odczytane pozycje popup menu byly:

| Pozycja | ID | Tekst |
| ---: | ---: | --- |
| 0 | 191 | `Add To Palette` |
| 1 | 192 | `Adjust Location` |
| 9 | 224 | `Properties` |

Klik w widoczne `Adjust Location` zamknal menu, ale nie otworzyl dialogu
lokalizacji. Na potrzeby tej operacji skuteczniejsza byla metoda drag w trybie
`Select Objects`.

## Dowody

Canvas przed ruchem:

`C:\Projects\aurora-web\.codex-tmp\toolset-placeable-move-20260618\before-drag-selected-placeable-001247-canvas.png`

Canvas po ruchu:

`C:\Projects\aurora-web\.codex-tmp\toolset-placeable-move-20260618\after-drag-selected-placeable-001250-canvas.png`

Pelny zrzut po ruchu:

`C:\Projects\aurora-web\.codex-tmp\toolset-placeable-move-20260618\after-drag-selected-placeable-001250.png`

Kontrolne properties po ruchu:

`C:\Projects\aurora-web\.codex-tmp\toolset-placeable-move-20260618\moved-placeable-properties-confirm-delayed.png`

Popup menu z widocznym `Adjust Location`:

`C:\Projects\aurora-web\.codex-tmp\toolset-placeable-move-20260618\popup-before-adjust-click-001103.png`

## Status rezultatu

- Placeable `test - codex` zostal przesuniety na canvasie.
- Kontrolne properties po ruchu potwierdzily `Name = test - codex` i
  `Tag = Barrel`.
- Licznik obiektow pozostal `2266`, czyli nie dodano nowego placeable.
- Modul nadal ma niezapisane zmiany (`codex.mod*`).
- Modul nie zostal zapisany na dysk.

## Zasady bezpieczenstwa

- Nie przejmowac globalnego kursora uzytkownika.
- Nie uzywac globalnych zdarzen myszy ani globalnego `SendKeys`.
- Preferowac komunikaty kierowane do konkretnego uchwytu Toolseta.
- Po `Access violation` zamknac Toolset i odtworzyc kroki od poczatku.
- Nie zapisywac modulu bez osobnej decyzji uzytkownika.
