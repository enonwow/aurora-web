# Local Aurora Skill Reference Gap Analysis

## Purpose

Compare `docs/nwn-skill-pack/local-aurora-symbol-index.md` against the current draft `nwn-server-gamedev` skill references.

Evidence label: `local-reverse-lead`.

This is a maintainer planning artifact. It should guide future compact reference edits and live Toolset checks, not be copied directly into the installed skill.

## Inputs Read

- `docs/nwn-skill-pack/local-aurora-symbol-index.md`
- `docs/nwn-skill-pack/draft-skills/nwn-server-gamedev/SKILL.md`
- `docs/nwn-skill-pack/draft-skills/nwn-server-gamedev/references/server-gamedev-capability-map.md`
- `docs/nwn-skill-pack/draft-skills/nwn-server-gamedev/references/locations-areas-tilesets.md`
- `docs/nwn-skill-pack/draft-skills/nwn-server-gamedev/references/items-equipment-loot.md`
- `docs/nwn-skill-pack/draft-skills/nwn-server-gamedev/references/feature-design-output-template.md`

## Verified Current Coverage

The draft skill already covers broad NWN server gamedev domains:

- area and transition design,
- trigger ownership and `OBJECT_SELF` guardrails,
- Toolset and in-game verification boundaries,
- item blueprint identity, inventory fit, and item events,
- multi-domain feature output shape,
- evidence labels and stop conditions,
- NUI `OnNuiEvent` routing through the NUI reference,
- custom content Toolset-load checks through the 2DA/HAK/TLK reference.

The gap is not domain coverage. The gap is Toolset operation granularity: the current references usually say what must exist and how to verify it, but they do not yet name enough small authoring atoms for a builder who wants to make a concrete location in Aurora Toolset.

## Atom Coverage Matrix

| Local Aurora atom lead | Current coverage | Gap | Promotion action |
| --- | --- | --- | --- |
| `area.createWithWizard` | Area size, tileset, route graph, and Toolset build are covered. | No separate Toolset atom for creating an area through the wizard. | Add after live confirmation to locations reference or compact operation taxonomy. |
| `area.editProperties` | Area properties are implied by area design and NWNX-only area controls. | No explicit properties checklist for name/tag/resref, lighting, music/sound/weather, scripts, PvP/rest/map notes. | Draft live checklist from `TdlgAreaProperties`, then promote reviewed compact fields. |
| `door.editBlueprintOrInstance` | Transitions and doors are covered at design/runtime level. | No separate door blueprint vs placed door instance atom. | Add door blueprint/instance split after live Toolset validation. |
| `door.linkAreaTransition` | Area-transition semantics and `SetTransitionTarget` guardrails are covered. | No Toolset UI atom separating transition dialog from scripting/runtime transition rebinding. | Add transition authoring checklist with evidence boundary. |
| `trigger.editBlueprintOrInstance` | Trigger events and `OBJECT_SELF` are covered. | No generic trigger edit atom separate from area-transition trigger. | Add trigger atom for geometry, type, scripts, and QA. |
| `sound.editPlacedSound` | Sounds are mentioned in location domain scope. | No dedicated sound object workflow, sound-set/resource-open split, or live audio check. | Add sound object atom after live Toolset and client audio evidence. |
| `placeable.editBlueprintOrInstance` | Placeables are covered as interactables/loot surfaces. | No split between placeable blueprint edit, placed instance edit, usable/container state, scripts, and inventory. | Add placeable atom or extend location/items references. |
| `inventory.insertItem` | Inventory fit, reward granting, and item ownership are covered. | No Toolset inventory insertion atom for creature/placeable/merchant/container inventory. | Add to item/loot reference after live insertion proof. |
| `item.editBlueprint` | Item blueprint identity and properties are covered. | Toolset item palette/category and item edit dialog are not named as authoring atoms. | Add compact authoring note, not raw symbol names. |
| `item.generateLoot` | Loot/economy planning is covered. | Item generator Toolset workflow is not modeled separately from scripted loot tables. | Keep as hypothesis until a live or documented Toolset path is confirmed. |
| `creature.editBlueprintOrInstance` | Creature/encounter design exists in its reference. | Need explicit creature blueprint vs placed instance distinction in the small-location operator flow. | Compare with creature reference before promotion. |
| `conversation.editAndTest` | Dialogue/journal flow exists. | Toolset conversation editor/test/search atoms are not exposed in the main feature flow. | Add if the small-location checklist includes quest NPC dialogue. |
| `script.createEditSearch` | NWScript ownership and compile/runtime proof are covered. | Toolset script editor/search workflow is not modeled as an authoring atom. | Add only as an operator checklist item, not general NWScript truth. |
| `module.configureEventsAndEntry` | Module events, start state, and NUI module event are covered across references. | No single checklist for module entry point plus module event slots in location build tasks. | Extend feature template with module entry/event row if live workflow confirms. |
| `customContent.verify2daHakTlkLoad` | 2DA/HAK/TLK Toolset-load checks already exist. | Current reference can be strengthened with local QA error leads for model/resource failures. | Use reviewed error classes, not raw decompiled strings. |

## Small-Location Missing Atom Sequence

A future live-operator checklist for "build a small location" should cover this sequence:

1. `area.createWithWizard`
2. `area.editProperties`
3. `palette.switchBlueprintSource`
4. `palette.selectObjectFamilyByIcon`
5. `placeable.editBlueprintOrInstance`
6. `inventory.insertItem`
7. `creature.editBlueprintOrInstance`
8. `door.editBlueprintOrInstance`
9. `door.linkAreaTransition`
10. `trigger.editBlueprintOrInstance`
11. `sound.editPlacedSound`
12. `conversation.editAndTest`
13. `script.createEditSearch`
14. `module.configureEventsAndEntry`
15. Toolset build plus in-client traversal and logs.

## Proposed Reference Changes After Live Review

Do not edit the installed skill yet. After a live operator confirms enough steps:

1. Add `references/aurora-toolset-operation-taxonomy.md` with compact atom names, trigger conditions, and evidence labels.
2. Route that reference from `SKILL.md` only for Toolset authoring, location-building, or asset-placement requests.
3. Add a short Toolset authoring subsection to `locations-areas-tilesets.md` for area wizard, area properties, palette family/source, doors, transitions, triggers, sounds, and placed-object checks.
4. Add a short Toolset inventory subsection to `items-equipment-loot.md` for inventory-bearing objects and item palette category/insertion checks.
5. Add module entry/event fields to `feature-design-output-template.md` when a feature involves start location, NUI, tile action, item acquisition, player chat, death, rest, or cutscene hooks.

## Still Hypothesis

- Symbol-derived atoms are useful operation boundaries, not exact UI steps.
- The current skill references may be intentionally high-level; adding atom guidance should remain compact to protect context.
- `item.generateLoot` and some palette source/family atoms need stronger live or documented evidence before promotion.
- `TGITFile`/`CResGFF` leads suggest placed-object persistence boundaries, but exact Toolset write behavior needs controlled module tests.

## Next Step

Use `docs/nwn-skill-pack/local-aurora-small-location-live-operator-checklist.md` to run the small-location sequence in a disposable module. It should collect screenshots, exact Toolset menu/dialog observations, saved module diffs when possible, and client traversal proof without copying raw decompilation into the skill.
