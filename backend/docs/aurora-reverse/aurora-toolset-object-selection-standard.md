# Standard zaznaczania obiektu w Aurora Toolset

Status: `verified`, funkcja `AUR-S02-01`.

## Kontrakt

1. Potwierdź jeden PID, właściwy moduł, Area, `TfrmViewerArea`, viewport i
   niegłówny monitor proof.
2. Odszukaj natywny pasek `Selection Mode`: widoczny `TToolBar`, dokładnie dwa
   przyciski, rozmiar referencyjny `80x22`.
3. Odczytaj oba `TBBUTTON` przez proces Toolsetu. Nie uznawaj opisu logu ani
   wysłanego `WM_COMMAND` za potwierdzenie trybu.
4. `Select Objects` jest aktywny tylko wtedy, gdy przycisk indeks `1`, natywny
   command `1`, ma `TBSTATE_CHECKED`, a indeks `0` nie jest checked.
5. Wyślij pojedynczy targeted click do zwalidowanego `TScrollBox` albo wybierz
   dokładny node w Area tree.
6. Tożsamość zaznaczenia musi potwierdzić minimum para niezależnych sygnałów:
   outline + node tree, albo outline + properties, albo node tree + properties.
7. Dla properties użyj targeted double-click na zaznaczonym obiekcie, potwierdź
   klasę i tytuł dialogu, zrób screenshot i zamknij `Cancel`.

## Warunek proof

- screenshot pokazuje outline obiektu, nie niebieską ramkę tile'a;
- toolbar readback pokazuje dokładny checked state;
- properties pokazują nazwę/tag/resref albo inne pola jednoznaczne dla rekordu;
- parserowy rekord GIT zgadza się z identyfikacją w UI;
- nie wystąpiła mutacja modułu;
- brak globalnego inputu.

Referencyjny proof:
[object selection and Adjust Location](evidence/object-selection-adjust-location-live-standard-2026-07-14/README.md).
