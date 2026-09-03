# Aurora Toolset live proof — ground item placement

Verdict: `partial` for `AUR-S01-03` after the 2026-07-14 selection-mode audit.

The structural placement proof below remains valid. The earlier cleanup claim
does not: `WM_COMMAND 74` did not prove `Select Objects`. A new run must confirm
native toolbar index `1` checked and index `0` unchecked before this proof can
return to `verified`.

The second step of the same Toolset session placed exactly one
`Commoner's Outfit` on the ground in Area `demo`. The palette leaf came from
`Items -> Armor -> Clothing`, and the placement transaction restored
`Select Objects` automatically.

## Structural result

| Counter | Before | After | Delta |
| --- | ---: | ---: | ---: |
| Items | 1 | 2 | +1 |
| Total objects | 10 | 11 | +1 |
| Creatures | 5 | 5 | 0 |
| Placeables | 3 | 3 | 0 |
| Doors | 1 | 1 | 0 |

The only new row is `kind=item`, `templateResRef=nw_cloth022`,
`tag=NW_CLOTH022`, position `(53.2285, 27.1841, 0.01)`, bearing `270`.

## Session and persistence

- One accepted Toolset PID: `6224`.
- Sequence: `aurora-npc-item-standards-20260714`, step `2/2`.
- Working file: `134882 -> 136022` bytes after the item save.
- Session hash: `A6ED17...F171 -> 96BB52...49AE`.
- Source hash stayed `6FC8F3...9309`.
- No global cursor, keyboard or mouse input was used.
- Targeted close left zero Toolset processes and windows.

`02-palette-selection.png` and `05-object-crop.png` are the organoleptic proof
of the ground item. The saved-state screenshot confirms a clean title and save
status; the parser snapshot is the persistence proof.
