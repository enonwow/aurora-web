# AUR-S05-02 controlled group terrain proof

Result: accepted by `validate-aurora-toolset-stage5-group-terrain.mjs`.

The retained point-paint trial from S05-01 is the canonical S05-02 case. A
single exact `Water` point in tileset `tcm02` rebuilt the expected corner-based
`2x2` footprint:

- indices: `27, 28, 35, 36`
- source coordinates: rows `3..4`, columns `3..4`
- all four tiles: `Tile_ID 183 → 57`
- resulting orientations by index: `1, 2, 0, 3`
- height, lights, and animation-loop fields: unchanged
- all object counts: unchanged
- final native Undo + Save: complete 64-tile baseline restored

The source action and diffs are retained in the sibling
`s05-01-single-tile` packet as
`area001-water-single-point-action.json`,
`area001-single-point-diff.json`, and `area001-final-rollback.json`.
