# Aurora Toolset: atomic operations analysis from reference screens and local docs

Snapshot: 2026-06-18 00:32:30 +02:00

This is a separate analysis document. It does not replace the existing
Toolset replay/placeable notes.

## Scope

Analysed sources:

- Gallery: `C:\Projects\aurora-web\.codex-tmp\original-aurora-reference-screens\gallery`
- Index: `screen_functionality_index.csv`
- Main manifest: `original_aurora_screens_manifest.json`
- Existing local Toolset docs in `docs\aurora-toolset-*.md`

Current gallery snapshot:

- indexed image rows: `968`
- distinct functionality labels: `311`
- raw contact sheets: `64`
- annotated contact sheets: `49`

The gallery is actively growing from another heartbeat thread. Treat this file
as a point-in-time analysis, not a final catalogue.

## Operational documentation split

This file remains the gallery/source snapshot. Practical operator docs now live
in:

- [aurora-toolset-atomic-operations-index-2026-06-18.md](aurora-toolset-atomic-operations-index-2026-06-18.md)
- [aurora-toolset-atomic-operation-checklists-2026-06-18.md](aurora-toolset-atomic-operation-checklists-2026-06-18.md)
- [aurora-toolset-learning-roadmap-2026-06-18.md](aurora-toolset-learning-roadmap-2026-06-18.md)

## Confidence levels

| Level | Meaning |
| --- | --- |
| `verified-live` | Reproduced in the native Aurora Toolset in our current learning runs, with local notes/screenshots. |
| `screen-supported` | Visible in reference/manual/gallery screens, but not yet reproduced by us in the live Toolset. |
| `reference-only` | Useful visual/style/runtime reference, but not yet an editor operation. |
| `gap` | Identified as needed, but either contradictory, stale, or not yet reliable. |

## Core atom pattern

Most Aurora Toolset operations break down into this repeatable shape:

1. Resolve the correct Toolset window and child control.
2. Select the correct mode/palette/object.
3. Perform exactly one UI mutation.
4. Commit or cancel deliberately.
5. Verify by visible state, reopened properties, object count, or screenshot diff.

Important safety rules:

- Do not take over the user's global cursor.
- Avoid global `SendKeys` and global mouse movement.
- Prefer targeted Win32 messages to known Toolset controls.
- Do not save the module unless explicitly requested.
- If Toolset hits an access violation, close it and replay known steps.
- Remember Aurora Toolset is effectively single-threaded: plan async, execute UI
  mutations serially.

## Already verified live

| Atom | Status | Evidence / notes |
| --- | --- | --- |
| Start/find `nwtoolset.exe` | `verified-live` | Toolset executable and process checks captured in basic replay docs. |
| Open module `the_last_city - codex.mod` / em-dash filename variant | `verified-live` | `File > Open` via `WM_COMMAND 44` and module-open dialog were captured in `aurora-toolset-basic-ops-reproduced-2026-06-17.md`. |
| Open area `_ikea` | `verified-live` | Area tab and `TfrmViewerArea - _ikea` were confirmed after tree selection/double click. |
| Identify real viewport/canvas | `verified-live` | For placeable work, the real target was inner `TScrollBox`, not only `TfrmViewerArea`. |
| Move/pan camera | `verified-live` | Bottom toolbar movement controls changed viewport screenshots. |
| Rotate/pitch camera | `verified-live` | Hold-style button operation is required for camera rotate/pitch. |
| Zoom camera | `verified-live`, but transport-sensitive | One run proved toolbar zoom buttons by pixel diff; another doc says targeted `WM_MOUSEWHEEL` was reliable while button `BM_CLICK` was not. The atom is valid, but each run must verify by screenshot diff. |
| Reset/recenter view controls | `screen/control-supported` | Top toolbar controls `Goto Start Location` and `Reorient Camera` are identified in operator replay docs; fresh end-to-end reset proof should be kept separate. |
| Select a placeable from `_ikea -> Placeables` | `verified-live` | Selecting an instance and opening properties was reproduced. |
| Open `Placeable Object Properties` | `verified-live` | `Edit -> Object Properties`, command id `70`, opened `TdlgPlaceableEdit`. |
| Traverse placeable tabs | `verified-live` | `Basic`, `Scripts`, `Advanced`, `Description`, `Comments` captured. Hidden `Trap` sheet observed but not visible for the chosen object. |
| Change placeable appearance | `verified-live` | `Appearance Type` combo changed from plant to chest; reopened properties confirmed result. |
| Toggle `Plot`, `Useable`, `Static` | `verified-live` | `Useable` disables `Static`; do not force illegal state. |
| Change numeric placeable fields by `+10` | `verified-live` | `TUpDown`/spinbox path worked; direct text setting can lie visually. |
| Accept placeable changes with `OK` | `verified-live` | Dialog closed, module title gained `*`, module not saved to disk. |
| Add new placeable from palette | `verified-live` | Placeables palette, `Containers & Switches -> Barrel`, click into inner canvas; object count changed `2265 -> 2266`. |
| Rename new placeable to `test - codex` | `verified-live` | Use current visible `TEdit`, focus, `EM_SETSEL`, `EM_REPLACESEL`; stale handle or `SetWindowText` can lie. |
| Move selected placeable | `verified-live` | `Select Objects` mode plus targeted drag on inner `TScrollBox`; reopened properties confirmed selected object remained `test - codex`. |
| Context menu `Adjust Location` discovery | `gap` | Popup item was identified (`ID 192`) but clicking it did not open a reliable dialog in that run. |

## Screen-supported operation families

These appear in the gallery/manual screens and should be treated as a learning
queue, not as verified current skills yet.

### Area and terrain editing

Evidence appears across area-editor and terrain contact sheets, especially
`contact-sheet-59-batch28.png`, `contact-sheet-60-batch29.png`, and
`contact-sheet-61-batch30.png`.

Likely atoms:

- create area through Area Wizard: name, tileset, size, finish;
- select terrain/tile palette entry;
- paint tile/terrain feature into the area;
- raise/lower terrain or apply terrain-specific feature;
- use View menu toggles: grid, shadows, geometry fading, fog, area lighting;
- select tile/terrain region and inspect selection volumes;
- open `Tile Properties`;
- edit tile lighting/color swatches;
- verify terrain result in top-down and perspective views.

### Area properties and environment

Gallery rows around `914-918` show Area Properties and environment controls.

Likely atoms:

- open Area Properties;
- switch `Basic`, `Advanced`, `Environment`, `Comments`, `Events`, and audio-like tabs depending on Toolset version;
- change day/night mode;
- edit fog colors and lighting sliders;
- edit tileset/area advanced options;
- set area scripts/events;
- commit with `OK` and verify the area visual state.

### Palette and blueprint workflows

Gallery and earlier annotated sheets show standard/custom palette usage.

Likely atoms:

- switch right palette mode: terrain, creatures, doors, placeables, sounds, encounters, waypoints;
- expand/collapse palette tree categories;
- select a template/blueprint;
- place the selected template into the viewport;
- use palette context menu operations such as `Edit Copy`, `Update Instances`, `Find Text`, delete/export/refresh where present;
- distinguish standard palette from custom/module palette.

### Placeables beyond the verified subset

The placeable family is our strongest live skill so far, but screens still add
several new atoms:

- use `Open State` / initial state fields for placeables;
- open `Inventory...` / contents editor;
- add/remove inventory items;
- use variables dialog;
- edit scripts by slot;
- use portrait/resource pickers if available;
- use `Adjust Location` or exact coordinate dialog once reliable.

### Doors and transitions

Screens show door properties, lock/key settings, area transition setup and
loading screen/resource pickers.

Likely atoms:

- select/place a door from door palette;
- open Door Properties;
- edit `Basic`, `Lock`, `Trap`, `Appearance`, `Scripts`, `Comments`;
- configure `Locked`, key tag, lock DC and relock behavior;
- open Area Transition tab/dialog;
- choose target area, target type, connection type, target door/waypoint;
- verify transition marker/linking in the area editor.

### Sounds and ambience

`contact-sheet-61-batch30.png` is especially useful here.

Likely atoms:

- switch to sound palette;
- place a sound marker in an area;
- open Sound Properties;
- edit positioning and radius;
- edit random/looping sound settings;
- adjust volume/interval/ambient fields;
- verify radius marker/selection circle in the area viewport.

### Triggers and encounters

Gallery rows around `919-921` and RPGuides/encounter screens support this
family.

Likely atoms:

- select trigger mode/palette;
- draw or place a trigger volume;
- select the trigger region;
- open Trigger Properties;
- edit `Basic`, `Advanced`, and `Scripts`;
- paint encounter regions;
- open Encounter Wizard / Encounter Properties;
- edit creature table/spawn entries;
- verify region selection boxes in the viewport.

### Creatures, items, stores and merchants

Screens from batches `28`, `29`, `31`, and `33` show this group.

Likely atoms:

- create creature through Creature Wizard;
- launch Creature Properties from wizard finish page;
- edit creature basic profile: first/last name, tag, race, appearance, gender, faction, conversation;
- switch creature tabs: Advanced, Feats, Stats, Appearance, Classes, Skills, Scripts, Comments;
- change creature body parts/appearance where available;
- open inventory/equipment editor for a creature;
- create item through Item Wizard;
- edit item properties;
- open Store/Merchant Properties;
- set merchant pricing and inventory/store behavior.

### Conversation, journal, faction and scripts

This is visible in `contact-sheet-63-batch32.png` and related indexed rows.

Likely atoms:

- open Conversation Editor;
- create/edit root, NPC, and PC response nodes;
- create branching quest dialogue;
- bind conditional/action scripts through editor buttons;
- open Journal Editor and create category/entries/states;
- open Faction Editor;
- add faction, pick parent faction, adjust reputation bars;
- open Script Editor;
- browse functions/includes;
- compile script and observe compiler output;
- assign scripts to module/area/object event slots.

### Module properties and global setup

Screens show Module Properties event hooks and cached scripts.

Likely atoms:

- open Module Properties;
- switch tabs: `Basic`, `Events`, `Advanced`, `Description`, `Custom Content`, `Cached Scripts`;
- assign module event scripts such as `OnClientEnter`, `OnModuleLoad`, `OnPlayerDeath`;
- add/remove cached scripts;
- verify module-level changes without saving to disk unless requested.

## Reference-only material

The gallery contains many in-game/runtime/VFX/gameplay preview images. They are
valuable for style and validation, but they are not themselves Toolset editor
atoms.

Use them later for:

- visual target for a Last City-style location;
- lighting and ambience comparison;
- VFX/gameplay validation once the editor operation creates the intended
  content.

## Noise and stale-risk notes

- Some debug sheets include non-Toolset utilities such as GFF editors. Keep
  them out of the Toolset atom queue unless a future task explicitly needs GFF
  inspection.
- Some screens come from beta/localized/old manual versions. The visible UI
  still helps identify operation families, but command ids, tab labels and
  control layouts can drift.
- Current live Toolset handles are session-specific. Never hardcode them beyond
  a running session.
- A technical readback can lie if it targets stale controls. We already saw
  this with placeable name/text edits and numeric fields.

## Recommended learning queue

This queue is ordered to build location-authoring capability as quickly as
possible.

| Priority | Atom to learn next | Why |
| --- | --- | --- |
| 1 | Reliable `Adjust Location` / exact coordinate edit for selected placeable | Needed for precise layout work and faster repeatable placement. |
| 2 | Palette context menu: find, copy/edit, update instances | Needed for blueprint-driven edits and batch consistency. |
| 3 | Placeable inventory / contents editor | Directly useful for interactive props and containers. |
| 4 | Area Properties: environment/fog/lighting | High impact for Last City mood and readability. |
| 5 | Sound object placement and radius/random/looping properties | High impact for location atmosphere. |
| 6 | Door placement and Area Transition setup | Needed for connected interiors/exteriors. |
| 7 | Trigger volume creation and scripts tab | Needed for scripted area behavior. |
| 8 | Tile/terrain painting and tile lighting | Needed for actual location geometry beyond object placement. |
| 9 | Creature placement and basic properties | Needed for population and encounters. |
| 10 | Conversation + Journal + Script binding | Needed for quests/NPC interaction. |
| 11 | Module Properties events/cached scripts | Needed later, after local object/area workflow is stable. |
| 12 | Faction Editor | Useful but should wait until creatures and scripts are stable. |

## Practical conclusion

We already have a usable live operator foundation:

- open known module and `_ikea`;
- move/rotate/zoom camera with visual verification;
- select a placeable;
- open and traverse properties;
- change appearance, flags and numeric fields;
- add, name and move a new placeable.

The gallery shows the next layer needed for a real Last City-style location:

- area environment controls;
- terrain/tile editing;
- ambience/sound;
- doors/transitions;
- triggers/encounters;
- creature/NPC setup;
- conversation, journal and scripts.

The safest training method is to convert each screen-supported family into one
small verified live atom with screenshots and a short doc, then compose those
atoms into larger location-building workflows.
