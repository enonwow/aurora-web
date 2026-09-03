# Aurora Toolset live proof — bearing, Undo i Redo

Verdict: `verified` dla `AUR-S02-04` i `AUR-S02-09` dnia 2026-07-14.

Cały accepted run użył jednej sesji Aurora Toolset (`PID 48516`, frame
`8392278`) na fizycznym `DISPLAY1`. Nie użyto globalnego kursora, klawiatury ani
myszy. Sesja została zamknięta targetowanym `WM_CLOSE`; po zamknięciu było zero
procesów `nwtoolset`.

## Co udowodniono

Wybrany przez wiersz drzewa `Dwarf Mercenary` zachował X/Y/Z
`(53.23, 52.46, 0)`. Kliknięcie zwalidowanego `TBearingPanel` ustawiło w UI
`45,0°`, a po Save parser Area GIT odczytał bearing `225°` zamiast baseline
`270°`. Wszystkie liczniki pozostały identyczne.

| Faza | Bearing GIT | `objects.csv` SHA-256 |
| --- | ---: | --- |
| Baseline | 270° | `BD25047F...A7C491` |
| Mutacja | 225° | `458AC2BE...CE422` |
| Undo | 270° | identyczny z baseline |
| Redo | 225° | identyczny z mutacją |
| Final Undo | 270° | identyczny z baseline |

`baseline/`, `mutated/`, `undo/`, `redo/` i `final/` zawierają niezależne
parserowe source packi. `29-bearing-panel-45.png` pokazuje natywne UI 45°, a
pliki `33`–`44` zapisują stany toolbaru, akcje Undo/Redo, Save i final rollback.

## Testy negatywne

Samo `SetWindowText` chwilowo raportowało `45,0`, ale Aurora odtworzyła `0,0` i
nie zmieniła bearing w GIT. `UDM_SETPOS32` na `TUpDown` także nie wywołał
mutacji. Obie metody zostały zachowane jako negatywne artefakty i są zabronione
w standardzie.

Rozstrzygający wynik znajduje się w [validator-result.json](validator-result.json).
