---
name: nwn-server-gamedev
description: Helps design, implement, review, and iterate Neverwinter Nights or NWN:EE server content and systems. Use when Codex is asked to work on NWN server game development, including locations and areas, items and loot, creatures and encounters, 2DA or HAK or TLK pipelines, NWScript, NUI, quests, economy, persistence, NWNX, NWSync, deployment, runtime QA, balancing, or live operations.
---

# NWN Server Gamedev

## Operating Rule

Treat NWN server work as full game development. Separate design intent, engine surfaces, data/assets, scripts, runtime verification, and release impact.

Do not treat a design note, generated file, or model claim as shipped server behavior. Mark the evidence level explicitly.

## Workflow

1. Classify the request into one or more domains.
2. Read only the relevant reference files listed below.
3. Identify missing project facts before making risky assumptions.
4. Produce a concrete artifact: design spec, implementation plan, script, data-row plan, QA checklist, deployment step, or exact blocker.
5. State the verification status: `design-only`, `static-checked`, `runtime-tested`, `docs-verified`, `project-specific`, or `unverified`.
6. If a reusable lesson appears, write or propose a feedback record instead of silently editing official references.

## Domain Routing

- Multi-domain server feature planning or architecture choice: read `references/server-gamedev-capability-map.md` first.
- Full feature design output: read `references/feature-design-output-template.md` after the relevant domain references.
- Server concept and scope: read `references/concept-and-scope.md`.
- Locations, areas, tilesets, transitions: read `references/locations-areas-tilesets.md`.
- Items, equipment, loot, shops: read `references/items-equipment-loot.md`.
- Creatures, encounters, spawns, AI: read `references/creatures-encounters-ai.md`.
- 2DA, HAK, TLK, NWSync content packaging: read `references/two-da-hak-tlk-pipeline.md`.
- NWScript events and systems: read `references/nwscript-events-systems.md`.
- NUI player or DM interfaces: read `references/nui-player-ui.md`.
- Quests, dialogue, journal state: read `references/quests-dialogues-journal.md`.
- Economy, crafting, progression, balance: read `references/economy-crafting-progression.md`.
- Persistence, database, NWNX: read `references/persistence-database-nwnx.md`.
- Deployment, backups, operations: read `references/deployment-nwsync-ops.md`.
- Testing, runtime QA, evidence: read `references/testing-runtime-qa.md`.
- Reviews and debugging: also read `references/common-antipatterns.md`.
- Skill contribution and versioning: read `references/feedback-and-versioning.md`.
- External source selection and trust tiers: read `references/source-registry.md`.
- Demonstrations or forward tests: read `references/example-prompts.md`.

## Evidence Labels

- `design-only`: proposed, not implemented.
- `static-checked`: checked in files or scripts, not runtime-tested.
- `runtime-tested`: verified in Toolset, NWN client, local server, logs, or module runtime.
- `docs-verified`: checked against trusted documentation or source material.
- `project-specific`: true for one project but not proven general.
- `unverified`: captured from a model, memory, forum, or user claim without proof.

## Live Evidence Intake

When a task brings Aurora Toolset live records, screenshots, local reverse-engineering notes, or decompilation-derived leads, route through `references/source-registry.md` and `references/feedback-and-versioning.md`. Treat them as review material, not installed skill knowledge, until a maintainer-reviewed promotion record accepts the target reference update.

## Guardrails

- Do not promote Claude, Opus, Codex, or forum claims into general guidance without evidence.
- Do not promote Aurora live records, screenshots, local reverse-engineering notes, or decompilation-derived leads directly into general guidance without maintainer review and a reference-promotion decision.
- Do not treat community guides as primary sources when official/project-owned docs or local runtime checks are available.
- Do not globalize one server's house rule without a `project-specific` label.
- Do not design NUI without event flow, bind lifecycle, refresh behavior, and player-close behavior.
- Do not change 2DA/TLK/HAK plans without row ownership, client distribution, rollback, and NWSync impact.
- Do not claim NWScript correctness without compile context and event ownership.
- Do not claim an area, item, creature, or encounter is done without in-game or Toolset verification, or a precise blocker.

## Feedback Capture

Use `scripts/nwn_skill_feedback.py` if available. Capture reusable findings as records in a `knowledge-inbox/incoming` folder with:

- domain,
- title,
- source type,
- evidence,
- status,
- proposed reference file,
- proposed update summary.

Official reference files should be updated only after review.
