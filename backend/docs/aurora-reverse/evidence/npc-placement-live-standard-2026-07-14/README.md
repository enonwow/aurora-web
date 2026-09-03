# Aurora Toolset live proof — creature/NPC placement

Verdict: `partial` for `AUR-S01-02` after the 2026-07-14 selection-mode audit.

The structural placement proof below remains valid. The earlier cleanup claim
does not: `WM_COMMAND 74` did not prove `Select Objects`. A new run must confirm
native toolbar index `1` checked and index `0` unchecked before this proof can
return to `verified`.

The first step of one two-operation Toolset session placed exactly one
`Dwarf Mercenary` in Area `demo`. The palette leaf was selected from
`Creatures -> NPCs -> Dwarves`, the placement was sent to the validated Area
`TScrollBox`, and `Select Objects` was restored before any other click.

## Structural result

| Counter | Before | After | Delta |
| --- | ---: | ---: | ---: |
| Creatures | 4 | 5 | +1 |
| Total objects | 9 | 10 | +1 |
| Items | 1 | 1 | 0 |
| Placeables | 3 | 3 | 0 |
| Doors | 1 | 1 | 0 |

The only new row is `kind=creature`, `templateResRef=nw_dwarfmerc001`,
`tag=NW_DWARFMERC001`, position `(60.9686, 27.1816, 0)`, bearing `270`.

## Session and persistence

- One accepted Toolset PID: `6224`.
- Sequence: `aurora-npc-item-standards-20260714`, step `1/2`.
- Working file: `130529 -> 134882` bytes after the NPC save.
- Session hash: `A6ED17...F171 -> 96BB52...49AE` after both accepted steps.
- Source hash stayed `6FC8F3...9309`.
- No global cursor, keyboard or mouse input was used.
- Targeted close left zero Toolset processes and windows.

The session-end hash intentionally covers both accepted sequence steps. The
NPC-specific isolation proof is the parser snapshot generated immediately
after the NPC save and before the item step began.
