# Local Aurora Small Location Live Operator Checklist

## Purpose

Provide a live Toolset verification checklist for the local Aurora atom sequence found in `local-aurora-symbol-index.md` and compared in `local-aurora-skill-reference-gap-analysis.md`.

Evidence label before completion: `local-reverse-lead`.

Promotion target after successful live review: compact `runtime-tested` or `toolset-observed` guidance for future skill references.

This checklist is not installed skill content. It is a maintainer/operator capture sheet for converting local reverse-engineering leads into reviewed, compact, evidence-backed authoring guidance.

## Operator Rules

- Use a throwaway module or disposable branch/copy.
- Record exact Toolset version, NWN:EE version, module path, and HAK/TLK/NWSync dependencies.
- Capture a screenshot or short note for every dialog/palette step.
- Save the module after each major atom where possible.
- If the Toolset throws an error, copy the exact text and stop promoting that atom until reproduced or explained.
- Do not mark any atom `runtime-tested` from Toolset UI alone; run the area in a client/server path when the claim depends on playability.
- Do not copy raw decompilation or private module data into the future skill.

## Session Header

| Field | Value |
| --- | --- |
| Operator |  |
| Date/time |  |
| Toolset version |  |
| NWN:EE version |  |
| Module path or copy id |  |
| HAK list |  |
| Custom TLK |  |
| Local reverse index version/date |  |
| Screenshots folder |  |
| Log folder |  |
| Final evidence label | `local-reverse-lead` until reviewed |

## Minimum Proof Bundle

Collect:

- Toolset screenshots for area creation, area properties, palette source/family, placed objects, transition dialog, trigger/sound/script/module setup, and successful build.
- Saved module evidence: timestamp, changed file list, or module backup path.
- Client/server evidence: character start point, traversal, doors/transitions, trigger firing, sound/object visibility, item access, creature behavior, and logs.
- Failure evidence: exact Toolset/client/server message, screenshot, and reproduction step.

Machine-readable capture:

- Use `docs/nwn-skill-pack/aurora-live-operator-execution-packet.md` to prepare capture folders, copy the template, and keep evidence labels honest.
- Prefer `docs/nwn-skill-pack/tools/init_aurora_live_record.py` for creating the dated JSON record; it keeps all atoms `not-run` until the operator fills evidence.
- Start from `docs/nwn-skill-pack/knowledge-inbox/templates/aurora-toolset-live-record-template.json`.
- Validate a filled record with:
  `python docs\nwn-skill-pack\tools\aurora_toolset_live_record.py validate path\to\aurora-live-record.json`.
- Aggregate one or more records with:
  `python docs\nwn-skill-pack\tools\aurora_toolset_live_record.py aggregate path\to\records --out path\to\aggregate.md`.
- Generate a reviewed-promotion draft from promotion-ready atoms with:
  `python docs\nwn-skill-pack\tools\generate_aurora_toolset_promotion_proposal.py docs\nwn-skill-pack path\to\aurora-live-record.json --out docs\nwn-skill-pack\knowledge-inbox\reference-promotion-proposals\aurora-live-record.md --maintainer <name>`.
- Schema reference: `docs/nwn-skill-pack/knowledge-inbox/schema/aurora-toolset-live-record.schema.json`.

## First Live Record Seed

Use this seed for the next operator pass after the 2026-06-19T08:19:16Z fresh
thread probe confirmed there is no new passive batch beyond Worker 5 batch82.
The goal is one disposable small-location record, not a full Toolset taxonomy.

Prepare the record, evidence manifest, and evidence folders before opening the
Toolset:

```powershell
python docs\nwn-skill-pack\tools\prepare_aurora_live_session.py docs\nwn-skill-pack --operator <name> --scenario small-location-first-pass --date YYYYMMDD --toolset-version <toolset-version> --nwn-version <nwn-version> --module-path-or-copy-id <disposable-module-copy> --candidate-reference draft-skills/nwn-server-gamedev/references/locations-areas-tilesets.md --candidate-reference draft-skills/nwn-server-gamedev/references/items-equipment-loot.md --candidate-reference draft-skills/nwn-server-gamedev/references/creatures-encounters-ai.md --candidate-reference draft-skills/nwn-server-gamedev/references/nwscript-events-systems.md --candidate-reference draft-skills/nwn-server-gamedev/references/feature-design-output-template.md
```

This first-pass command intentionally includes five candidate references:
locations/areas, items/loot, creatures/encounters, NWScript/events, and the
feature-design output template. Do not remove the creature reference while the
first pass includes creature placement or creature script-event atoms.

Promotion-critical atoms for the first pass:

- `area.createWithWizard`
- `palette.switchBlueprintSource`
- `palette.selectObjectFamilyByIcon`
- `placeable.editBlueprintOrInstance`
- `inventory.insertItem`
- `creature.editBlueprintOrInstance`
- `door.linkAreaTransition` or `area.placeStartLocation`
- `toolset.buildAndClientRun`

Defer these until the first pass returns either useful evidence or an exact
blocker:

- encounter setup,
- faction editor/selector,
- store setup wizard,
- generic resource picker,
- sound resource picker,
- trigger trap/script details.

First-pass promotion rule: at least one core atom must have redacted artifact
evidence, an honest evidence label, save/reopen or exact blocker notes, and no
raw decompilation text before a reference-promotion proposal is generated. If
runtime behavior is claimed, `toolset.buildAndClientRun` must also have
client/server/log evidence.

## Prioritized Pass From Local Crosswalks

Use this run order when converting the local Aurora UI/symbol crosswalks into live Toolset evidence:

- `docs/nwn-skill-pack/local-aurora-ui-symbol-crosswalk-2026-06-18.md`
- `docs/nwn-skill-pack/local-aurora-object-terrain-symbol-crosswalk-2026-06-18.md`

These crosswalks are routing aids, not proof. Treat their lead classes separately from status values:

- `screen-backed`: a passive screenshot/UI lead plus a local symbol lead. Record it as `observed-toolset` only after a live Toolset observation, and never as `runtime-tested` until client/server/log evidence exists.
- `symbol-only`: a local reverse symbol lead without a matching original/passive UI screen in that crosswalk row. Capture the UI route and visible fields first, then decide whether it belongs in the live run.

## Minimum First Live Pass

Use this short pass when the maintainer wants the smallest useful disposable
module instead of the full atom matrix. Keep every row `local-reverse-lead`
until the operator returns screenshots/logs and the reviewed live record allows
promotion.

| Order | Atom | Why it is first | Required return evidence |
| --- | --- | --- | --- |
| 1 | `area.createWithWizard` | Establishes the module's first playable location. | Wizard route, tileset/size/name if visible, opened area, save/reopen note. |
| 2 | `palette.switchBlueprintSource` and `palette.selectObjectFamilyByIcon` | Tests the shared palette operation shown by Worker 5 batch82 before content placement. | Screenshot or note for Standard/Custom state, family icon mapping, and any locked/empty state. |
| 3 | `area.paintTerrainOrTile` or `area.inspectMainViewport` | Proves basic area editing before object work. | Tile/group or viewport evidence plus saved module state. |
| 4 | `placeable.createOrEditContainer` plus `inventory.insertItem` | Gives the location a concrete loot/container workflow. | Placeable/container properties, inventory dialog, item inserted, save/reopen, client access or exact blocker. |
| 5 | `creature.placeFromPalette` plus `creature.editScriptEvents` if visible | Adds a minimal NPC or monster anchor for later conversation/script work. | Creature placement, faction/basic/scripts tab evidence, save/reopen, spawn or exact blocker. |
| 6 | `door.linkAreaTransition` or `area.placeStartLocation` | Gives the pass a navigation/spawn proof path. | Transition/start target fields, build result, client traversal/login spawn or exact blocker. |
| 7 | `toolset.buildAndClientRun` | Separates Toolset observation from runtime proof. | Build output, client/server route, clean logs or exact blocker. |

If this pass fails, do not expand into encounter, store, faction, resource
picker, or sound rows yet. Record the exact blocker and repeat the smallest
failed atom first.

Track A: screen-backed first pass.

| Priority | Crosswalk atom(s) | Existing checklist target | Live capture focus |
| --- | --- | --- | --- |
| 1 | `area.createWithWizard`, `area.paintTerrainOrTile`, `area.inspectMainViewport` | Steps 1, 2, 17 | Area wizard route, tileset/terrain/tile paint path, viewport state, save/reopen, and build/run evidence for runtime claims. |
| 2 | `palette.switchBlueprintSource`, `palette.selectObjectFamilyByIcon`, `palette.unlockOrRefreshState`, `itemPalette.openCategory` | Steps 3, 4, 7 | Palette source/family/category controls, locked/refresh/empty state, visible labels/tooltips, and selected object family. |
| 3 | `item.editBlueprint`, `item.editBlueprintProperties`, `inventory.insertItem` | Steps 6, 7 | Item category path, blueprint edit dialog, property persistence, and target inventory insertion. |
| 4 | `script.createEditSearch`, `script.openFullEditor`, `script.launchEditorFromProperty` | Steps 8, 11, 13, 14, 15 | Script editor/search/compile route, event-slot launch path, compile output, and runtime event owner proof. |
| 5 | `creature.editBlueprintOrInstance`, `creature.editScriptEvents` | Step 8 | Creature blueprint/instance split, Scripts tab/event fields, conversation and inventory links, and save/reopen behavior. |
| 6 | `conversation.editAndTest`, `conversation.openEditor` | Step 13 | Conversation editor route, node edit/test/search controls, owner link, and client conversation proof. |
| 7 | `module.buildModuleFromToolset`, `toolset.buildAndClientRun` | Steps 15, 16, 17 | Module build output, start area/client run path, custom content loading, and clean or exact-blocker logs. |

Track B: symbol-led second pass.

| Priority | Crosswalk atom(s) | Existing checklist target | Live capture focus |
| --- | --- | --- | --- |
| 8 | `door.createOrEdit`, `door.linkAreaTransition` | Steps 9, 10 | Door wizard/edit route, lock/open/script fields, transition dialog, arrival target, return path if intended. |
| 9 | `trigger.createOrEdit`, `trigger.inspectScriptsAndTrap` | Step 11 | Trigger wizard/edit route, geometry drawing, type/trap fields, OnEnter/OnExit/OnTrapTriggered script slots, and runtime firing proof. |
| 10 | `resource.openGenericPicker`, `sound.openResourcePicker`, `sound.createOrEditPlacedSound` | Steps 12, 16 | Generic and sound-specific resource picker routes, selected resource persistence, area/loop/random/volume fields, and audio or exact blocker evidence. |
| 11 | `placeable.createOrEditContainer` | Steps 5, 6 | Placeable wizard/edit route, container/usable/static flags, scripts, inventory access, and client interaction. |
| 12 | `store.configureMerchant`, `store.runSetupWizard` | Steps 6, 15 | Store/merchant setup wizard, inventory relation, buy/sell fields, open-store event slots, and client transaction proof. |
| 13 | `waypoint.createOrEdit` | Steps 10, 15 | Waypoint route, tag/location/orientation behavior, transition/start helper role. Record as a helper sub-atom unless live evidence proves standalone value. |
| 14 | `faction.editOrSelect` | Step 8 | Faction editor or selector route, faction list/name/reputation fields, creature/encounter ownership, and client hostility or reputation proof. |
| 15 | `encounter.createOrEdit` | Steps 8, 11, 15 | Encounter wizard/edit route, creature list, spawn points, faction/reset behavior, event scripts, build checks, and runtime spawn proof. |

Do not promote a symbol-only row into reference guidance until the operator has captured the Toolset UI route, save/reopen behavior, and build/client evidence when the claim affects runtime behavior.

## Atom Checklist

| Step | Atom | Toolset observation to capture | Pass evidence | Stop condition |
| --- | --- | --- | --- | --- |
| 1 | `area.createWithWizard` | Wizard entry path, tileset choice, size, name/resref/tag fields if shown. | New area exists, opens, saves, and appears in module area list. | Wizard path unknown, area cannot save/open, or tileset dependency missing. |
| 2 | `area.editProperties` | Area properties tabs/fields: name/tag/resref, lighting, music/sound/weather, scripts, PvP/rest/map options if present. | Changed properties persist after save/reopen. | Field meaning is unclear enough to risk bad guidance. |
| 3 | `palette.switchBlueprintSource` | Standard/custom source tabs or equivalent palette source control. | Operator can switch source and record selected state. | Palette source cannot be identified or differs by family. |
| 4 | `palette.selectObjectFamilyByIcon` | Icon/family mapping for creatures, items, placeables, doors, triggers, sounds, merchants/stores if present. | Screenshot maps visible icon/family names or tooltips. | Icon mapping remains speculative. |
| 5 | `placeable.editBlueprintOrInstance` | Blueprint selection, placed instance properties, usable/container/static flags, scripts, inventory access if any. | Placeable appears in area, saves/reopens, and expected properties persist. | Placeable cannot be selected, placed, saved, or reopened. |
| 6 | `inventory.insertItem` | Inventory UI for creature/placeable/merchant/container, item category path, insertion gesture, stack/quantity fields if present. | Item appears in target inventory after save/reopen and in client if target is accessible. | Item template missing, inventory owner has no inventory, or insertion behavior is unclear. |
| 7 | `item.editBlueprint` | Item palette category, item edit dialog, resref/tag/name/base item/properties/identified state. | Item blueprint saves and can be placed/granted/accessed as intended. | Blueprint cannot save, model/icon missing, or properties do not persist. |
| 8 | `creature.editBlueprintOrInstance` | Creature palette category, blueprint vs placed instance fields, faction, scripts, inventory, conversation, spawn/orientation. | Creature appears in area and has expected faction/scripts/inventory after save/reopen. | Creature cannot spawn or causes missing model/resource errors. |
| 9 | `door.editBlueprintOrInstance` | Door palette category, placed door instance, lock/open flags, scripts, linked destination fields if present. | Door appears, saves/reopens, opens or blocks as designed. | Door model missing, door cannot be interacted with, or fields are ambiguous. |
| 10 | `door.linkAreaTransition` | Area transition dialog fields: destination type, target area, target type, connection type, target object/tag/destination. | Player transitions through the door or trigger to the intended target and can return if intended. | Arrival target wrong, orientation wrong, transition one-way unintentionally, or target missing. |
| 11 | `trigger.editBlueprintOrInstance` | Trigger palette/edit flow, geometry drawing, generic/transition/trap type, OnEnter/OnExit/OnClick scripts. | Trigger fires expected script in client/server logs with correct `OBJECT_SELF` assumption. | Script owner/object context cannot be proven. |
| 12 | `sound.editPlacedSound` | Sound palette/edit flow, sound set/resource picker, area/loop/random/volume fields if present. | Sound object saves/reopens and client audio/log behavior is observed or exact blocker recorded. | Audio cannot be verified and no Toolset/resource proof exists. |
| 13 | `conversation.editAndTest` | Conversation editor path, node editing, condition/action script slots, test/search affordances. | Conversation opens from the intended NPC/placeable/door/trigger and selected branch works. | Conversation owner or script slot cannot be identified. |
| 14 | `script.createEditSearch` | Script editor/wizard/search path, compile button/output, include dependency behavior. | Script compiles and runtime log proves the intended event path. | Compile path unknown, script fails, or runtime owner not proven. |
| 15 | `module.configureEventsAndEntry` | Module properties for start area/location and event scripts including NUI/tile/item/chat/death/rest hooks if present. | New character or test character enters intended start area and module events do not produce unexpected logs. | Start point invalid, module event route unclear, or module scripts conflict. |
| 16 | `customContent.verify2daHakTlkLoad` | HAK/TLK list, 2DA/model/resource load behavior, any Toolset error messages. | Toolset opens/builds with dependencies and client sees required assets. | Missing `dialog.tlk`, 2DA, model, HAK, or resource error. |
| 17 | `toolset.buildAndClientRun` | Toolset build output plus client/server run path. | Area is walkable, transitions work, creature/placeable/item/sound/script behavior is observed, logs are clean or blockers exact. | Toolset-only proof is the only proof for a runtime claim. |
| 18 | `resource.openGenericPicker` | Generic resource picker route, resource family/filter controls, owner field or launching dialog, and selected resref/resource type. | Selected resource persists after save/reopen/build in the owning field. | Resource family, owner context, or selected resource persistence cannot be proven. |
| 19 | `sound.openResourcePicker` | Sound-specific resource picker route, preview/play controls if present, selected sound resource, and relation to placed sound fields. | Sound resource persists after save/reopen and preview/client audio works or an exact blocker is recorded. | No resource proof exists, audio cannot be verified, or preview/client paths conflict. |
| 20 | `faction.editOrSelect` | Faction editor/selector route, faction list/name, reputation matrix/global fields if present, and creature/encounter assignment path. | Faction selection persists and affects creature/encounter behavior in client/log evidence. | Hostility/reputation behavior is not proven or faction route differs by Toolset/module context. |
| 21 | `encounter.createOrEdit` | Encounter wizard/edit route, creature list, spawn point placement, reset/spawn behavior, faction fields, and OnEnter/OnExit script slots. | Encounter saves/reopens/builds and runtime spawn/enter/exit behavior is proven or blocked exactly. | Spawn points, owner context, or encounter build/runtime behavior cannot be proven. |
| 22 | `store.runSetupWizard` | Store setup wizard route, merchant/store inventory, buy/sell/identify fields if present, and OnOpenStore/OnStoreClosed scripts. | Store saves/reopens and a client transaction or exact open-store blocker is captured. | Transaction behavior or open-store script owner cannot be proven. |

## Evidence Capture Rows

Use one row per atom while testing.

| Atom | Status | Screenshot/log path | Exact observation | Evidence label | Re-test needed |
| --- | --- | --- | --- | --- | --- |
| `area.createWithWizard` |  |  |  |  |  |
| `area.editProperties` |  |  |  |  |  |
| `palette.switchBlueprintSource` |  |  |  |  |  |
| `palette.selectObjectFamilyByIcon` |  |  |  |  |  |
| `placeable.editBlueprintOrInstance` |  |  |  |  |  |
| `inventory.insertItem` |  |  |  |  |  |
| `item.editBlueprint` |  |  |  |  |  |
| `creature.editBlueprintOrInstance` |  |  |  |  |  |
| `door.editBlueprintOrInstance` |  |  |  |  |  |
| `door.linkAreaTransition` |  |  |  |  |  |
| `trigger.editBlueprintOrInstance` |  |  |  |  |  |
| `sound.editPlacedSound` |  |  |  |  |  |
| `conversation.editAndTest` |  |  |  |  |  |
| `script.createEditSearch` |  |  |  |  |  |
| `module.configureEventsAndEntry` |  |  |  |  |  |
| `customContent.verify2daHakTlkLoad` |  |  |  |  |  |
| `toolset.buildAndClientRun` |  |  |  |  |  |
| `area.paintTerrainOrTile` |  |  |  |  |  |
| `area.inspectMainViewport` |  |  |  |  |  |
| `palette.unlockOrRefreshState` |  |  |  |  |  |
| `itemPalette.openCategory` |  |  |  |  |  |
| `item.editBlueprintProperties` |  |  |  |  |  |
| `script.openFullEditor` |  |  |  |  |  |
| `script.launchEditorFromProperty` |  |  |  |  |  |
| `creature.editScriptEvents` |  |  |  |  |  |
| `conversation.openEditor` |  |  |  |  |  |
| `module.buildModuleFromToolset` |  |  |  |  |  |
| `door.createOrEdit` |  |  |  |  |  |
| `trigger.createOrEdit` |  |  |  |  |  |
| `trigger.inspectScriptsAndTrap` |  |  |  |  |  |
| `resource.openGenericPicker` |  |  |  |  |  |
| `sound.createOrEditPlacedSound` |  |  |  |  |  |
| `sound.openResourcePicker` |  |  |  |  |  |
| `placeable.createOrEditContainer` |  |  |  |  |  |
| `store.configureMerchant` |  |  |  |  |  |
| `store.runSetupWizard` |  |  |  |  |  |
| `waypoint.createOrEdit` |  |  |  |  |  |
| `faction.editOrSelect` |  |  |  |  |  |
| `encounter.createOrEdit` |  |  |  |  |  |

Allowed status values:

- `not-run`
- `observed-toolset`
- `static-checked`
- `compiled`
- `runtime-tested`
- `blocked`
- `rejected`

## Skill Promotion Decision

Promote an atom into the draft skill only when:

- the operator filled the evidence row,
- the observation is compact enough to be useful in a skill reference,
- the guidance does not include raw decompilation text,
- the evidence label is not overstated,
- the reviewed live record atom can be marked `review.promotion_ready=true`,
- the atom improves a realistic NWN server builder workflow.

Suggested promotion targets:

- `locations-areas-tilesets.md`: area wizard, area properties, palette/source/family, placeables, doors, transitions, triggers, sounds, client traversal proof.
- `items-equipment-loot.md`: item palette category, item blueprint edit, inventory insertion, inventory-bearing object checks.
- `creatures-encounters-ai.md`: creature blueprint vs placed instance split, faction assignment, encounter setup, and spawn behavior if live-tested.
- `quests-dialogues-journal.md`: conversation editor/test/search if location quests are included.
- `nwscript-events-systems.md`: Toolset script edit/search/compile operator path if confirmed.
- `feature-design-output-template.md`: module entry point, module event slots, and custom resource-picker dependency notes if confirmed.
- New optional `aurora-toolset-operation-taxonomy.md`: compact cross-domain atom map if enough atoms are confirmed.

## Still Hypothesis

- The atom names come from local symbol and screen leads, not live operator proof yet.
- Some Toolset fields may differ by NWN version, module type, installed content, HAKs, or EE/community patches.
- The exact save-file or GIT mutation behavior is not proven by this checklist alone.
- Audio, model, 2DA, HAK, and TLK errors need exact environment capture before becoming general guidance.
- Faction, encounter, resource picker, sound resource picker, store setup wizard, and trigger trap/script rows are still symbol-led until a screen or live record confirms the route and fields.
- The machine-readable live record template intentionally remains on the smaller core atom set until these symbol-led rows receive enough evidence to justify schema expansion.

## Next Maintainer Step

Run this checklist once on a disposable module, prioritizing the symbol-led backlog from the recovered `019ed62e` cursor chain: trigger geometry/properties, faction editor, encounter setup, store setup wizard, generic resource picker, and sound resource picker. Convert filled evidence rows into a reviewed reference-promotion proposal before editing the draft skill references.

For the targeted second-pass backlog, use
`docs/nwn-skill-pack/local-aurora-live-gap-queue.md` after the
`small-location-first-pass` record returns enough evidence or an exact blocker.
