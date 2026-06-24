# Creatures, Encounters, AI

## Source Status

- `docs-verified`: NWNWiki/Fandom Creature, Encounter, Challenge Rating, and Faction pages for builder/game-rule structure.
- `docs-verified`: NWN Lexicon Creature Events, Encounter Events, OnSpawn, OnDeath, OnPerception, CreateObject, SetSpawnInCondition, and DetermineCombatRound pages for script/runtime behavior.
- `docs-verified`: NWNX:EE Creature docs for NWNX-only creature property access and mutation.
- `runtime-tested`: required before claiming a creature, encounter, AI script, reward, or respawn loop is balanced or live-safe.

## What This Domain Controls

Creature blueprints, factions, challenge pacing, spawn systems, encounter objects, spawn points, AI scripts, perception behavior, combat behavior, loot, XP, death/cleanup behavior, respawn cadence, encounter reset logic, and creature-side state.

## Source-Backed Facts To Preserve

- A creature is a mobile object with a creature-specific event set.
- Creatures represent animals, monsters, humanoids, undead, constructs, and other beings.
- Each creature belongs to a faction; faction relations affect friendliness/hostility before personal reputation is considered.
- Personal reputation can modify reactions beyond base faction setup.
- Challenge Rating is a rough creature-power indicator and can be viewed by examining a creature.
- CR is not sufficient for balance on its own because equipment, builds, party composition, server rules, and local vault behavior can dominate difficulty.
- An encounter object causes creatures to spawn when a PC enters a specified area region.
- Encounter objects can replace high-overhead placed creatures until needed and can optionally respawn groups for repeatable content.
- Encounters can scale spawned creatures to the triggering character or party when configured properly.
- Encounter spawn points determine where spawned creatures appear; without spawn points they spawn around the triggering character.
- Creature event categories include OnBlocked, OnCombatRoundEnd, OnConversation, OnDamaged, OnDeath, OnDisturbed, OnHeartbeat, OnPerception, OnPhysicalAttacked, OnRested, OnSpawn, OnSpellCastAt, and OnUserDefined.
- Encounter event categories include OnEnter, OnExhausted, OnExit, OnHeartbeat, and OnUserDefined.
- OnSpawn fires when a creature is created, either by script or at module start, and is used for default behavior setup.
- Bioware default OnSpawn behavior can set up treasure and enabled spawn options.
- SetSpawnInCondition writes spawn flags to a local integer on `OBJECT_SELF`; this is creature-local AI state.
- OnPerception fires only when a creature's heard/seen state changes relative to another creature.
- OnPerception can fire for non-PC creatures and teleport/corpse disappearance cases, so do not assume the perceived object is a PC.
- Creature perception ranges are backed by `ranges.2da`; raising ranges globally can have side effects.
- DetermineCombatRound is the generic include's master combat decision function and inspects spellcasting and other possible NPC actions.
- OnDeath can be used for treasure, respawn, or spawning follow-up creatures; `DestroyObject` does not fire OnDeath.
- `GetLastKiller` from OnDeath has edge cases and must be tested for traps, dead killers, and invalid killer cases.
- `CreateObject` can spawn creatures from a palette resref at a location.
- `CreateObject` returns the created object and cannot be passed directly to `DelayCommand`; use a void wrapper such as `CreateObjectVoid`.
- A creature created with `CreateObject` runs OnSpawn after the current script finishes, so follow-up commands can be overwritten by OnSpawn unless delayed/ordered intentionally.
- Creating creatures from an area OnEnter event without checking the entering object can cause recursive creation loops.
- NWNX:EE Creature functions expose additional creature properties and mutation functions; this is NWNX-only and not vanilla NWN.

## Design Questions

- What role does the creature serve: ambient, common enemy, elite, boss, vendor, quest NPC, faction actor, patrol, guard, summon, companion, or scripted set piece?
- Is the creature placed, encounter-spawned, script-spawned, instanced, respawned, or manually DM-spawned?
- What is the target party size, level range, gear assumption, and server ruleset?
- What faction and personal reputation behavior should players see?
- What is the intended perception behavior: ambush, patrol, guard response, stealth detection, social bark, flee, or ignore?
- What scripts own OnSpawn, OnPerception, OnDamaged, OnPhysicalAttacked, OnDeath, OnHeartbeat, and OnUserDefined?
- What reward lane is intended: default treasure, custom OnDeath loot, XP only, quest item, persistent flag, faction change, or no reward?
- What happens on death, despawn, reset, server restart, party wipe, and repeated farming?
- Does any behavior require NWNX Creature functions, or must it work in vanilla NWN?
- What evidence proves the creature/encounter works: Toolset properties, compile logs, in-game combat, server logs, repeated respawn test, party test, or balance notes?

## Implementation Path

1. Define role, level band, party assumption, faction, reward lane, and evidence label.
2. Choose blueprint/appearance/stats/equipment/feats/spells/scripts/conversation.
3. Decide placement model: placed creature, encounter object, scripted `CreateObject`, or NWNX/custom spawn system.
4. If using an encounter object, define trigger region, spawn list, spawn points, scaling, reset/respawn, and exhausted behavior.
5. If using scripted spawn, define resref, location source, duplicate prevention, cleanup, and delayed action ordering.
6. Define event ownership for OnSpawn, perception/combat events, OnDeath, and custom user-defined hooks.
7. Label AI approach: default generic AI, spawn flags, custom event scripts, custom includes, or NWNX-specific behavior.
8. Define loot/XP/faction/persistence side effects and anti-farm constraints.
9. Test single-player route, multiplayer/party route if relevant, repeated respawn, death cleanup, rewards, and nearby content impact.

## Recommended Output Shape

For creature/encounter/AI tasks, produce:

1. Creature/encounter purpose and role.
2. Blueprint/stat/faction/reward table.
3. Spawn model and reset rules.
4. Event/script ownership table.
5. AI/perception/combat behavior plan.
6. Reward and persistence side effects.
7. Runtime QA checklist.
8. Evidence label and exact blockers.

## Runtime Verification

Check at least:

- creature blueprint compiles/saves and appears with expected appearance;
- faction/reputation produces intended hostile/friendly/neutral behavior;
- OnSpawn runs once per spawn and sets intended spawn flags/state;
- OnPerception does not fire unwanted social/combat behavior for non-PCs, corpses, summons, or teleport edge cases;
- encounter trigger spawns at intended spawn points and scales/resets as designed;
- scripted spawn does not duplicate endlessly from OnEnter or heartbeat loops;
- AI attacks, casts, flees, patrols, converses, or idles as designed;
- OnDeath rewards, cleanup, respawn, and persistence side effects fire once;
- CR/difficulty is checked with a real party or representative test character;
- repeated farming/reset behavior does not break economy, XP, or area state;
- NWNX-only creature calls are guarded by runtime/plugin dependency checks.

## Guardrails

- Do not treat CR as a complete balance proof.
- Do not assume OnPerception target is a PC.
- Do not overwrite default AI behavior accidentally unless replacing it intentionally.
- Do not use area OnEnter spawning without checking what entered and preventing duplicate loops.
- Do not put reward logic only on spawn when player/party/context matters at death.
- Do not use NWNX Creature functions without labeling the runtime dependency.
- Do not claim encounter scaling works without testing triggering party/level cases.
- Do not design respawns without anti-farm, cleanup, and server restart behavior.

## Sources

- NWNWiki/Fandom Creature: https://nwn.fandom.com/wiki/Creature
- NWNWiki/Fandom Encounter: https://nwn.fandom.com/wiki/Encounter
- NWNWiki/Fandom Challenge Rating: https://nwn.fandom.com/wiki/Challenge_rating
- NWNWiki/Fandom Faction: https://nwn.fandom.com/wiki/Faction
- NWN Lexicon Creature Events: https://nwnlexicon.com/Category%3ACreature_Events
- NWN Lexicon Encounter Events: https://nwnlexicon.com/Category%3AEncounter_Events
- NWN Lexicon OnSpawn: https://nwnlexicon.com/OnSpawn
- NWN Lexicon OnDeath: https://nwnlexicon.com/OnDeath
- NWN Lexicon OnPerception: https://nwnlexicon.com/OnPerception
- NWN Lexicon CreateObject: https://nwnlexicon.com/CreateObject
- NWN Lexicon SetSpawnInCondition: https://nwnlexicon.com/SetSpawnInCondition
- NWN Lexicon DetermineCombatRound: https://nwnlexicon.com/DetermineCombatRound
- NWNX:EE Creature: https://nwnxee.github.io/unified/group__creature.html
