# Standard Undo/Redo w Aurora Toolset

Status: `verified`. Roadmap ID: `AUR-S02-09`.

## Funkcja

Udowodnić pełny cykl tej samej mutacji:
baseline → mutacja → Undo do baseline → Redo do identycznej mutacji → końcowy
Undo do baseline.

## Kontrakt accepted proof

1. Baseline musi mieć parserowy readback i stabilny identyfikator celu.
2. Mutacja musi mieć własny readback GIT przed Undo.
3. Po mutacji `Undo.enabled=true`, `Redo.enabled=false`.
4. Po targeted Undo `Redo.enabled=true`, a zapisany GIT i całe `objects.csv`
   muszą odpowiadać baseline.
5. Pomiędzy Undo i Redo wolno wykonywać wyłącznie read-only probe'y. Nie wolno
   otwierać dialogów ani wykonywać innej mutacji.
6. Po targeted Redo `Undo.enabled=true`, `Redo.enabled=false`.
7. Po Save GIT i całe `objects.csv` muszą być byte-identical z mutacją sprzed
   Undo.
8. Na końcu wykonaj ponowne Undo, Save i exact readback baseline.
9. Stany toolbaru bez zgodnej delty GIT nie są dowodem.

## Accepted run

W jednej sesji PID `48516` bearing wskazanego `Dwarf Mercenary` przeszedł:

| Faza | Bearing GIT | SHA-256 `objects.csv` |
| --- | ---: | --- |
| Baseline | 270° | `BD25047F...A7C491` |
| Mutacja | 225° | `458AC2BE...CE422` |
| Undo | 270° | identyczny z baseline |
| Redo | 225° | identyczny z mutacją |
| Final Undo | 270° | identyczny z baseline |

Toolset został zamknięty bez force, z `processCountAfterClose=0`.

## Zachowany test negatywny

Starszy przebieg pozycji zachowuje blocker `redo_no_structural_delta`. Jest
ważny jako regresyjny dowód, że przejścia stanów przycisków bez delty GIT nie
mogą zostać zaakceptowane.

Accepted proof:
[bearing Undo/Redo](evidence/bearing-undo-redo-live-standard-2026-07-14/README.md).
Negative proof:
[position Redo failure](evidence/redo-live-standard-2026-07-14/README.md).
