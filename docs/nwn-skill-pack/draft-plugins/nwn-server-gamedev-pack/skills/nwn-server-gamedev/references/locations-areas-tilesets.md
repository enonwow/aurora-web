# Locations, Areas, Tilesets

## Source Status

- `docs-verified`: NWNWiki/Fandom Area, Tileset, and Create Area Transition pages for builder structure.
- `docs-verified`: NWN Lexicon Trigger Events, CreateArea, CopyArea, SetTransitionTarget, GetTransitionTarget, and GetArea pages for script/runtime behavior.
- `docs-verified`: NWNX:EE Area docs for NWNX-only area controls and path/walkability helpers.
- `runtime-tested`: required before claiming an area is playable, connected, walkable, or safe for live deployment.

## What This Domain Controls

Areas, transitions, encounter pacing, exploration routes, rest zones, visual identity, tileset constraints, placeables, doors, triggers, traps, spawn points, pathing, camera/navigation readability, sounds, weather, and area lifecycle.

## Source-Backed Facts To Preserve

- An area is a single setting inside a module where a player can move and act without taking a transition.
- An NWN area can range from 2x2 to 32x32 tiles and does not need to be square.
- Each area can use only one tileset.
- A tileset is a themed collection of tiles whose interactions define how tiles fit together.
- Tiles cannot normally be stacked in the Toolset.
- Toolset area transitions are trigger polygons with configured destination type, target area, target type, connection type, and destination.
- NWN trigger types include area transitions, generic triggers, and traps.
- For trigger events, `OBJECT_SELF` is the trigger, not the object that entered/clicked/triggered it.
- `CreateArea` creates an instanced copy from an area resref and can assign a new tag/name.
- `CopyArea` copies an existing live area, including runtime changes, except players.
- `CreateArea` and `CopyArea` require manually adjusting doors/triggers/transitions or players can end up in the wrong area.
- Transition targets for doors/triggers can be inspected or changed with `GetTransitionTarget` and `SetTransitionTarget`.
- Transition target lookup/caching makes tag-only transition mutation risky; use explicit target rebinding for generated/copied areas.
- `GetArea` can return `OBJECT_INVALID`; invalid PC area can happen during an area transition and should be treated carefully.
- NWNX:EE Area functions are a separate NWNX-only lane and include area property access, transition creation, direct-line/path checks, tile info, and area flags.
- NWNX Area path/walkability helpers do not replace in-game traversal testing with real creatures and clients.

## Design Questions

- What gameplay loop does the location support: hub, travel route, dungeon, boss room, wilderness, shop, social space, tutorial, housing, or instance?
- What is the target player count and camera/pathing density?
- What tileset and visual identity fit the fiction and mechanical needs?
- What is the area size, critical route, side-route budget, and dead-end policy?
- What objects must be accessible: doors, levers, loot, merchants, quest NPCs, rest points, transitions, traps, and exits?
- What transition pattern is used: door-to-door, trigger-to-waypoint, scripted jump, generated instance, or NWNX-created transition?
- What encounter pacing is intended: patrol, static spawn, trigger spawn, rest ambush, timed event, or DM-controlled?
- What server state changes happen in this location: quest flags, persistence writes, faction changes, spawn cleanup, or lockouts?
- What happens when multiple parties enter, disconnect, die, rest, or flee?
- What evidence proves the area is playable: Toolset build, in-game traversal, clean-client content, logs, screenshots, or NWNX path checks?

## Implementation Path

1. Define purpose, audience, expected party size, and evidence label.
2. Choose one tileset and state any HAK/NWSync dependency.
3. Sketch the route graph: entry, main path, branches, loops, rest/safe points, exits, and fail-safe return.
4. Specify area dimensions and landmark cadence.
5. Define transitions with source object, target object, target area, target tag, and reverse path.
6. Place encounters, interactables, loot, traps, doors, and blockers against the route graph.
7. Add scripts for triggers, spawns, transitions, ambient behavior, cleanup, and persistence only after object ownership is clear.
8. If using `CreateArea` or `CopyArea`, plan transition rebinding and cleanup explicitly.
9. If using NWNX Area functions, label the runtime dependency and add plugin/config checks.
10. Build in Toolset, run in game, and record walkability/transition/spawn evidence.

## Recommended Output Shape

For location/area/tileset tasks, produce:

1. Location purpose and player loop.
2. Tileset and content dependency note.
3. Area size and route graph.
4. Transition table.
5. Encounter/interactable table.
6. Script/event ownership table.
7. Runtime QA checklist.
8. Evidence label and blockers.

## Runtime Verification

Check at least:

- Toolset build succeeds;
- player start/entry point is reachable;
- every intended transition works in both directions or has an intentional one-way note;
- transition facing/orientation is acceptable after arrival;
- walkmesh/pathing supports normal movement and combat;
- camera does not hide critical interactables;
- doors/triggers/traps fire the intended scripts and use correct `OBJECT_SELF` assumptions;
- encounter spawn/de-spawn/reset behavior works;
- rest restrictions and safe zones match design;
- generated/copied areas rebind transitions and clean up correctly;
- clean client has all tileset/HAK content;
- logs show no area script, resource, or missing-target errors.

## Guardrails

- Do not mix tilesets inside one area.
- Do not claim an area works from a Toolset view alone; run it in game.
- Do not use generated/copied areas without a transition rebinding plan.
- Do not change transition destination by tag mutation after first use; use explicit rebinding when possible.
- Do not assume `OBJECT_SELF` in a trigger script is the entering PC.
- Do not use NWNX Area guidance without labeling it as NWNX-only.
- Do not rely on NWNX path helpers as the only playable-area proof.
- Do not add custom tilesets/HAKs without a client distribution and rollback plan.

## Sources

- NWNWiki/Fandom Area: https://nwn.fandom.com/wiki/Area
- NWNWiki/Fandom Tileset: https://nwn.fandom.com/wiki/Tileset
- NWNWiki/Fandom Create area transition: https://nwn.fandom.com/wiki/Create_area_transition
- NWN Lexicon Trigger Events: https://nwnlexicon.com/Category%3ATrigger_Events
- NWN Lexicon CreateArea: https://nwnlexicon.com/CreateArea
- NWN Lexicon CopyArea: https://nwnlexicon.com/CopyArea
- NWN Lexicon SetTransitionTarget: https://nwnlexicon.com/SetTransitionTarget
- NWN Lexicon GetTransitionTarget: https://nwnlexicon.com/GetTransitionTarget
- NWN Lexicon GetArea: https://nwnlexicon.com/GetArea
- NWNX:EE Area: https://nwnxee.github.io/unified/group__area.html
