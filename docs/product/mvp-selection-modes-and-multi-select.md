# MVP Selection Modes And Multi-Select

## Goal
Provide fast and predictable selection workflows for area editing, including single select, additive multi-select, and rectangle selection.

## Core MVP Requirements
1. Selection mode must be explicit and user-switchable.
2. Supported selection filters:
- `All`
- `Tile`
- `Placeable`
- `VFX`
- `Creature`
- `Door`
- `Item`
- `Sound`
3. In each mode, only matching objects can be selected.

## Input Behavior
1. `LMB` single click (without modifier):
- replaces current selection with one target object (if target matches active mode).

2. `Ctrl` + `LMB` click:
- adds/removes clicked object to/from current selection collection (toggle behavior);
- works for all selectable types covered by active mode.

3. `Shift` + `LMB` drag rectangle (marquee):
- draws selection rectangle over area viewport;
- selects all objects matching active mode intersecting the rectangle;
- with `Shift`, rectangle result is added to current selection set.

4. `LMB` press-and-hold selection behavior:
- holding `LMB` while moving cursor keeps selection interaction active in viewport;
- in tile-focused workflows this supports continuous selection/paint-style targeting behavior.

5. Selection baseline parity:
- `LMB` is reserved for selection workflows in viewport (Aurora baseline).
6. Context-menu invocation baseline:
- `RMB` on object opens object context actions for that target.

## Selection Collection Behavior
1. Selection state must store multiple object identities at once.
2. Selection collection must be stable across camera movement.
3. Selection updates must be incremental and must not trigger full-area rerender.

## UX Requirements
1. Active selection mode must be clearly visible in UI.
2. Rectangle selection must provide visual feedback while dragging.
3. Selection count should be visible when more than one object is selected.
4. Mixed-type selection is allowed only in `All` mode.

## Diagnostics Requirements
1. Debug snapshot must include:
- active selection mode;
- selected object ids/types/count;
- modifier key used (`none`, `ctrl`, `shift`);
- `LMB` hold/drag state (`click`, `hold`, `drag`);
- rectangle bounds (when marquee selection is used).

## Test Requirements
1. Unit tests:
- mode filter matching logic;
- selection set toggle logic (`Ctrl` behavior);
- `LMB` hold/drag selection state transitions;
- rectangle hit-test inclusion logic.

2. Integration tests:
- click select in each mode;
- `Ctrl` additive multi-select across large object sets;
- `LMB` hold selection behavior in viewport;
- `Shift` rectangle add-select with camera moved.

3. Regression smoke:
- baseline flow: choose mode -> select single -> add via `Ctrl` -> add via `Shift` rectangle -> continue editing selected set.

## Out Of Scope For This MVP Slice
1. Lasso/freehand selection shapes.
2. Advanced selection rules by metadata query.
3. Group/layer locking workflows.
