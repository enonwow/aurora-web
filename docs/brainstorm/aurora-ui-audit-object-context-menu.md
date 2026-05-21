# Aurora UI Audit - Object Context Menu

## Purpose
Capture Aurora object context-menu behavior from current screenshots and define MVP support boundaries for `aurora-web`.

## Evidence Source
1. User-provided screenshot with object context menu over selected creature.
2. User confirmation: "non-crossed options are supported" and "right mouse button on object activates this panel".

## Observed Invocation
1. `RMB` (`Right Mouse Button`) on an object opens the object context menu.

## Observed Menu Entries (From Screenshot)
1. `Add To Palette` (crossed in screenshot)
2. `Adjust Location` (not crossed)
3. `Create Waypoint` (crossed)
4. `Conversation` (crossed)
5. `Inventory` (crossed)
6. `Levelup Wizard` (crossed)
7. `Setup Store` (crossed)
8. `Delete` (not crossed)
9. `Variables` (not crossed)
10. `Properties` (not crossed)

## MVP Support Mapping
1. Supported in MVP:
- `Adjust Location`
- `Delete`
- `Variables`
- `Properties`
2. Not in MVP:
- `Add To Palette`
- `Create Waypoint`
- `Conversation`
- `Inventory`
- `Levelup Wizard`
- `Setup Store`

## UX Constraints
1. Unsupported entries should be visible but disabled, with explicit `Post-MVP` explanation.
2. Context menu actions must be incremental and must not trigger full-area rerender by default.
3. `Properties` should open non-destructive inspection/edit mode that preserves active area session.
