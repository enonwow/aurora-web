# demo source proof pack

Generated: 2026-07-14T12:40:28.114Z

Module path: `C:\Users\enonw\Documents\Neverwinter Nights\modules\codex_npc_item_live_20260713.mod`

## Verdict

Tiles and GIT objects use separate rotation contracts. Tile orientation comes from ARE Tile_List and is a discrete 0..3 tile/grid value. Placeable bearing comes from GIT orientation/bearing fields. VisualTransform is a separate visual-only payload and must not be merged into tile orientation or GIT placement.

## Counts

- Tiles: 64
- Tileset SET status: present
- SET referenced tile models resolved: 64/64
- SET referenced ImageMap2D rows: 64
- Objects: 18
- Placeables: 3
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
