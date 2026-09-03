# Standard bearing i obrotu obiektu w Aurora Toolset

Status: `verified`. Roadmap ID: `AUR-S02-04`.

## Funkcja

Ustawić dokładny bearing zaznaczonego obiektu, zapisać zmianę w Area GIT,
odczytać wynik i przywrócić baseline natywnym Undo.

## Wejście i identyfikacja celu

1. Otwórz jedną kopię roboczą modułu i jedno Area w jednej sesji Toolsetu.
2. Wybierz obiekt przez zwalidowany wiersz lewego drzewa Area. Nie opieraj
   funkcji na współrzędnej viewportu, która zależy od kamery.
3. Odczytaj menu wiersza przez `MN_GETHMENU` i wymagaj dokładnie jednego enabled
   itemu `&Adjust Location`.
4. Potwierdź dokładny `TdlgLocation` oraz osobny `TGroupBox` `Orientation`.

## Mutacja

1. Zapisz baseline `objects.csv`, wszystkie liczniki i rekord docelowego obiektu.
2. Bearing zmieniaj przez zwalidowany `TBearingPanel`. Pole tekstowe i
   `TUpDown` nie są samodzielnym źródłem prawdy.
3. Przed `OK` zachowaj screenshot dialogu pokazujący wartość bearing i kierunek
   czerwonej linii.
4. Po `OK` wymagaj dirty title, wykonaj rozpoznany Save i natychmiast odczytaj
   Area GIT.
5. Dokładnie jeden rekord może zmienić bearing. X/Y/Z, metadata, pozostałe
   rekordy i wszystkie liczniki muszą być identyczne.

## Mapowanie UI do GIT

W przebiegu referencyjnym Aurora zapisała:

`GIT bearing = (270° - UI bearing) mod 360°`.

Dlatego UI `0°` odpowiadało GIT `270°`, a UI `45°` odpowiadało GIT `225°`.
Walidator ma sprawdzać obie reprezentacje, zamiast zakładać, że liczby są
identyczne.

## Rollback

Po natywnym Undo i Save:

- docelowy bearing musi wrócić do baseline;
- całe `objects.csv` musi być byte-identical z baseline;
- liczniki muszą być identyczne;
- na końcu procesu Toolsetu ma nie być w systemie.

## Zabronione skróty

- samo `SetWindowText` na bearing;
- samo `UDM_SETPOS32` lub seria komunikatów do `TUpDown`;
- stan toolbaru bez parserowego readbacku GIT;
- uznanie wizualnie obróconego modelu bez zapisu i rollbacku.

Accepted proof:
[bearing + Undo/Redo live run](evidence/bearing-undo-redo-live-standard-2026-07-14/README.md).
