# Forward-Test Reviewer Packet

Generated from package metadata last updated: 2026-06-19T04:09:42Z

## Purpose

Use this reviewer-only packet only after the raw answer has been captured and `check_forward_test_return_captures.py` passes on the filled returned capture sheet.
Do not give this file, the reviewer matrix, record-command templates, prior results, or expected references to the agent under test.

## Reviewer Workflow

1. Run `python docs\nwn-skill-pack\tools\check_forward_test_prompts.py docs\nwn-skill-pack`.
2. Open a fresh Codex thread or clean model session.
3. Paste exactly one file from `docs/nwn-skill-pack/forward-tests/prompts/`.
4. Fill a capture sheet from `forward-tests/answer-capture-template.md` or `tools/init_forward_test_capture.py` before reading reviewer-only expected references.
5. Run `python docs\nwn-skill-pack\tools\check_forward_test_return_captures.py docs\nwn-skill-pack --captures <returned-captures-dir>` on the filled returned capture sheet.
6. Do not score before the returned-capture check passes; blank initialized capture sheets must fail this gate.
7. Compare the answer against the matching section below.
8. Record `pass`, `partial`, or `fail` with `tools/forward_test_record.py`; pass/partial records require `--first-implementable-slice` after reviewer confirmation.
9. Regenerate `forward-tests/aggregate.md`, `release-readiness.md`, and package inventory.

## Scoring Rules

- `pass`: expected references or equivalent routing are present, evidence status is labeled, runtime proof is not invented, the answer names a First Implementable Slice, and it gives an actionable NWN server-gamedev workflow.
- `partial`: the answer is useful but misses one important reference, evidence label, First Implementable Slice detail, runtime QA step, rollback/contribution step, or project-specific caveat. Record an improvement action.
- `fail`: the answer invents runtime proof, treats unverified claims as general NWN facts, ignores the skill references, skips the task, omits a buildable first slice, or gives unsafe release/custom-content guidance. Record at least one issue and an improvement action.

Forward-test records prove skill behavior in one session. They do not prove NWN domain facts by themselves.

## Test Matrix

### FT-001: Low-Level Forest Area

- Prompt file: `forward-tests/prompts/ft-001-low-level-forest-area.txt`
- Expected references:

- `locations-areas-tilesets.md`
- `creatures-encounters-ai.md`
- `items-equipment-loot.md`
- `testing-runtime-qa.md`

- Review focus:

- Separates design from Toolset/runtime implementation.
- Produces transitions, encounter roles, spawn/trigger scripts, and QA checklist.
- Marks output as design-only unless runtime evidence is provided.
- Names a First Implementable Slice with files/assets touched, expected proof, rollback, and evidence limits.

### FT-002: Custom Item Plus 2DA/HAK/TLK Impact

- Prompt file: `forward-tests/prompts/ft-002-custom-spear-2da-hak-tlk.txt`
- Expected references:

- `items-equipment-loot.md`
- `two-da-hak-tlk-pipeline.md`
- `nwscript-events-systems.md`
- `testing-runtime-qa.md`

- Review focus:

- Distinguishes simple blueprint work from custom 2DA/TLK/HAK changes.
- Calls out row ownership, StringRef/client distribution, rollback, and NWSync impact.
- Avoids marking untested custom content as shipped.
- Names a First Implementable Slice with files/assets touched, expected proof, rollback, and evidence limits.

### FT-003: NUI Crafting Panel

- Prompt file: `forward-tests/prompts/ft-003-nui-crafting-panel.txt`
- Expected references:

- `nui-player-ui.md`
- `economy-crafting-progression.md`
- `nwscript-events-systems.md`
- `testing-runtime-qa.md`

- Review focus:

- Includes event flow and bind lifecycle.
- Includes refresh behavior after data mutation.
- Includes close/reopen/relog/invalid input tests.
- Names a First Implementable Slice with files/assets touched, expected proof, rollback, and evidence limits.

### FT-004: Persistence And Restart Safety

- Prompt file: `forward-tests/prompts/ft-004-persistence-restart-safety.txt`
- Expected references:

- `persistence-database-nwnx.md`
- `nwscript-events-systems.md`
- `deployment-nwsync-ops.md`
- `testing-runtime-qa.md`

- Review focus:

- Separates vanilla storage, external DB, and NWNX-backed options.
- Requires restart and rollback verification.
- Labels project-specific storage assumptions.
- Names a First Implementable Slice with files/assets touched, expected proof, rollback, and evidence limits.

### FT-005: Release Review

- Prompt file: `forward-tests/prompts/ft-005-release-review.txt`
- Expected references:

- `common-antipatterns.md`
- `two-da-hak-tlk-pipeline.md`
- `nui-player-ui.md`
- `locations-areas-tilesets.md`
- `testing-runtime-qa.md`

- Review focus:

- Produces a missing-evidence checklist.
- Does not accept broad release claims without runtime, package, and persistence verification.
- Separates release-note wording from proof of implementation.
- Names a First Implementable Slice with files/assets touched, expected proof, rollback, and evidence limits.

### FT-006: Economy And Progression

- Prompt file: `forward-tests/prompts/ft-006-economy-progression.txt`
- Expected references:

- `economy-crafting-progression.md`
- `items-equipment-loot.md`
- `creatures-encounters-ai.md`
- `testing-runtime-qa.md`

- Review focus:

- Produces a faucet/sink map rather than only reward tables.
- Labels numeric values as assumptions or project-specific unless server data exists.
- Includes anti-farm, anti-duplication, vendor, full-inventory, and telemetry tests.
- Names a First Implementable Slice with files/assets touched, expected proof, rollback, and evidence limits.

### FT-007: Quest, Dialogue, Journal

- Prompt file: `forward-tests/prompts/ft-007-quest-dialogue-journal.txt`
- Expected references:

- `quests-dialogues-journal.md`
- `persistence-database-nwnx.md`
- `economy-crafting-progression.md`
- `testing-runtime-qa.md`

- Review focus:

- Produces quest state table, dialogue branch outline, reward idempotency policy, and persistence/relog tests.
- Includes abort, disconnect, range break, party sharing, and restart checks.
- Does not assume journal or reward state survives without a persistence lane.
- Names a First Implementable Slice with files/assets touched, expected proof, rollback, and evidence limits.

### FT-008: Feedback Contribution

- Prompt file: `forward-tests/prompts/ft-008-feedback-contribution.txt`
- Expected references:

- `feedback-and-versioning.md`
- `nui-player-ui.md`
- `testing-runtime-qa.md`

- Review focus:

- Produces a feedback-record shape compatible with scripts/nwn_skill_feedback.py.
- Labels the report as project-specific unless logs/screenshots/module facts prove runtime behavior.
- Proposes maintainer review questions before official reference promotion.
- Names a First Implementable Slice with files/assets touched, expected proof, rollback, and evidence limits.

### FT-009: Aurora Local Intake Boundary

- Prompt file: `forward-tests/prompts/ft-009-aurora-local-intake-boundary.txt`
- Expected references:

- `source-registry.md`
- `feedback-and-versioning.md`
- `testing-runtime-qa.md`
- `common-antipatterns.md`

- Review focus:

- Treats decompilation and Toolset screenshot leads as local-intake, not general NWN facts.
- Routes through feedback or reference-promotion review before any installed skill reference update.
- Names redaction, evidence labeling, maintainer decision, verification, blocker, and rollback steps.
- Names a First Implementable Slice with files/assets touched, expected proof, rollback, and evidence limits.

### FT-010: Full Feature Server Slice

- Prompt file: `forward-tests/prompts/ft-010-full-feature-server-slice.txt`
- Expected references:

- `server-gamedev-capability-map.md`
- `feature-design-output-template.md`
- `locations-areas-tilesets.md`
- `items-equipment-loot.md`
- `creatures-encounters-ai.md`
- `two-da-hak-tlk-pipeline.md`
- `nwscript-events-systems.md`
- `nui-player-ui.md`
- `quests-dialogues-journal.md`
- `economy-crafting-progression.md`
- `persistence-database-nwnx.md`
- `deployment-nwsync-ops.md`
- `testing-runtime-qa.md`

- Review focus:

- Uses the capability map or equivalent routing before narrowing into domain details.
- Covers the full feature slice: locations, items, creatures, 2DA/HAK/TLK, NWScript, NUI, quests, economy, persistence, deployment, and testing.
- Marks any skipped domain as out-of-scope with an explicit reason rather than silently omitting it.
- Does not let a script, NUI mockup, or content table stand in for the whole server slice.
- Names a First Implementable Slice with files/assets touched, expected proof, rollback, and evidence limits.

## Record And Regenerate

Use `forward-tests/record-command-templates.md` after scoring. Replace placeholders before running a command.

```powershell
python docs\nwn-skill-pack\tools\forward_test_record.py validate docs\nwn-skill-pack\forward-tests\records\<record>.json
python docs\nwn-skill-pack\tools\forward_test_record.py aggregate docs\nwn-skill-pack\forward-tests\records --out docs\nwn-skill-pack\forward-tests\aggregate.md
python docs\nwn-skill-pack\tools\generate_release_readiness.py docs\nwn-skill-pack --out docs\nwn-skill-pack\release-readiness.md
python docs\nwn-skill-pack\tools\generate_package_inventory.py docs\nwn-skill-pack --out-json docs\nwn-skill-pack\package-inventory.json --out-md docs\nwn-skill-pack\package-inventory.md
```

Promote reusable NWN lessons only through reviewed feedback records and the human feedback release workflow.
