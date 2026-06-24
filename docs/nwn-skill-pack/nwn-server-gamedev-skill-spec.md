# NWN Server Gamedev Skill Spec

## Skill Name

`nwn-server-gamedev`

## Purpose

Help Codex act as a practical assistant for building a Neverwinter Nights or NWN:EE server. The skill should support both design and implementation work across the whole server-development surface.

## Trigger Description Draft

```yaml
---
name: nwn-server-gamedev
description: Helps design, implement, review, and iterate Neverwinter Nights or NWN:EE server content and systems. Use when Codex is asked to work on NWN server game development, including locations and areas, items and loot, creatures and encounters, 2DA or HAK or TLK content pipelines, NWScript systems, NUI interfaces, quests, dialogue, economy, persistence, NWNX, NWSync, deployment, runtime QA, balancing, or live server operations.
---
```

## `SKILL.md` Router Outline

The main body should stay short:

```markdown
# NWN Server Gamedev

## Workflow

1. Identify the domain and read only the needed references.
2. Separate design goal, engine implementation, assets/data, scripts, persistence, and QA.
3. Prefer runtime-verifiable output over design-only claims.
4. Track evidence status.
5. Capture reusable discoveries as feedback records, not direct reference edits.

## Domain Routing

- Locations, areas, tilesets: read `references/locations-areas-tilesets.md`.
- Items, equipment, loot: read `references/items-equipment-loot.md`.
- Creatures, encounters, AI: read `references/creatures-encounters-ai.md`.
- 2DA, HAK, TLK, NWSync: read `references/two-da-hak-tlk-pipeline.md`.
- NWScript systems: read `references/nwscript-events-systems.md`.
- NUI: read `references/nui-player-ui.md`.
- Quests, dialogue, journal: read `references/quests-dialogues-journal.md`.
- Economy, crafting, progression: read `references/economy-crafting-progression.md`.
- Persistence, DB, NWNX: read `references/persistence-database-nwnx.md`.
- Deployment, ops, NWSync: read `references/deployment-nwsync-ops.md`.
- Testing and runtime QA: read `references/testing-runtime-qa.md`.
- Common mistakes: read `references/common-antipatterns.md` when reviewing or debugging.
```

## Evidence Labels

Use these labels in output and feedback:

- `design-only`: good idea, not implemented.
- `static-checked`: files or scripts reviewed, but not run in the game.
- `runtime-tested`: verified in NWN runtime, Toolset, local server, or client.
- `docs-verified`: checked against official/community documentation.
- `project-specific`: true for one server/module but not yet general.
- `superseded`: replaced by newer evidence.

## Reference Skeleton

Each reference should follow the same structure:

```markdown
# Domain Name

## What This Domain Controls

## Common User Requests

## Design Questions

## Implementation Path

## Files And Engine Surfaces

## Runtime Verification

## Common Failure Modes

## Feedback Candidates
```

## Critical Guardrails

- Do not treat a design document as a shipped NWN feature.
- Do not treat a generated script as correct until compiled and tested in its intended event context.
- Do not treat a 2DA row as safe until row ids, references, HAK/TLK packaging, and client distribution are accounted for.
- Do not treat NUI layout as correct until event flow, binds, player lifecycle, and refresh behavior are tested.
- Do not globalize server-specific patterns without a `project-specific` label.
- Do not copy claims from Claude, Opus, or any model into verified references without evidence.

## Suggested Domain Coverage

Version `0.1.0` should include minimal but useful guidance for:

- area planning and transitions,
- item blueprints and loot tables,
- creature blueprints, spawn logic, and encounter pacing,
- 2DA/TLK/HAK extension policy,
- NWScript event architecture,
- NUI panel design and player interaction flows,
- quests/dialogue/journal state,
- economy/crafting/progression,
- persistence and database ownership,
- deployment, NWSync, backups, and rollback,
- runtime QA checklists.
