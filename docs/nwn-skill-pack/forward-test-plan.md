# Forward Test Plan

## Purpose

Verify that `nwn-server-gamedev` changes Codex behavior in realistic NWN server-building tasks. Forward tests should check whether the skill routes to the correct references, avoids unsupported claims, and produces usable artifacts with evidence labels.

## Test Method

Use fresh context when possible. The test prompt should ask the agent to use the skill and solve a realistic task. Do not include the expected answer in the prompt.

For external testers, use the no-answer-leak packet:

```text
docs/nwn-skill-pack/forward-tests/tester-packet.md
docs/nwn-skill-pack/forward-tests/prompts/
docs/nwn-skill-pack/forward-tests/reviewer-matrix.json
docs/nwn-skill-pack/forward-tests/record-command-templates.md
```

Give the agent under test only one prompt file. Keep `forward-test-plan.md`, expected behavior, and prior results for the reviewer.
Keep `forward-tests/reviewer-matrix.json` and `forward-tests/record-command-templates.md` reviewer-only; they contain expected references and scoring focus.

For package installation or local marketplace checks, use:

```text
docs/nwn-skill-pack/forward-tests/install-smoke-checklist.md
```

Install smoke records verify that the packaged skill can be installed or invoked in a new Codex context. They do not count as NWN runtime evidence and do not replace prompt forward tests.

Preferred prompt shape:

```text
Use $nwn-server-gamedev at docs/nwn-skill-pack/draft-skills/nwn-server-gamedev to help with: <task>
```

Review the output against the success criteria below.

Record each executed test with:

```powershell
python docs\nwn-skill-pack\tools\forward_test_record.py new --help
```

Reviewer-only command templates are generated from the matrix:

```powershell
python docs\nwn-skill-pack\tools\generate_forward_test_record_templates.py docs\nwn-skill-pack --out docs\nwn-skill-pack\forward-tests\record-command-templates.md
```

Machine-readable record schema:

```text
docs/nwn-skill-pack/forward-tests/schema/forward-test-record.schema.json
```

Before handing prompts to a tester, check that the no-answer-leak packet is complete:

```powershell
python docs\nwn-skill-pack\tools\check_forward_test_prompts.py docs\nwn-skill-pack
```

Validate and aggregate records with:

```powershell
python docs\nwn-skill-pack\tools\forward_test_record.py validate docs\nwn-skill-pack\forward-tests\records\<record>.json
python docs\nwn-skill-pack\tools\forward_test_record.py aggregate docs\nwn-skill-pack\forward-tests\records --out docs\nwn-skill-pack\forward-tests\aggregate.md
```

Forward-test records are evidence of skill behavior. They are not NWN domain facts by themselves. If a test reveals reusable NWN knowledge, create a separate feedback record with `nwn_skill_feedback.py`.

## Universal Output Contract

Every forward-test answer should:

- Name the domain references it used or followed.
- Produce a concrete artifact: plan, table, checklist, script outline, release review, or feedback record.
- Label verification status.
- Separate source-backed NWN facts from project-specific assumptions.
- Include missing project facts instead of inventing them.
- Include a runtime QA path or exact blocker.
- Avoid claiming implementation, balance, packaging, persistence, or live safety without evidence.

Automatic failure triggers:

- Claims the feature exists in a module when no module/runtime artifact was provided.
- Treats `compiled` as equivalent to `runtime-tested`.
- Treats NWNX-only behavior as vanilla NWN.
- Promotes a model/forum/user claim as general truth without a source label.
- Skips rollback/packaging for a release or custom content task.

## Test Cases

### FT-001: Low-Level Forest Area

Prompt:

```text
Use $nwn-server-gamedev at docs/nwn-skill-pack/draft-skills/nwn-server-gamedev to design a level 1-4 forest area loop for a persistent NWN:EE server. Include area purpose, transitions, encounter pacing, creature roles, loot placement, scripts needed, and runtime QA.
```

Expected behavior:

- Reads or follows `locations-areas-tilesets.md`, `creatures-encounters-ai.md`, `items-equipment-loot.md`, and `testing-runtime-qa.md`.
- Separates design from Toolset/runtime implementation.
- Produces transitions, encounter roles, spawn/trigger scripts, and QA checklist.
- Marks output as `design-only` unless runtime evidence is provided.
- Avoids pretending the area exists in a module.

### FT-002: Custom Item Plus 2DA/HAK/TLK Impact

Prompt:

```text
Use $nwn-server-gamedev at docs/nwn-skill-pack/draft-skills/nwn-server-gamedev to plan a custom craftable spear line for a NWN:EE server. Include item blueprint naming, loot/crafting integration, possible 2DA/TLK/HAK impacts, scripts needed, packaging, rollback, and verification.
```

Expected behavior:

- Reads or follows `items-equipment-loot.md`, `two-da-hak-tlk-pipeline.md`, `nwscript-events-systems.md`, and `testing-runtime-qa.md`.
- Distinguishes simple blueprint work from custom 2DA/TLK/HAK changes.
- Calls out row ownership, StringRef/client distribution, rollback, and NWSync impact when relevant.
- Marks untested implementation as `design-only` or `static-checked`, not shipped.

### FT-003: NUI Crafting Panel

Prompt:

```text
Use $nwn-server-gamedev at docs/nwn-skill-pack/draft-skills/nwn-server-gamedev to design a NUI crafting panel for a NWN:EE server. Include player flow, bind data, event handlers, refresh behavior, permissions, failure states, and runtime tests.
```

Expected behavior:

- Reads or follows `nui-player-ui.md`, `economy-crafting-progression.md`, `nwscript-events-systems.md`, and `testing-runtime-qa.md`.
- Includes event flow and bind lifecycle.
- Includes refresh behavior after data mutation.
- Includes close/reopen/relog/invalid input tests.
- Avoids claiming a layout is complete without runtime testing.

### FT-004: Persistence And Restart Safety

Prompt:

```text
Use $nwn-server-gamedev at docs/nwn-skill-pack/draft-skills/nwn-server-gamedev to design persistence for player-owned crafting stations on a NWN:EE server. Include state ownership, database or NWNX options, migration, backup, restart tests, and operational risks.
```

Expected behavior:

- Reads or follows `persistence-database-nwnx.md`, `nwscript-events-systems.md`, `deployment-nwsync-ops.md`, and `testing-runtime-qa.md`.
- Separates vanilla storage, external DB, and NWNX-backed options.
- Requires restart and rollback verification.
- Labels project-specific storage assumptions.

### FT-005: Release Review

Prompt:

```text
Use $nwn-server-gamedev at docs/nwn-skill-pack/draft-skills/nwn-server-gamedev to review this proposed NWN:EE server release note: "We added custom races, a crafting NUI, and new forest encounters." Ask what evidence is missing before this can be called release-ready.
```

Expected behavior:

- Reads or follows `common-antipatterns.md`, `two-da-hak-tlk-pipeline.md`, `nui-player-ui.md`, `locations-areas-tilesets.md`, and `testing-runtime-qa.md`.
- Produces missing-evidence checklist.
- Does not accept broad release claims without runtime/package/persistence verification.

### FT-006: Economy And Progression

Prompt:

```text
Use $nwn-server-gamedev at docs/nwn-skill-pack/draft-skills/nwn-server-gamedev to design the first 10 levels of gold, XP, loot, crafting, and shop progression for a low-magic persistent NWN:EE server. Include faucets, sinks, repeatable farming risks, telemetry, and runtime QA.
```

Expected behavior:

- Reads or follows `economy-crafting-progression.md`, `items-equipment-loot.md`, `creatures-encounters-ai.md`, and `testing-runtime-qa.md`.
- Produces faucet/sink map rather than only reward tables.
- Labels numeric values as assumptions or `project-specific` unless server data exists.
- Includes anti-farm, anti-duplication, vendor, full-inventory, and telemetry tests.

### FT-007: Quest, Dialogue, Journal

Prompt:

```text
Use $nwn-server-gamedev at docs/nwn-skill-pack/draft-skills/nwn-server-gamedev to design a repeatable bounty quest with dialogue, journal entries, party reward rules, cooldown, abort handling, and persistence for a NWN:EE server.
```

Expected behavior:

- Reads or follows `quests-dialogues-journal.md`, `persistence-database-nwnx.md`, `economy-crafting-progression.md`, and `testing-runtime-qa.md`.
- Produces quest state table, dialogue branch outline, reward idempotency policy, and persistence/relog tests.
- Includes abort, disconnect, range break, party sharing, and restart checks.
- Does not assume journal or reward state survives without a persistence lane.

### FT-008: Feedback Contribution

Prompt:

```text
Use $nwn-server-gamedev at docs/nwn-skill-pack/draft-skills/nwn-server-gamedev to turn this NWN:EE server user report into a skill feedback record: "Our crafting NUI broke after relog because the watched bind did not refresh until the player reopened the window." Classify the domain, evidence, status, target reference, and review questions.
```

Expected behavior:

- Reads or follows `feedback-and-versioning.md`, `nui-player-ui.md`, and `testing-runtime-qa.md`.
- Produces a feedback-record shape compatible with `scripts/nwn_skill_feedback.py`.
- Labels the report as `project-specific` unless logs/screenshots/module facts prove runtime behavior.
- Proposes maintainer review questions before official reference promotion.

### FT-009: Aurora Local Intake Boundary

Prompt:

```text
Use $nwn-server-gamedev at docs/nwn-skill-pack/draft-skills/nwn-server-gamedev to help me evaluate a small NWN server skill-pack improvement from local Aurora reverse-engineering notes: in a decompiled Aurora function I saw terms like visualeffects, emitter, lifeExp, and a Toolset screenshot suggests a palette behavior; I want to add this as knowledge for future server design. Tell me the first implementable slice for safely using this lead, how to classify the evidence, what not to promote yet, what files or records a maintainer should touch, how to verify or block it, and what rollback path keeps the official skill clean.
```

Expected behavior:

- Reads or follows `source-registry.md`, `feedback-and-versioning.md`, `testing-runtime-qa.md`, and `common-antipatterns.md`.
- Treats decompilation and Toolset screenshot leads as `local-intake`, not general NWN facts.
- Routes through feedback or reference-promotion review before any installed skill reference update.
- Names redaction, evidence labeling, maintainer decision, verification, blocker, and rollback steps.

### FT-010: Full Feature Server Slice

Prompt:

```text
Use $nwn-server-gamedev at docs/nwn-skill-pack/draft-skills/nwn-server-gamedev to design the first playable vertical slice for a persistent NWN:EE server: a hub-to-dungeon adventure with areas, transitions, creatures, loot, a small crafting or upgrade UI, quest dialogue and journal state, possible custom content or text impacts, scripts, persistence, deployment, rollback, and runtime QA.
```

Expected behavior:

- Reads or follows `server-gamedev-capability-map.md` and `feature-design-output-template.md` before narrowing into domain details.
- Covers locations, items, creatures, 2DA/HAK/TLK, NWScript, NUI, quests, economy, persistence, deployment, and testing.
- Marks any skipped domain as `out-of-scope` with an explicit reason.
- Does not let a script, NUI mockup, or content table stand in for the whole server slice.
- Names a first implementable slice with files/assets touched, expected proof, rollback, and evidence limits.

## Scoring

Score each case:

- `pass`: output routes correctly, uses evidence labels, and avoids false completion.
- `partial`: output is useful but misses a relevant reference, evidence label, or verification path.
- `fail`: output hallucinates engine behavior, claims unverified completion, or ignores the skill workflow.

## Release Gate

For `v0.1.0`, require:

- at least 3 forward tests run,
- at least 1 install smoke test passes before sharing an install candidate,
- no `fail`,
- all `partial` cases produce a concrete skill improvement issue or feedback record,
- at least one test covers NUI,
- at least one test covers 2DA/HAK/TLK or packaging,
- at least one test covers runtime QA,
- at least one test covers economy/progression,
- at least one test covers human feedback contribution.
