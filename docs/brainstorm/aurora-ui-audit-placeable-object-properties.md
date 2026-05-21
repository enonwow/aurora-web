# Aurora UI Audit - Placeable Object Properties

## Purpose
Capture the current Aurora `Placeable Object Properties` UI surface from screenshots and map it to current `aurora-web` MVP scope decisions.

## Evidence Source
1. User-provided screenshots in this thread (Placeable Object Properties window).
2. Tabs captured: `Basic`, `Lock`, `Trap`, `Scripts`, `Advanced`, `Description`, `Comments`.

## Aurora UI Surface (Observed)

### 1. Basic
1. `Name`
2. `Tag`
3. `Appearance Type`
4. Flags:
- `Plot`
- `Useable`
- `Has Inventory`
- `Static`
5. Combat/interaction stats:
- `Hardness`
- `Hit Points`
- `Fortitude Save`
- `Reflex Save`
- `Will Save`
6. Left preview panel + `Inventory...` button.

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
2. `Trap Type`
3. `Detection DC`
4. `Disarm DC`
5. Trap flags:
- `One Shot`
- `Detectable`
- `Disarmable`
6. Script refs:
- `OnDisarm`
- `OnTrapTriggered`
7. Derived/helper fields:
- `Set DC`
- `Detect DC Mod. when set by Rogue`
- `Disarm DC Mod. when set by Rogue`

### 4. Scripts
1. Placeable event script slots:
- `OnClick`
- `OnClose`
- `OnDamaged`
- `OnDeath`
- `OnHeartbeat`
- `OnDisturbed`
- `OnLock`
- `OnPhysicalAttacked`
- `OnOpen`
- `OnSpellCastAt`
- `OnUnLock`
- `OnUsed`
- `OnUserDefined`
2. Extra actions:
- `Save Script Set`
- `Load Script Set`
- per-slot `...` and `Edit` actions.

### 5. Advanced
1. `Blueprint ResRef`
2. `Belongs To Faction`
3. `Conversation`
4. `No Interrupt`
5. Portrait display/resource
6. `Initial State`
7. `Treasure Model`
8. `Variables`

### 6. Description
1. Placeable description text editor.

### 7. Comments
1. Toolset comments text area.

## MVP Mapping (Current Project Decisions)

### In MVP (now)
1. Placeable script-slot assignment support (no full script editor).
2. Minimum placeable property editing needed for object workflow continuity:
- identity fields (`Name`, `Tag`);
- core behavior flags used in placement workflow (at least `Useable`, `Plot`);
- selected structural/gameplay fields required by import/export contract.
3. Script-slot parity target for placeables uses the observed slot list from this audit.

### Not In MVP (post-MVP)
1. Full script authoring/editor workflow (`Edit`, compile/search/wizard flows).
2. Full dialog/conversation authoring workflow.
3. Full parity implementation of all lock/trap/advanced/description/comments capabilities unless explicitly required by MVP acceptance tests.
4. `Save Script Set` / `Load Script Set` UX parity.

## Gaps To Track Against MVP
1. Define exact MVP subset of non-script placeable fields (minimal mandatory contract).
2. Confirm whether `Lock` and `Trap` tabs are required in MVP or moved to post-MVP.
3. Define backend contract for placeable script-slot write/read validation and error reporting.
4. Add dedicated tests for placeable script-slot assignment and persistence/reload parity.

## UX Modernization Notes
1. Keep Aurora field coverage, but avoid dense legacy tab UX overload.
2. Prefer progressive disclosure:
- compact default inspector;
- advanced sections collapsible.
3. Keep non-destructive editing continuity (no area reload after property edits).
4. Keep explicit debug visibility for object identity and script-slot state in dev builds.
