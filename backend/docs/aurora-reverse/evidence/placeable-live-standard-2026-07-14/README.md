# Aurora Toolset live proof: placeable placement standard

Verdict: `verified` for the accepted live run on 2026-07-14.

## Live action

- Tool: BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17.
- One accepted session: PID `6332`.
- Module: `codex_npc_item_live_20260713.mod`.
- Area: `demo` / `Demo`.
- Palette: `Placeables -> Standard -> Miscellaneous -> Water Trough`.
- Target: current Area `TScrollBox`, HWND `396522`, local point `(400, 600)`.
- Added record: `plc_watertrough`, tag `Water Trough`, world position
  `(27.4395, 29.7607, 0)`.
- No global cursor, keyboard, or mouse input was used.

## Structural proof

| Counter | Before | After | Delta |
| --- | ---: | ---: | ---: |
| Placeables | 2 | 3 | +1 |
| Total objects | 8 | 9 | +1 |
| Doors | 1 | 1 | 0 |
| Creatures | 4 | 4 | 0 |
| Items | 1 | 1 | 0 |

The set difference of `baseline-objects.csv` and `after-save-objects.csv`
contains exactly one row and its `kind` is `placeable`.

## Persistence proof

- Working module SHA-256 before:
  `266980EA87A2EA5097E6A189BCC06E90A5A1750214E9C00C7B7442B0729C2BFD`.
- Working module SHA-256 after:
  `A6ED17F79F1656B819A8AD94D4D0864CEBFDE3AC25952ECBF847D625AA01F171`.
- Source module SHA-256 stayed:
  `6FC8F379F2130692FE83ACB52D5D42E3A6FCDD822BFF967290A5327A857A9309`.
- Saved size: `130529` bytes.
- Toolset title after save had no `*` and status said the Area was saved.
- Targeted close left zero Toolset processes and windows.

## Visual evidence

- `01-before-full.png`: physical Toolset baseline.
- `02-palette-selection.png`: selected `Water Trough` leaf after the placement transaction.
- `03-after-placement-full.png`: Toolset title with `*` and the new object in the Area.
- `04-after-save-full.png`: saved Toolset state, no `*`, save status visible.
- `05-placeable-crop.png`: enlarged crop of the placed trough.

An earlier setup attempt targeted a new module copy that did not match the
read-only MRU state. The canonical opener rejected it and closed that failed
session. It is not part of this accepted run. The accepted run above used one
PID from module load through placement, save, capture, structural readback, and
clean close.
