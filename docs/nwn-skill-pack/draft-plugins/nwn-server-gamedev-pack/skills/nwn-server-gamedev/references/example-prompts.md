# Example Prompts

Use this reference when testing, demonstrating, or forward-testing the skill.

## Expected Answer Contract

For every example, a good answer should:

- Name the domains and references it is using.
- Ask for missing project facts when the answer would otherwise invent server policy.
- Produce a concrete artifact, not only advice.
- Label verification status: `design-only`, `static-checked`, `compiled`, `instrumented`, `runtime-tested`, `regression-tested`, `live-verified`, `docs-verified`, `project-specific`, or `unverified`.
- Separate source-backed NWN facts from project-specific assumptions.
- Include a runtime QA path or an exact blocker.
- Suggest a feedback record when a reusable lesson appears.

A bad answer:

- Claims something is implemented or release-ready without module/runtime evidence.
- Treats a forum/model/user claim as general truth without a source label.
- Skips packaging, rollback, persistence, or multiplayer when those risks are relevant.
- Gives a large lore/design essay without scripts, data surfaces, QA, or release impact.

## Location And Encounter Loop

Prompt:

```text
Use $nwn-server-gamedev to design a level 1-4 forest area loop for a persistent NWN:EE server. Include area purpose, transitions, encounter pacing, creature roles, loot placement, scripts needed, and runtime QA.
```

Expected output:

- Status should be `design-only` unless the user provides module/runtime artifacts.
- Include area list, transition graph, encounter roles, spawn/reset policy, loot surfaces, script hooks, and QA checklist.
- Read or follow `locations-areas-tilesets.md`, `creatures-encounters-ai.md`, `items-equipment-loot.md`, and `testing-runtime-qa.md`.
- Do not claim walkability, balance, or transition correctness without Toolset/client/server evidence.

## Item And 2DA/HAK/TLK Impact

Prompt:

```text
Use $nwn-server-gamedev to plan a custom craftable spear line for a NWN:EE server. Include item blueprint naming, loot/crafting integration, possible 2DA/TLK/HAK impacts, scripts needed, packaging, rollback, and verification.
```

Expected output:

- Separate blueprint-only changes from custom base item, feat, spell, icon, TLK, HAK, or NWSync work.
- Include row ownership, StringRef ownership, HAK/TLK packaging, clean-client delivery, and rollback checks if custom content is needed.
- Include craft recipe surfaces, cost/failure paths, full inventory tests, and shop/economy side effects.
- Do not assume a custom 2DA row or StringRef range exists.

## NUI Crafting Panel

Prompt:

```text
Use $nwn-server-gamedev to design a NUI crafting panel for a NWN:EE server. Include player flow, bind data, event handlers, refresh behavior, permissions, failure states, and runtime tests.
```

Expected output:

- Include window id, `NuiId` policy, bind schema, event routing, refresh lifecycle, close/reopen behavior, and permission checks.
- Include economy/crafting checks at action time, not only at display time.
- Include tests for duplicate open, invalid selection, watched bind recursion risk, multiple players, relog/disconnect, and asset delivery.
- Do not claim the panel renders correctly without client evidence.

## Persistence

Prompt:

```text
Use $nwn-server-gamedev to design persistence for player-owned crafting stations on a NWN:EE server. Include state ownership, database or NWNX options, migration, backup, restart tests, and operational risks.
```

Expected output:

- Compare locals, Campaign DB, built-in SQLite, and NWNX SQL as separate lanes.
- Include ownership key, schema/migration outline, cleanup, backup, restore, relog, restart, and stale object reference tests.
- Label NWNX-only options clearly.
- Do not choose external DB/NWNX as mandatory unless the user provided that server constraint.

## Economy And Progression

Prompt:

```text
Use $nwn-server-gamedev to design the first 10 levels of gold, XP, loot, crafting, and shop progression for a low-magic persistent NWN:EE server. Include faucets, sinks, repeatable farming risks, telemetry, and runtime QA.
```

Expected output:

- Include faucet/sink map for XP, gold, items, crafting components, vendor stock, and progression unlocks.
- Include assumptions table for target leveling pace, party size, death penalty, rest rules, shop policy, and crafting role.
- Include anti-farm and anti-duplication tests.
- Mark all numeric curves as `project-specific` or `design-only` unless runtime/server data exists.

## Quest, Dialogue, Journal

Prompt:

```text
Use $nwn-server-gamedev to design a repeatable bounty quest with dialogue, journal entries, party reward rules, cooldown, abort handling, and persistence for a NWN:EE server.
```

Expected output:

- Include quest state table, conversation branch outline, conditional/action scripts, journal category/entry policy, reward idempotency, and cooldown persistence.
- Include abort, disconnect, range break, relog, party sharing, and reward re-check tests.
- Use `GetPCSpeaker` and custom token behavior only in the correct context.
- Do not claim journal state or rewards survive restart without persistence evidence.

## NWScript Review

Prompt:

```text
Use $nwn-server-gamedev to review this NWScript idea before implementation: "OnEnter trigger gives gold, XP, a spear, and starts a conversation with the nearest guard." Identify event-context risks, exploit risks, and the minimum proof bundle.
```

Expected output:

- Identify trigger `OBJECT_SELF`, entering object checks, PC-only filtering, reward repeatability, inventory fit, conversation target selection, and delayed/action queue hazards.
- Include instrumentation plan with log prefix and evidence label.
- Include compile/runtime test plan and exact blocker if source/module files are absent.
- Do not write final code unless the user asked for implementation.

## Deployment And NWSync Release

Prompt:

```text
Use $nwn-server-gamedev to prepare a release checklist for a server update that changes HAK content, TLK text, NWSync files, several scripts, and one NWNX SQL-backed system.
```

Expected output:

- Include build, compile, NWSync manifest verification, clean-client join, backup, DB migration, rollback manifest, secrets/log review, and live observation.
- Separate vanilla NWN evidence from NWNX evidence.
- Include go/no-go criteria.
- Do not recommend pruning or destructive migration until backups and rollback are proven.

## Feedback Contribution

Prompt:

```text
Use $nwn-server-gamedev to turn this user report into a skill feedback record: "Our crafting NUI broke after relog because the watched bind did not refresh until the player reopened the window." Classify the domain, evidence, status, target reference, and review questions.
```

Expected output:

- Use `feedback-and-versioning.md` and the feedback script schema if available.
- Classify as NUI plus persistence/runtime QA.
- Mark as `project-specific` or `runtime-verified` only if the report includes logs/screenshots/module facts.
- Propose review questions and an update summary rather than silently editing official references.

## Release Review

Prompt:

```text
Use $nwn-server-gamedev to review this proposed release note: "We added custom races, a crafting NUI, and new forest encounters." Ask what evidence is missing before this can be called release-ready.
```

Expected output:

- Lead with missing evidence and release risks.
- Cover 2DA/TLK/HAK/NWSync, NUI lifecycle, encounter balance, economy/loot, persistence, packaging, rollback, and live monitoring.
- Ask for exact artifacts: diffs, compiler output, logs, screenshots, clean-client proof, DB migration proof, and rollback plan.
- Do not accept the release note as true without evidence.
