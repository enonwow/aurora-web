# Standard dodawania Door w Aurora Toolset

Status: `verified`. Roadmap ID: `AUR-S01-04`.

## Funkcja

Wybrać dokładny template Door i umieścić go wyłącznie w zweryfikowanym door
hooku zgodnym z tilesetem. Sukces oznacza nowy rekord `door` w GIT; samo
wybranie liścia, preview albo kliknięcie viewportu nie jest placementem.

## Standard rozpoznania hooku

1. Zbuduj source pack Area i odczytaj istniejące drzwi oraz ich X/Y/Z.
2. Otwórz Area w jednej zweryfikowanej sesji i wykonaj screenshot top-down.
3. Powiąż istniejący rekord Door z widocznym otworem w tile. Czerwony seam
   pomiędzy tile'ami nie jest automatycznie door hookiem.
4. Jeżeli moduł nie ma wolnego hooku, przygotuj kontrolowany fixture w kopii
   roboczej: usuń drzwi z rozpoznanego hooku, zapisz i potwierdź `doors -1`.
5. Dopiero na tym samym, już zweryfikowanym punkcie wybierz kompatybilny leaf
   Door i wykonaj jedno kliknięcie targeted do `TScrollBox`.
6. Przywróć natywny `Select Objects` i odczytaj `TBBUTTON`:
   `terrain.checked=false`, `objects.checked=true`.

## Kontrakt proof

- baseline po przygotowaniu fixture ma dokładny licznik `doors`;
- po dodaniu: `doors +1`, `total +1`, pozostałe liczniki bez zmian;
- readback zawiera template, tag, X/Y/Z i bearing;
- screenshot pokazuje Area, wybrany leaf i zapisany rezultat;
- zapis wykonuje rozpoznany przycisk Save, po czym znika `*`;
- sesja kończy się targeted `WM_CLOSE` i zerem procesów;
- validator nie przyjmuje udanego kliknięcia bez strukturalnej delty.

## Accepted live run

W `Demo - home` istniejące drzwi wskazały natywny hook `(35, 25.76, 0)`.
Kontrolowany baseline po usunięciu drzwi miał `doors 0 / total 1`. Następnie
`Barn Door` został dodany dokładnie w tym hooku i zapisany jako:

- template `nw_door_ttr_04`;
- tag `Barn1Door`;
- pozycja `(35, 25.76, 0)`;
- bearing `180`;
- `doors 0→1`, `total 1→2`.

Accepted proof: [door hook live standard](evidence/door-hook-live-standard-2026-07-14/README.md).

## Kontrolowany proof negatywny

Kliknięcia poza hookiem, w tym na seamie tile'a, nie oznaczały modułu jako
zmienionego. Wcześniejszy przebieg `Area Transition (No Visible Door)` również
dał `doors 1→1`, `total 16→16` oraz identyczny `objects.csv`.

To jest oczekiwany wynik `door_hook_target_rejected`, a nie awaria Aurory.
