# Standard dodawania przedmiotu na ziemię w Aurora Toolset

Status: obowiązujący, `verified`.  
Roadmap ID: `AUR-S01-03`.

Standard dziedziczy wszystkie bramki ze
[wspólnego standardu palety](aurora-toolset-palette-placement-standard.md).

## Kontrakt specyficzny dla itemu

- rodzina palety: `Items`;
- oczekiwany rekord: `kind=item`;
- licznik docelowy: `items`;
- `items +1` i `total +1`;
- creatures, placeables, doors, encounters, sounds, stores, triggers i
  waypoints muszą pozostać bez zmian;
- proof musi pokazać wybrany liść oraz zielony obrys/obiekt na ziemi;
- readback musi zawierać template resref, tag i X/Y/Z.

Item ground placement jest inną operacją niż dodanie itemu do inventory.
Validator odrzuca proof, jeżeli w Area GIT nie powstał dokładnie jeden rekord
`item`.

## Referencyjne accepted run

W tej samej kontrolowanej sesji PID `6224`, po osobnym baseline, dodano
`Commoner's Outfit` z `Items -> Armor -> Clothing` do Area `demo`.

- `items: 1 -> 2`;
- `total: 10 -> 11`;
- nowy rekord: `nw_cloth022`, `NW_CLOTH022`;
- pozycja: `(53.2285, 27.1841, 0.01)`;
- structural validator: historycznie `ok=true`, ale pełny verdict jest obecnie
  `partial`, ponieważ `Select Objects` nie było potwierdzone natywnym checked
  state. Wymagany rerun poprawionym skryptem palety.

Poprawiony rerun w jednej sesji PID `10844` dodał kolejny `Commoner's Outfit`:

- `items: 2 -> 3`;
- `total: 12 -> 13`;
- pozycja: `(48.0728, 51.4257, 0)`;
- natywny toolbar: Objects command `1` checked, Terrain command `0` unchecked;
- parserowy readback wykonano natychmiast po zapisie.

Accepted pakiet: [palette-placement-corrected-live-2026-07-14](evidence/palette-placement-corrected-live-2026-07-14/README.md).

Standard nie obejmuje jeszcze właściwości UTI, stosów, flag, inventory NPC ani
inventory placeable.
