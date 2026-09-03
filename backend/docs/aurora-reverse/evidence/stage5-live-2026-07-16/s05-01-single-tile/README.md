# AUR-S05-01 single-tile live proof

Result: accepted. The validator passes all 8 checks and the working module is
back at the complete baseline. Aurora Toolset remains open.

## Accepted transaction

- Module: `codex_npc_item_live_20260713.mod`
- Area tree label / resref: `Demo - snow` / `area001`
- Tileset: `tcm02`
- Baseline: 64 tiles, 1 placeable, no creatures
- Operation: point placement of the exact `1x1` Feature
  `Ground with grass patch`
- Exact delta: tile `index 35`, `row 4`, `col 3`, `Tile_ID 183 → 34`,
  orientation `2 → 0`
- Isolation: the other 63 tiles and all object counts are unchanged
- Reopen: 64/64 tiles match the saved positive state
- Rollback: native Undo + Save restores 64/64 baseline tiles
- Input safety: no global cursor, keyboard, or mouse input

## Primary evidence

- `area001-feature-1x1-action.json` — exact palette leaf, target viewport,
  point placement, and safety declaration
- `area001-feature-1x1-diff.json` — the one accepted ARE tile delta
- `area001-reopen-persistence.json` — saved/reopened equality
- `area001-final-rollback.json` — complete baseline restoration
- `validation.json` — validator result, 8/8
- `10-area001-reopened-visible.png` — visible Area child after reopen recovery

Source packs live in the sibling `area001-baseline`,
`area001-after-feature-1x1`, `area001-after-reopen`, and
`area001-final-rollback` directories.

## Rejected trials retained for the standard

- `Road` did not dirty the source at the selected points and was rejected.
- `Water` on `Demo` made a creature location invalid; the Area was not saved
  and the on-disk ARE stayed at baseline.
- `Water` on `area001` changed four tiles (`27, 28, 35, 36`) because the click
  addressed a corner-based terrain/crosser operation. Both the drag and point
  variants were rolled back exactly. They are not counted as S05-01 success.
