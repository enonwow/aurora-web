# enon_test_effect source proof pack

Generated: 2026-07-19T16:20:12.352Z

Module path: `C:\Users\enonw\Documents\Neverwinter Nights\modules\codex_vb_row50.mod`

## Verdict

Tiles and GIT objects use separate rotation contracts. Tile orientation comes from ARE Tile_List and is a discrete 0..3 tile/grid value. Placeable bearing comes from GIT orientation/bearing fields. VisualTransform is a separate visual-only payload and must not be merged into tile orientation or GIT placement.

## Counts

- Tiles: 4
- Tileset SET status: present
- SET referenced tile models resolved: 2/4
- SET referenced ImageMap2D rows: 2
- Objects: 1
- Placeables: 0
- VisualTransform placeables: 0
- GIC status: present
- module.ifo status: present

## Files

- rawAreSummary: `raw.are.summary.json`
- rawGitSummary: `raw.git.summary.json`
- rawGicStatus: `raw.gic.status.json`
- moduleIfoAreaEntry: `module-ifo-area-entry.json`
- tilesetSetSummary: `tileset.set.summary.json`
- tilesCsv: `tiles.csv`
- tileContractCsv: `tile-contract.csv`
- objectsCsv: `objects.csv`
- transformContract: `transform-contract.json`
- verdict: `verdict.md`
