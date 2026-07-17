# NWN Skill Pack Research

## Goal

Create a maintainable Codex skill pack for Neverwinter Nights server game development. The pack should help a builder design and implement a playable NWN or NWN:EE server across the full game-dev surface: locations, items, creatures, 2DA/HAK/TLK changes, NWScript, NUI, persistence, deployment, QA, and live iteration.

This document captures the first researched design pass. It is not the final skill.

## Skill System Facts

From the local `skill-creator` guidance:

- A skill is a folder with a required `SKILL.md`.
- `SKILL.md` requires YAML frontmatter with `name` and `description`.
- The `description` is the trigger surface. It must say what the skill does and when to use it.
- Optional resource folders are `scripts/`, `references/`, and `assets/`.
- `references/` is the right place for detailed domain knowledge that should be loaded only when relevant.
- `scripts/` is the right place for deterministic helpers, validators, importers, and aggregators.
- `assets/` is for templates or files that should be copied or used in outputs.
- `agents/openai.yaml` can provide UI metadata such as `display_name`, `short_description`, and a `default_prompt`.
- Basic validation is done with `quick_validate.py <skill-folder>`.

## Why One Huge Skill Is Risky

NWN server development is too broad for one long `SKILL.md`. If the skill loads all content for every task, it will waste context and increase the chance of stale or irrelevant advice.

Use one umbrella skill that routes to references:

```text
nwn-server-gamedev/
  SKILL.md
  agents/openai.yaml
  references/
    concept-and-scope.md
    locations-areas-tilesets.md
    items-equipment-loot.md
    creatures-encounters-ai.md
    two-da-hak-tlk-pipeline.md
    nwscript-events-systems.md
    nui-player-ui.md
    quests-dialogues-journal.md
    economy-crafting-progression.md
    persistence-database-nwnx.md
    deployment-nwsync-ops.md
    testing-runtime-qa.md
    common-antipatterns.md
  scripts/
    nwn_skill_feedback.py
```

`SKILL.md` should stay short and act as a router. It should tell Codex which reference to read for a task and what gates must be satisfied before claiming progress.

## Core Skill Behavior

The umbrella skill should make Codex follow this workflow:

1. Classify the task domain: location, item, creature, 2DA, NWScript, NUI, persistence, deployment, QA, or live balancing.
2. Read only the relevant reference files.
3. Ask for missing project facts only when guessing would cause bad implementation.
4. Separate design intent from implementation path.
5. Produce a concrete artifact: design spec, script, 2DA row plan, module checklist, test plan, deployment step, or exact blocker.
6. Mark evidence status clearly: `design-only`, `static-checked`, `runtime-tested`, `docs-verified`, or `project-specific`.
7. Do not promote guesses from another model or one server into global skill knowledge without review.

## Human Reinforcement Model

The model does not train itself by using a skill. Improvement happens when users and maintainers capture lessons and merge them into the skill pack.

Use this flow:

```text
real task -> Codex uses skill -> user/runtime evidence -> feedback record -> review -> promoted reference update -> new skill version
```

A feedback record should be small, structured, and reviewable. It should not directly edit the official reference files.

## Better Than Skills?

Skills are best for portable agent knowledge, workflows, and local helper scripts. They are not always the best home for everything.

Use skills for:

- procedural guidance,
- domain-specific checklists,
- task routing,
- stable patterns,
- local scripts for validation and aggregation.

Use a plugin or MCP server when:

- Codex needs live access to a tool or service,
- the workflow needs a UI or API,
- users need to query a knowledge base,
- contribution ingestion should be centralized,
- validation should run on a hosted service.

Use a repository template when:

- people need a starter NWN server project,
- scripts, CI, folder layout, and examples are as important as the skill text.

Use docs/RAG when:

- the corpus is very large,
- users contribute many notes,
- retrieval and citations matter more than loading static references.

Recommended first release: a skill pack plus a Git repository. Package it as a plugin when handing it to another person. Add MCP or RAG later if community usage grows.

See `architecture-options.md` for the detailed option matrix and phased recommendation.

See `plugin-distribution-plan.md` for the current draft plugin, validation status, and release boundary.

## First Release Scope

Version `0.1.0` should include:

- one umbrella skill: `nwn-server-gamedev`,
- reference skeletons for all main NWN server domains,
- a contribution protocol,
- a local feedback script,
- validation rules for incoming knowledge,
- a versioning policy.

Do not try to encode every NWN fact in `0.1.0`. The first release should make it easy to collect and verify knowledge.

See `release-and-review-checklists.md` for release, feedback review, promotion, and versioning checklists.
