# Aurora Toolset live proof: NPC and item placement

Verdict: **verified** in one real Aurora Toolset session on 2026-07-13.

The `demo` area in `codex_npc_item_live_20260713.mod` was changed and saved in BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17. No global cursor, keyboard, or mouse input was used.

## Result

| Object | Before | After | Added record |
| --- | ---: | ---: | --- |
| Creatures | 3 | 4 | `nw_dwarfmerc001` / `NW_DWARFMERC001` at `(60.9686, 54.5207, 0)` |
| Items | 0 | 1 | `nw_cloth022` / `NW_CLOTH022` at `(58.3894, 49.8782, 0)` |
| Total objects | 6 | 8 | `+2` |

Palette selections used in Toolset:

- NPC: `Dwarf Mercenary`
- Item: `Commoner's Outfit`

## Saved module

- Path: `C:\Users\enonw\Documents\Neverwinter Nights\modules\codex_npc_item_live_20260713.mod`
- Size: `129513` bytes
- SHA-256: `266980EA87A2EA5097E6A189BCC06E90A5A1750214E9C00C7B7442B0729C2BFD`
- Source SHA-256: `6FC8F379F2130692FE83ACB52D5D42E3A6FCDD822BFF967290A5327A857A9309`

## Evidence

- `01-toolset-saved-full.png`: physical-screen capture of the saved module. The title has no unsaved `*`; the status bar says the area and module were saved; the item palette shows `Commoner's Outfit`.
- `02-placed-npc-item-crop.png`: crop of the newly placed dwarf and item in the area viewport.
- `baseline-manifest.json` and `after-save-manifest.json`: parser counts before and after the live Toolset save.
- `baseline-objects.csv` and `after-save-objects.csv`: exact object records used for the set difference.
- `summary.json`: machine-readable verdict, hashes, counters, and added-object identities.

The Toolset session (PID `40420`) was closed cleanly after capture using targeted `WM_CLOSE`; no Toolset process remained.
