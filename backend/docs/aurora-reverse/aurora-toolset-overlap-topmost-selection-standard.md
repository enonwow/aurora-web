# Standard AUR-S02-10 — deterministic topmost selection przy overlapie

## Zaliczone zachowanie

Standard obejmuje wyłącznie powtarzalne wskazanie obiektu najwyżej w kolejności
wyboru Aurora, gdy dwa obiekty różnych rodzin mają identyczne współrzędne GIT.
Nie obejmuje cyklicznego wyboru, klawiszowego przełączania ani dostępu do
zasłoniętego obiektu.

## Kontrakt proof

1. W jednej otwartej sesji Toolsetu zapisz baseline parsera Area GIT.
2. Natywnie postaw obiekt `Creature` i `Placeable` pod tym samym punktem
   viewportu; po Save parser musi potwierdzić dwa nowe rekordy oraz równe
   `X/Y/Z`.
3. Przejdź do `Select Objects` i dwa razy skieruj native click tylko do
   zwalidowanego viewportu Toolsetu, bez globalnego kursora/klawiatury.
4. Po każdym kliknięciu odczytaj TreeView caret przez komunikaty kontrolki.
   Zaliczenie wymaga tej samej etykiety i tego samego HWND dla obu odczytów.
5. Wykonaj dokładnie dwa native `Undo`, Save i porównaj parserowe `objects.csv`
   z baseline bajt-po-bajcie.
6. Zamknij tę samą sesję jeden raz; zapisz PID, stan `closed` oraz brak
   procesów po zamknięciu.

## Minimalny pakiet artefaktów

- `actions.json` z targetami i metodą bez globalnego inputu;
- PNG fixture oraz PNG obu odczytów zaznaczenia;
- parserowe baseline, after-save i after-rollback;
- `summary.json`, `session-state.json`, manifest funkcji i wynik niezależnego
  walidatora.

## Referencyjny accepted proof

[Paczka live proof z 2026-07-14](evidence/overlap-topmost-selection-live-2026-07-14/README.md)
udowadnia `Water Trough` jako stabilny topmost nad `Dwarf Mercenary`; oba
rekordy miały `X=60.4528`, `Y=28.7291`, `Z=0`. Parserowy rollback był dokładny,
natomiast cały kontener `.mod` został zrepackowany przez Toolset i nie jest
traktowany jako byte-identical.
