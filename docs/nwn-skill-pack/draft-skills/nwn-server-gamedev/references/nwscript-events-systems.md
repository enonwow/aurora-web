# NWScript Events And Systems

## Source Status

- `docs-verified`: NWNWiki/Fandom NWScript overview and `OBJECT_SELF`.
- `docs-verified`: NWN Lexicon event categories, module events, `ExecuteScript`, `AssignCommand`, and `DelayCommand`.
- `runtime-tested`: required before claiming a script system works in a specific module/server.

## What This Domain Controls

Module, area, creature, item, placeable, trigger, conversation, spell, feat, NUI, heartbeat, delayed, and executed scripts. Also include include-file ownership, naming, compile flow, state ownership, object context, and runtime logging.

## Source-Backed Facts To Preserve

- NWScript is NWN's scripting language for controlling objects, items, NPCs, modules, and other game behavior.
- NWScript is C-like, but it does not provide arrays or the standard C library.
- NWN objects expose events; builders attach scripts to those events to respond to PCs and other objects.
- Events exist across object categories such as area, creature, door, encounter, merchant, module, placeable, trap, and trigger.
- Module events include common persistent-server hooks such as `OnClientEnter`, `OnClientLeave`, `OnHeartbeat`, `OnModuleLoad`, NUI, player death/rest/equip/level-up/chat, acquire/lost item, and user-defined events.
- `OnModuleLoad` can run for both new-game and save-game loads, so initialization must be idempotent.
- `OBJECT_SELF` is the object running the current script; in event handlers it is the object whose event is being handled, while spell scripts run by the caster.
- `OBJECT_SELF` can be surprising with module/item events and with `AssignCommand`; capture it into a named object variable when passing it into delayed or assigned commands.
- `ExecuteScript` runs a compiled script on a target object as if called from an event, initializing `OBJECT_SELF` to that target.
- `ExecuteScript` runs immediately/inline unless deliberately delayed; it does not escape instruction-count pressure by itself.
- `DelayCommand` is bound to the caller context and can fail if the caller is destroyed; delayed logic that must survive should be owned by a stable object such as the module.
- `AssignCommand` is for making another object run actions/code; assigning to `OBJECT_SELF` is usually unnecessary and often indicates confused ownership.

## Design Questions

- Which event actually owns the behavior: module, area, trigger, placeable, item, creature, conversation, spell, NUI, or external command?
- What is `OBJECT_SELF` in that event and what are the event-specific accessors for actor/target/item?
- Which object should own persistent state: module, PC, area, placeable, item, database row, or NWNX/system storage?
- Does the script need to run immediately, after the current event, after a delay, or on a different object?
- Is the behavior event-driven, or is a heartbeat/repeating delay truly needed?
- Which includes are stable libraries and which logic belongs in event scripts?
- Which scripts are called only through `ExecuteScript` or `DelayCommand` and may be missed by packaging/dependency discovery?
- How will compile errors, runtime debug logs, and player-visible behavior be checked?

## Implementation Path

1. Identify the event owner and write down expected `OBJECT_SELF`.
2. List event inputs and accessors: player, target, item, spell, conversation node, NUI token, area, or placeable.
3. Define state ownership and persistence needs.
4. Keep event scripts thin; move reusable logic into focused includes with clear prefixes.
5. Choose immediate, delayed, assigned, or executed flow deliberately.
6. Capture `OBJECT_SELF` and other event objects into variables before passing them into assigned/delayed logic.
7. Add compile-time and runtime debug paths that can be removed or gated later.
8. Compile in the target toolchain.
9. Verify in runtime with logs and player-visible behavior.

## Recommended Output Shape

For a NWScript task, produce:

1. Event ownership table.
2. `OBJECT_SELF` and event accessor map.
3. State/persistence ownership table.
4. Script/include/resref naming plan.
5. Immediate vs delayed vs assigned execution plan.
6. Compile checklist.
7. Runtime QA checklist.
8. Evidence label and exact blockers.

## Runtime Verification

Test at least:

- target script compiles in the project's Toolset/compiler;
- event fires on the intended object and not a nearby similar event;
- `OBJECT_SELF`, actor, target, item, and area are logged during first test;
- persistent state is written to the intended object/storage;
- delayed or assigned logic survives or fails in understood ways when objects die, transition, or are destroyed;
- repeated use does not duplicate state, spam heartbeats, leak locals, or run twice after reload;
- multiplayer use separates per-PC state from module/global state;
- player-visible behavior matches the design;
- logs are removed, gated, or intentionally kept for operations before release.

## Common Failure Modes

- Script logic assumes the wrong `OBJECT_SELF`.
- Persistent state is stored on the wrong object.
- Item/module events are treated like spell scripts.
- Includes become global dumping grounds.
- Heartbeats or repeating delays are used where event-driven logic is enough.
- `DelayCommand` is attached to an object that may be destroyed before the delayed action runs.
- `ExecuteScript` targets a missing/renamed script or wrong object.
- `AssignCommand` changes `OBJECT_SELF` expectations.
- Script names used only by string references are omitted from packaging/review.

## Guardrails

- Do not claim NWScript correctness without compile context and event ownership.
- Do not write a server system without stating where state lives and how it is reset/migrated.
- Do not rely on client/UI state for authority; validate server-side in event handlers.
- Do not use heartbeat loops as a default architecture.
- Do not promote forum/model snippets into references unless they are compiled and runtime-tested.

## Sources

- NWNWiki/Fandom NWScript: https://nwn.fandom.com/wiki/NWScript
- NWNWiki/Fandom `OBJECT_SELF`: https://nwn.fandom.com/wiki/OBJECT_SELF
- NWN Lexicon Events: https://nwnlexicon.com/Category%3AEvents
- NWN Lexicon Module Events: https://nwnlexicon.com/Category%3AModule_Events
- NWN Lexicon `OnModuleLoad`: https://nwnlexicon.com/OnModuleLoad
- NWN Lexicon `ExecuteScript`: https://nwnlexicon.com/ExecuteScript
- NWN Lexicon `DelayCommand`: https://nwnlexicon.com/DelayCommand
- NWN Lexicon `AssignCommand`: https://nwnlexicon.com/AssignCommand
