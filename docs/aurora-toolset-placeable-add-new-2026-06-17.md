# Aurora Toolset: adding a new placeable and naming it

Data: 2026-06-17

Ten dokument opisuje odtworzona operacje dodania nowego placeable do obszaru
oraz ustawienia pola `Name` na `test - codex`.

## Kontekst proby

- Modul: `the_last_city - codex.mod`.
- Area: `_ikea`.
- Docelowy obiekt: nowy placeable dodany do obszaru.
- Wybrany template z palety: `Barrel`.
- Oczekiwana nazwa instancji: `test - codex`.
- Modul pozostal niezapisany na dysk; zmiany sa w biezacej sesji Toolsetu.

## Odtworzona sekwencja

1. W prawej palecie wlaczono tryb `Placeables`.
2. Uzyto aktualnie widocznego drzewa palety placeables.
3. Rozwinieto kategorie `Containers & Switches`.
4. Wybrano template `Barrel`.
5. Dodano obiekt do renderowanego obszaru `_ikea`.
6. Zweryfikowano dodanie przez licznik lewego drzewa:
   - przed dodaniem: `2265`,
   - po dodaniu: `2266`.
7. Otworzono `Placeable Object Properties` dla nowego obiektu.
8. Na zakladce `Basic` ustawiono pole `Name` na `test - codex`.
9. Zatwierdzono zmiane przyciskiem `OK`.
10. Ponownie otworzono properties kontrolnie i zweryfikowano, ze `Name` nadal
    wynosi `test - codex`.
11. Kontrolny dialog zamknieto przez `Cancel`, zeby nie wprowadzac dalszych
    zmian.

## Wazne uchwyty i obserwacje

- Glowne okno Toolsetu:
  - class: `TfrmFrame`,
  - title: `BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17 - the_last_city - codex.mod*`.
- Lewy tree view modulu:
  - handle z tej proby: `15536894`.
- Ramka area viewer:
  - handle z tej proby: `3479518`.
- Wlasciwy canvas/scrollbox renderu:
  - handle z tej proby: `2559416`.

Dodanie placeable zadzialalo dopiero po wyslaniu klikniecia do wewnetrznego
canvas/scrollboxa renderu (`2559416`). Klikanie samej ramki viewer (`3479518`)
nie dodawalo obiektu.

## Wazna lekcja o wpisywaniu nazwy

Nie wystarczy polegac na starym uchwycie pola albo na samym `SetWindowText`.
W tej probie stary/nieaktualny uchwyt potrafil zwrocic technicznie
`test - codex`, ale aktywny dialog nadal wizualnie pokazywal `Barrel`.

Poprawna sciezka dla pola `Name`:

1. Otworzyc aktualny, widoczny `TdlgPlaceableEdit`.
2. Odnalezc aktualne widoczne pole `TEdit` odpowiadajace `Name`.
3. Ustawic focus na tej kontrolce.
4. Uzyc `EM_SETSEL` dla zaznaczenia calego tekstu.
5. Uzyc `EM_REPLACESEL` z wartoscia `test - codex`.
6. Zweryfikowac screenshotem, ze UI naprawde pokazuje nowa nazwe.
7. Dopiero potem kliknac `OK`.

Ta metoda byla skuteczna: kontrolny screenshot ponownie otwartego dialogu
pokazuje `Name = test - codex`.

## Dowody

Tryb placeables w prawej palecie:

`C:\Projects\aurora-web\.codex-tmp\toolset-placeable-add-20260617\right-palette-after-icon-126.png`

Rozwinieta kategoria `Containers & Switches` i wybrany `Barrel`:

`C:\Projects\aurora-web\.codex-tmp\toolset-placeable-add-20260617\right-palette-current-tree-containers-click.png`

Pole `Name` poprawnie wpisane metoda `EM_SETSEL` + `EM_REPLACESEL`:

`C:\Projects\aurora-web\.codex-tmp\toolset-placeable-add-20260617\placeable-current-name-em-replace-dialog.png`

Scena po zatwierdzeniu `OK`:

`C:\Projects\aurora-web\.codex-tmp\toolset-placeable-add-20260617\placeable-name-accepted-scene-235929.png`

Kontrolne ponowne otwarcie properties po `OK`:

`C:\Projects\aurora-web\.codex-tmp\toolset-placeable-add-20260617\placeable-name-confirm-reopened-final.png`

## Status rezultatu

- Nowy placeable zostal dodany do obszaru `_ikea`.
- Nazwa instancji zostala ustawiona na `test - codex`.
- Ponowne otwarcie properties potwierdzilo wartosc `Name`.
- Licznik lewego drzewa po operacji wynosil `2266`, czyli nie dodano kolejnych
  przypadkowych obiektow podczas weryfikacji.
- Nie przejmowano globalnego kursora uzytkownika.
- Nie zapisano modulu na dysk.

## Zasady bezpieczenstwa

- Nie uzywac globalnego kursora uzytkownika.
- Nie uzywac globalnych `SendKeys`.
- Preferowac komunikaty kierowane do konkretnego uchwytu okna/kontrolki.
- Po `Access violation` zamknac Toolset i odtworzyc kroki od poczatku.
- Nie zapisywac modulu bez osobnej decyzji uzytkownika.
