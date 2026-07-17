# Server Gamedev Capability Map

Use this map when a request crosses multiple NWN server domains or when the correct reference set is unclear.

## Source Status

- `docs-verified`: routing uses the local skill references and source registry in this package.
- `project-specific`: escalation choices are release-policy guidance for this skill pack, not Codex product guarantees.
- `runtime-tested`: required before claiming any feature works in a target module/server.

## Task Routing Matrix

| Server task | Read first | Then read when needed | Expected artifact | Minimum evidence label |
| --- | --- | --- | --- | --- |
| New server concept, ruleset, scope, or roadmap | `concept-and-scope.md` | `testing-runtime-qa.md`, `common-antipatterns.md` | Server pillar spec, risk list, staged build plan | `design-only` |
| Area, dungeon, town, transition graph, or tileset plan | `locations-areas-tilesets.md` | `creatures-encounters-ai.md`, `quests-dialogues-journal.md`, `testing-runtime-qa.md` | Area spec, transition table, encounter placement, QA checklist | `design-only` until Toolset/client verified |
| Item, loot, shop, active item, or equipment design | `items-equipment-loot.md` | `economy-crafting-progression.md`, `nwscript-events-systems.md`, `testing-runtime-qa.md` | Blueprint/property plan, event hooks, economy impact, QA checklist | `design-only` or `static-checked` until in-game tested |
| Creature, encounter, spawn, faction, or AI behavior | `creatures-encounters-ai.md` | `items-equipment-loot.md`, `economy-crafting-progression.md`, `testing-runtime-qa.md` | Creature/encounter spec, AI event plan, reward policy, balance tests | `design-only` until encounter runtime tested |
| 2DA, TLK, HAK, custom content, or NWSync delivery | `two-da-hak-tlk-pipeline.md` | `deployment-nwsync-ops.md`, `testing-runtime-qa.md` | Row ownership plan, TLK range, HAK/NWSync package, rollback plan | `static-checked` until clean-client download tested |
| NWScript event system, include, hook, or review | `nwscript-events-systems.md` | `testing-runtime-qa.md`, `common-antipatterns.md` | Event ownership table, script plan/code, compile/runtime proof checklist | `static-checked` after compile; `runtime-tested` after logs/client proof |
| NUI panel, player UI, DM tool, or bind/event flow | `nui-player-ui.md` | `nwscript-events-systems.md`, `items-equipment-loot.md`, `testing-runtime-qa.md` | Window tree, bind table, event lifecycle, close/refresh behavior, QA plan | `design-only` until opened and interacted with in client |
| Quest, dialogue, journal, token, or reward flow | `quests-dialogues-journal.md` | `persistence-database-nwnx.md`, `economy-crafting-progression.md`, `testing-runtime-qa.md` | State machine, conversation branch table, journal/reward plan, interruption tests | `design-only` until multiplayer/runtime path tested |
| Economy, crafting, XP, progression, or balance loop | `economy-crafting-progression.md` | `items-equipment-loot.md`, `persistence-database-nwnx.md`, `testing-runtime-qa.md` | Source/sink table, progression curve, exploit tests, telemetry plan | `design-only` until representative runtime/telemetry tested |
| Persistence, database, restart safety, or NWNX integration | `persistence-database-nwnx.md` | `deployment-nwsync-ops.md`, `testing-runtime-qa.md` | State inventory, schema/key plan, migration/backup/restore plan | `static-checked` until restart/rollback tested |
| Deployment, backup, server config, NWSync ops, or release | `deployment-nwsync-ops.md` | `two-da-hak-tlk-pipeline.md`, `testing-runtime-qa.md` | Deployment checklist, settings plan, backup/rollback, clean-client test | `static-checked` until staged deployment tested |
| Skill feedback, contribution, or knowledge promotion | `feedback-and-versioning.md` | `source-registry.md`, `testing-runtime-qa.md` | Feedback record, evidence classification, promotion/release decision | `unverified` until reviewed; `docs-verified` or `runtime-tested` after evidence |

## Output Contract For Multi-Domain Tasks

Return:

1. Domain classification.
2. References read or required.
3. Missing project facts.
4. Proposed artifact or patch plan.
5. Verification ladder from `design-only` to `runtime-tested`.
6. Exact blockers and evidence labels.
7. Feedback record recommendation when a reusable lesson appears.

For full feature design requests, use `feature-design-output-template.md` to structure the answer after reading the relevant domain references.

## Full Feature Slice Coverage

When the user asks for a server feature, adventure arc, dungeon, system, or module expansion rather than a narrow file edit, perform a minimum cross-domain sweep before calling the plan complete:

- `locations`: areas, tilesets, transitions, placeables, walkmesh risk, and player route.
- `items`: loot, rewards, shops, usable items, item properties, and economy impact.
- `creatures`: blueprints, factions, spawns, AI events, encounter pacing, and reward balance.
- `2da-hak-tlk`: row ownership, custom content references, TLK strings, HAK/NWSync delivery, and rollback.
- `nwscript`: event ownership, include boundaries, compile path, runtime logs, and failure handling.
- `nui`: window lifecycle, binds, event payloads, refresh/reopen behavior, and player-close behavior.
- `quests`: dialogue, journal state, tokens, branching, interruptions, and multiplayer state.
- `economy`: XP, gold, crafting materials, sinks, sources, exploits, and progression curve.
- `persistence`: saved state, database keys, restart safety, migrations, backups, and rollback.
- `deployment`: server config, clean-client/NWSync test, staged release, monitoring, and operator checklist.
- `testing`: Toolset/client/server/log evidence ladder from `design-only` through `runtime-tested`.

Mark domains as `out-of-scope` only when the reason is explicit. Do not let a script, NUI mockup, or content table stand in for the whole server slice unless the user asked for that narrow artifact.

## Escalation Decision Guide

- Stay with the skill when the task is design guidance, review, reference routing, QA planning, or script/data planning.
- Use the plugin package when another person should install the same skill and references in Codex.
- Use workflow tooling when freshness, packaging, validation, or release gates must be deterministic.
- Use a repo template when builders need a starter module repository, directory layout, CI, sample scripts, or repeatable project scaffolding.
- Use MCP when Codex must query or mutate live tools such as issue trackers, NWN build services, databases, asset indexes, or a hosted knowledge intake service.
- Use docs/RAG when reviewed knowledge becomes too large or fast-changing for compact skill references.
- Use direct runtime/toolset work when the claim depends on actual NWN module, Toolset, client, server, log, or NWSync behavior.

## Guardrails

- Do not read every reference by default; route narrowly, then expand when the task crosses domains.
- Do not call a multi-domain design complete without a verification ladder.
- Do not turn an installed skill user's private findings into official guidance without reviewed feedback and a new release.
- Do not escalate to MCP, RAG, or repo-template only because the task is complex; escalate when a documented bottleneck requires that architecture.
