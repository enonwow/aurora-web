# Standard dodawania Waypoint w Aurora Toolset

Status: `verified`. Roadmap ID: `AUR-S01-09`.

## Funkcja

Wybrać liść rodziny `Waypoints`, postawić dokładnie jeden marker, zapisać i
potwierdzić rekord `waypoint` w Area GIT.

## Kontrakt proof

- `waypoints +1` i `total +1`; inne liczniki bez zmian;
- readback zawiera template resref, tag, X/Y/Z i bearing;
- marker Waypoint nie może zostać pomylony ze start location albo map note;
- standard placementu nie obejmuje jeszcze edycji tagu;
- po placement musi być potwierdzony natywny powrót do Objects mode.

## Referencyjny accepted run

Liść `Waypoint` utworzył `nw_waypoint001`, tag `NW_WAYPOINT001`, pozycję
`(33.1162, 47.7472, 3.5019)`. `waypoints 0→1`, `total 15→16`.

Proof: [palette placement corrected live](evidence/palette-placement-corrected-live-2026-07-14/README.md).

Edycja tagu została osobno udowodniona w natywnym `Waypoint Properties`:
`NW_WAYPOINT001 → CODEX_WAYPOINT_PROOF`, bez zmiany template, pozycji, bearingu
ani liczby obiektów. Proof: [waypoint tag live standard](evidence/waypoint-tag-live-standard-2026-07-14/README.md).

## Potencjalne problemy

- filtr Toolsetu ukrywa marker;
- domyślny tag nie spełnia kontraktu skryptu;
- zduplikowany tag jest osobnym problemem semantycznym mimo poprawnej delty GIT.
