# Aurora UI Audit - Paint Tool Coverage

## Purpose
Capture the explicit Aurora paint-tool scope selected for `aurora-web` MVP, so product and implementation docs stay synchronized.

## Analysis Timestamp
- 2026-05-21 (Europe/Warsaw)

## MVP Paint Tool Coverage
1. Supported:
- `Paint Terrain`
- `Paint Creatures`
- `Paint Door`
- `Paint Items`
- `Paint Placeable`
- `Paint Sounds`
2. Not in MVP:
- `Paint Start Location`
- `Paint Encounter`
- `Paint Merchant`
- `Paint Triggers`
- `Paint Waypoints`

## UX Constraints
1. Unsupported paint tools must be visible in UI as disabled and explicitly marked `Post-MVP`.
2. Supported paint tools must preserve incremental edit behavior (no full-area rerender for each operation).
3. Supported paint tools must preserve save -> reload parity.

## Linked Product Documents
1. `../product/mvp-area-editing-capabilities.md`
2. `../product/mvp-object-browser-and-previews.md`
3. `aurora-feature-parity-gap-backlog.md`
