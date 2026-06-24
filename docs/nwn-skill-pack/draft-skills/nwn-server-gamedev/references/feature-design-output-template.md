# Feature Design Output Template

## Source Status

- Template status: `docs-verified` for skill workflow shape, `design-only` for any feature plan until project/runtime evidence exists.
- Use this after reading the domain references required by `server-gamedev-capability-map.md`.
- Do not use this template to claim implementation, compilation, Toolset, client, server, NWSync, or NWNX behavior.

## When To Use

Use this for any NWN server feature that crosses more than one domain, for example:

- a new explorable location with creatures, loot, transitions, and quest hooks,
- a custom item that touches 2DA, TLK, HAK, NWSync, NWScript, and economy,
- a crafting or faction NUI that touches scripts, persistence, items, and progression,
- a persistent-world system that needs deployment, rollback, telemetry, and feedback capture.

## Required Output Sections

Return these sections in this order unless the user requests a narrower artifact:

1. `Scope`: one or two sentences naming the player-facing feature and target module/server assumptions.
2. `Domain Classification`: list every touched domain and the reference files read or still required.
3. `Missing Project Facts`: tileset/module constraints, HAK ownership, TLK ranges, 2DA rows, script include conventions, NWNX availability, persistence policy, balance goals, deployment path, and privacy constraints.
4. `Design`: player loop, content beats, rules, failure cases, economy/progression impact, and multiplayer edge cases.
5. `Implementation Plan`: concrete artifacts to create or edit, grouped as areas, items, creatures, 2DA/TLK/HAK/NWSync, NWScript, NUI, persistence, deployment, and docs.
6. `Data And Script Ownership`: resrefs, tags, local variables, database keys, 2DA rows, TLK ranges, HAK names, NWSync manifests, event owners, and rollback points.
7. `Verification Ladder`: what can be `design-only`, `docs-verified`, `static-checked`, and what must become `runtime-tested`.
8. `Runtime QA`: Toolset checks, compile checks, fresh client/server steps, logs, clean-client download, relog/restart, multiplayer, exploit, rollback, and accessibility/UI checks.
9. `Risks And Blockers`: exact blockers, unsafe assumptions, evidence gaps, and what would change the plan.
10. `First Implementable Slice`: the smallest useful change a builder can actually make next, including files/assets touched, expected proof, and rollback.
11. `Feedback Candidate`: whether this work produced a reusable lesson that should become a feedback record.

## Minimum Deliverable Contract

- Do not stop at high-level lore, product strategy, or broad architecture.
- Name one first implementable slice that could be built without waiting for the whole feature.
- Keep the slice narrow enough to verify with a Toolset check, NWScript compile, local server/client run, clean-client download, or exact blocker.
- List any project facts that block the slice separately from facts that only block later expansion.
- If the user asked for implementation and the repo/module target is known, prefer a concrete patch plan or file list over another question round.
- If the repo/module target is unknown, state the blocker and produce a safe design-only slice with the missing evidence clearly labeled.

## Cross-Domain Checklist

- Locations/areas: area resref, tileset, transitions, doors/triggers, spawn points, walkability, minimap/readability, and cleanup.
- Items/equipment/loot: blueprint resrefs, item properties, tags, inventory fit, stack behavior, shop/drop ownership, and economy impact.
- Creatures/encounters/AI: creature resrefs, factions, OnSpawn/OnDeath/OnPerception ownership, CR/balance assumptions, reset/respawn, and rewards.
- 2DA/TLK/HAK/NWSync: row ownership, custom columns, TLK range, HAK order, client distribution, clean-client test, rollback, and version labels.
- NWScript: event owner, `OBJECT_SELF`, include dependencies, delayed/assigned calls, compile command, logging, and invalid object branches.
- NUI: window id, bind names, token lifecycle, event dispatch, player close, refresh path, permissions, and UI state persistence.
- Quest/dialogue/journal: state table, journal tags/entry ids, conversation scripts, abort/end behavior, custom tokens, reward re-checks, and party sharing.
- Economy/crafting/progression: source/sink table, XP/gold faucets and sinks, recipe costs, vendor policy, exploit cases, telemetry, and rollback.
- Persistence/NWNX/database: storage lane, schema/key ownership, transaction order, restart/relog proof, migration, and NWNX plugin assumptions.
- Deployment/ops: settings, NWSync, backups, staging, rollback, monitoring, privacy scrub, and release notes.

## Verification Ladder

- `design-only`: plan exists, no files or runtime checked.
- `docs-verified`: fact was checked against a trusted source or local source registry lane.
- `static-checked`: generated files, scripts, or package metadata passed local checks.
- `runtime-tested`: verified in Toolset, NWN client, local server, logs, clean-client download, relog/restart, or representative multiplayer runtime.
- `project-specific`: valid only for the named module/server configuration.
- `unverified`: user/model/forum claim that needs evidence before promotion.

## Stop Conditions

Stop and ask for missing facts or state an exact blocker when:

- required project ownership is unknown for 2DA rows, TLK ranges, HAK order, script includes, database keys, or NWSync manifests,
- the answer would require actual Toolset/client/server evidence that is not available,
- a model-originated or forum-originated claim would become general guidance without documentation or runtime evidence,
- private module data, credentials, player data, server logs, or private community transcripts would be needed,
- the feature would be called complete without compile/runtime/clean-client proof.

## Compact Answer Skeleton

```text
Scope:
Domain Classification:
Missing Project Facts:
Design:
Implementation Plan:
Data And Script Ownership:
Verification Ladder:
Runtime QA:
Risks And Blockers:
First Implementable Slice:
Feedback Candidate:
```
