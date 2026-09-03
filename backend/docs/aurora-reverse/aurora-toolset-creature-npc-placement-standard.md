# Standard dodawania creature/NPC w Aurora Toolset

Status: obowiązujący, `verified`.  
Roadmap ID: `AUR-S01-02`.

Standard dziedziczy wszystkie bramki ze
[wspólnego standardu palety](aurora-toolset-palette-placement-standard.md).

## Kontrakt specyficzny dla NPC

- rodzina palety: `Creatures`;
- oczekiwany rekord: `kind=creature`;
- licznik docelowy: `creatures`;
- `creatures +1` i `total +1`;
- items, placeables, doors, encounters, sounds, stores, triggers i waypoints
  muszą pozostać bez zmian;
- proof musi pokazać wybrany liść NPC oraz postać w scenie;
- readback musi zawierać co najmniej template resref, tag, X/Y/Z i bearing.

## Referencyjne accepted run

W jednej sesji PID `6224` dodano `Dwarf Mercenary` z
`Creatures -> NPCs -> Dwarves` do Area `demo`.

- `creatures: 4 -> 5`;
- `total: 9 -> 10`;
- nowy rekord: `nw_dwarfmerc001`, `NW_DWARFMERC001`;
- pozycja: `(60.9686, 27.1816, 0)`;
- bearing: `270`;
- structural validator: historycznie `ok=true`, ale pełny verdict jest obecnie
  `partial`, ponieważ `Select Objects` nie było potwierdzone natywnym checked
  state. Wymagany rerun poprawionym skryptem palety.

Poprawiony rerun w jednej sesji PID `10844` dodał kolejnego `Dwarf Mercenary`:

- `creatures: 5 -> 6`;
- `total: 11 -> 12`;
- pozycja: `(53.2311, 52.4574, 0)`;
- natywny toolbar: Objects command `1` checked, Terrain command `0` unchecked;
- parserowy readback wykonano natychmiast po zapisie.

Accepted pakiet: [palette-placement-corrected-live-2026-07-14](evidence/palette-placement-corrected-live-2026-07-14/README.md).

Standard obejmuje placement creature/NPC. Nie obejmuje jeszcze edycji nazwy,
frakcji, conversation, skryptów, inventory, equipment ani statystyk.
