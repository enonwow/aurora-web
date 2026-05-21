# Aurora UI Audit - Door Properties

## Purpose
Capture the current Aurora `Door Properties` UI surface from screenshots and map it to current `aurora-web` MVP scope decisions.

## Evidence Source
1. User-provided screenshots in this thread (Door Properties window + Area Transition popup).
2. Tabs captured: `Basic`, `Lock`, `Trap`, `Area Transition`, `Scripts`, `Advanced`, `Description`, `Comments`.

## Aurora UI Surface (Observed)

### 1. Basic
1. `Name`
2. `Tag`
3. Generic appearance controls:
- appearance mode/use generic appearance option
- `Generic Appearance` selector
4. Core door durability stats:
- `Plot`
- `Hardness`
- `Hit Points`
- `Fortitude Save`
- `Reflex Save`
- `Will Save`
5. Left preview panel (door model preview).

### 2. Lock
1. `Locked`
2. `Can be relocked`
3. `Automatically remove key after use`
4. `Key required to unlock or lock`
5. `Open Lock DC`
6. `Close Lock DC`
7. `Key Tag`

### 3. Trap
1. `Is Trapped`
2. Trap settings:
- `Trap Type`
- `Detection DC`
- `Disarm DC`
- `One Shot`
- `Detectable`
- `Disarmable`
3. Trap script refs:
- `OnDisarm`
- `OnTrapTriggered`
4. Derived helper fields:
- `Set DC`
- `Detect DC Mod. when set by Rogue`
- `Disarm DC Mod. when set by Rogue`

### 4. Area Transition (Door Tab)
1. `Destination Tag`
2. `Destination Type`:
- `None`
- `Door`
- `Waypoint`
3. `Loading Screen`
4. `Setup Area Transition` action opening dedicated transition dialog.

### 5. Area Transition Popup (Observed)
1. `Target Area` selector.
2. `Target Type`:
- `Door`
- `Trigger`
- `Waypoint`
3. `Connection Type`:
- `Both Ways`
- `Current to Target`
- `Target to Current`
4. `Available Doors` list.
5. Target-area grid/map panel.

### 6. Scripts
1. Door event script slots:
- `OnAreaTransitionClick`
- `OnClose`
- `OnDamaged`
- `OnDeath`
- `OnFailToOpen`
- `OnHeartbeat`
- `OnLock`
- `OnPhysicalAttacked`
- `OnOpen`
- `OnSpellCastAt`
- `OnUnLock`
- `OnUserDefined`
2. Extra actions:
- `Save Script Set`
- `Load Script Set`
- per-slot `...` and `Edit`.

### 7. Advanced
1. `Blueprint ResRef`
2. `Belongs To Faction`
3. `Conversation` + `Edit`
4. `No Interrupt`
5. Portrait field/preview
6. `Initial State`
7. `Variables`

### 8. Description
1. Description text area.

### 9. Comments
1. Comments text area.

## MVP Mapping (Current Project Decisions)

### In MVP (now)
1. Door script-slot assignment support (no full script editor).
2. Minimum door property editing needed for flow continuity:
- identity (`Name`, `Tag`);
- baseline state/durability fields used by editor/runtime contract;
- script-slot assignment from observed door slot list.
3. Door `Area Transition` UX shell should be present in MVP (tab/controls visible with explicit availability state).

### MVP Target (core logic)
1. Basic door transition setup path should be available in MVP:
- set destination type;
- set destination target;
- set loading screen;
- persist and reload without data loss.

### Not In MVP (post-MVP)
1. Full script authoring/editor flow (`Edit`, compile/search/wizard).
2. Full dialog/conversation authoring/editor flow.
3. Full parity of every advanced lock/trap/transition edge case unless required by MVP acceptance tests.
4. `Save Script Set` / `Load Script Set` parity behavior.

## Gaps To Track Against MVP
1. Define exact MVP subset of non-script door fields.
2. Define minimum functional subset for `Area Transition` popup behavior in MVP.
3. Define backend validation contract for door transitions:
- invalid target refs;
- incompatible target type;
- missing target area.
4. Add regression tests for door transition setup and persistence/reopen parity.
5. Add dedicated tests for door script-slot assignment.

## UX Modernization Notes
1. Keep Aurora tab layout as parity baseline, but modernize information hierarchy.
2. Keep transition setup discoverable from the same door panel flow.
3. Use explicit status labels for staged capabilities (`Available`, `Planned`, `Read-only`).
4. Preserve editing continuity (no full area reload after door property changes).
