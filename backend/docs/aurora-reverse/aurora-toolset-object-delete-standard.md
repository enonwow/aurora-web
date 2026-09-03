# Standard usuwania obiektu w Aurora Toolset

Status: `verified`. Roadmap ID: `AUR-S02-08`.

## Funkcja

Usunąć dokładnie jeden wcześniej zidentyfikowany obiekt Area i potwierdzić po
Save izolowaną deltę `-1` wyłącznie w jego rodzinie GIT.

## Procedura

1. Zbuduj parserowy baseline i zapisz template, tag, pozycję oraz liczniki.
2. Przejdź do natywnego `Select Objects`.
3. Rozwiń właściwe Area i rodzinę w lewym `TTreeView`.
4. Wybierz leaf po tożsamości z baseline, nie tylko po współrzędnych ekranu.
5. Wyślij `WM_KEYDOWN/WM_KEYUP` z `VK_DELETE` wyłącznie do zwalidowanego HWND
   drzewa Area. Globalny klawisz `Delete` jest zabroniony.
6. Potwierdź dirty title `*`, zniknięcie liścia i oczekiwaną zmianę sceny.
7. Zapisz rozpoznanym przyciskiem Save i wykonaj natychmiastowy readback GIT.
8. Zamknij sesję targeted `WM_CLOSE` i potwierdź zero procesów.

## Kontrakt proof

- `after[targetKind] = before[targetKind] - 1`;
- `after.total = before.total - 1`;
- wszystkie pozostałe liczniki są identyczne;
- usunięty rekord odpowiada template/tag wskazanym przed akcją;
- screenshot przed i po oraz targeted-action JSON istnieją;
- źródło pozostaje read-only, a mutowana jest wyłącznie kopia robocza;
- brak dirty title albo delta `0` daje `delete_no_structural_delta`.

## Accepted live run

W Area `Demo - home` wskazano Door `nw_door_ttr_04`, tag
`BARN_DOOR_HOME`, pozycję `(35, 25.76, 0)`. Targeted `Delete` do lewego
`TTreeView` i Save dały:

- `doors 1→0`;
- `total 2→1`;
- `waypoints 1→1`;
- pozostałe rodziny `0→0`.

Proof: [door/delete live run](evidence/door-hook-live-standard-2026-07-14/README.md).
