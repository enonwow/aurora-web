# Forward-Test Record Command Templates

Generated from package metadata last updated: 2026-06-19T04:09:42Z

## Purpose

Use these reviewer-only templates after a fresh-context prompt forward test has run.
Do not give this file to the agent under test; it contains expected references from the reviewer matrix.

Replace bracketed placeholders before running a command. Keep `partial` and `fail` records tied to an improvement action.

## FT-001: Low-Level Forest Area

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

Pass and partial records must keep `--first-implementable-slice` only when reviewer scoring confirmed the answer names files/assets touched, expected proof, rollback, and evidence limits. Remove the flag for fail/not-run records.

```powershell
python docs\nwn-skill-pack\tools\forward_test_record.py new `
  --record-type prompt-forward-test `
  --test-id FT-001 `
  --id ft-001-low-level-forest-area-fresh-thread `
  --title "FT-001 Low-Level Forest Area" `
  --result [pass|partial|fail] `
  --tester "[tester]" `
  --context "[fresh context; model/build; no expected-answer leakage; raw answer captured before reviewer-only scoring]" `
  --prompt-or-command "@docs\nwn-skill-pack\forward-tests\prompts\ft-001-low-level-forest-area.txt" `
  --skill-path "docs\nwn-skill-pack\draft-skills\nwn-server-gamedev" `
  --expected-reference locations-areas-tilesets.md `
  --expected-reference creatures-encounters-ai.md `
  --expected-reference items-equipment-loot.md `
  --expected-reference testing-runtime-qa.md `
  --observed-reference [observed-reference.md] `
  --evidence-label [design-only|static-checked|runtime-tested|project-specific] `
  --evidence "[short observed behavior]" `
  --issue "[missing First Implementable Slice or weak behavior, if any]" `
  --missing-evidence "[runtime/module/log evidence still missing]" `
  --artifact "[filled returned capture sheet under docs\nwn-skill-pack\.codex-tmp\forward-test-return-captures\]" `
  --first-implementable-slice `
  --improvement-summary "[required for partial/fail; empty for pass]"
```

## FT-002: Custom Item Plus 2DA/HAK/TLK Impact

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

Pass and partial records must keep `--first-implementable-slice` only when reviewer scoring confirmed the answer names files/assets touched, expected proof, rollback, and evidence limits. Remove the flag for fail/not-run records.

```powershell
python docs\nwn-skill-pack\tools\forward_test_record.py new `
  --record-type prompt-forward-test `
  --test-id FT-002 `
  --id ft-002-custom-item-plus-2da-hak-tlk-impact-fresh-thread `
  --title "FT-002 Custom Item Plus 2DA/HAK/TLK Impact" `
  --result [pass|partial|fail] `
  --tester "[tester]" `
  --context "[fresh context; model/build; no expected-answer leakage; raw answer captured before reviewer-only scoring]" `
  --prompt-or-command "@docs\nwn-skill-pack\forward-tests\prompts\ft-002-custom-spear-2da-hak-tlk.txt" `
  --skill-path "docs\nwn-skill-pack\draft-skills\nwn-server-gamedev" `
  --expected-reference items-equipment-loot.md `
  --expected-reference two-da-hak-tlk-pipeline.md `
  --expected-reference nwscript-events-systems.md `
  --expected-reference testing-runtime-qa.md `
  --observed-reference [observed-reference.md] `
  --evidence-label [design-only|static-checked|runtime-tested|project-specific] `
  --evidence "[short observed behavior]" `
  --issue "[missing First Implementable Slice or weak behavior, if any]" `
  --missing-evidence "[runtime/module/log evidence still missing]" `
  --artifact "[filled returned capture sheet under docs\nwn-skill-pack\.codex-tmp\forward-test-return-captures\]" `
  --first-implementable-slice `
  --improvement-summary "[required for partial/fail; empty for pass]"
```

## FT-003: NUI Crafting Panel

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

Pass and partial records must keep `--first-implementable-slice` only when reviewer scoring confirmed the answer names files/assets touched, expected proof, rollback, and evidence limits. Remove the flag for fail/not-run records.

```powershell
python docs\nwn-skill-pack\tools\forward_test_record.py new `
  --record-type prompt-forward-test `
  --test-id FT-003 `
  --id ft-003-nui-crafting-panel-fresh-thread `
  --title "FT-003 NUI Crafting Panel" `
  --result [pass|partial|fail] `
  --tester "[tester]" `
  --context "[fresh context; model/build; no expected-answer leakage; raw answer captured before reviewer-only scoring]" `
  --prompt-or-command "@docs\nwn-skill-pack\forward-tests\prompts\ft-003-nui-crafting-panel.txt" `
  --skill-path "docs\nwn-skill-pack\draft-skills\nwn-server-gamedev" `
  --expected-reference nui-player-ui.md `
  --expected-reference economy-crafting-progression.md `
  --expected-reference nwscript-events-systems.md `
  --expected-reference testing-runtime-qa.md `
  --observed-reference [observed-reference.md] `
  --evidence-label [design-only|static-checked|runtime-tested|project-specific] `
  --evidence "[short observed behavior]" `
  --issue "[missing First Implementable Slice or weak behavior, if any]" `
  --missing-evidence "[runtime/module/log evidence still missing]" `
  --artifact "[filled returned capture sheet under docs\nwn-skill-pack\.codex-tmp\forward-test-return-captures\]" `
  --first-implementable-slice `
  --improvement-summary "[required for partial/fail; empty for pass]"
```

## FT-004: Persistence And Restart Safety

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

Pass and partial records must keep `--first-implementable-slice` only when reviewer scoring confirmed the answer names files/assets touched, expected proof, rollback, and evidence limits. Remove the flag for fail/not-run records.

```powershell
python docs\nwn-skill-pack\tools\forward_test_record.py new `
  --record-type prompt-forward-test `
  --test-id FT-004 `
  --id ft-004-persistence-and-restart-safety-fresh-thread `
  --title "FT-004 Persistence And Restart Safety" `
  --result [pass|partial|fail] `
  --tester "[tester]" `
  --context "[fresh context; model/build; no expected-answer leakage; raw answer captured before reviewer-only scoring]" `
  --prompt-or-command "@docs\nwn-skill-pack\forward-tests\prompts\ft-004-persistence-restart-safety.txt" `
  --skill-path "docs\nwn-skill-pack\draft-skills\nwn-server-gamedev" `
  --expected-reference persistence-database-nwnx.md `
  --expected-reference nwscript-events-systems.md `
  --expected-reference deployment-nwsync-ops.md `
  --expected-reference testing-runtime-qa.md `
  --observed-reference [observed-reference.md] `
  --evidence-label [design-only|static-checked|runtime-tested|project-specific] `
  --evidence "[short observed behavior]" `
  --issue "[missing First Implementable Slice or weak behavior, if any]" `
  --missing-evidence "[runtime/module/log evidence still missing]" `
  --artifact "[filled returned capture sheet under docs\nwn-skill-pack\.codex-tmp\forward-test-return-captures\]" `
  --first-implementable-slice `
  --improvement-summary "[required for partial/fail; empty for pass]"
```

## FT-005: Release Review

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

Pass and partial records must keep `--first-implementable-slice` only when reviewer scoring confirmed the answer names files/assets touched, expected proof, rollback, and evidence limits. Remove the flag for fail/not-run records.

```powershell
python docs\nwn-skill-pack\tools\forward_test_record.py new `
  --record-type prompt-forward-test `
  --test-id FT-005 `
  --id ft-005-release-review-fresh-thread `
  --title "FT-005 Release Review" `
  --result [pass|partial|fail] `
  --tester "[tester]" `
  --context "[fresh context; model/build; no expected-answer leakage; raw answer captured before reviewer-only scoring]" `
  --prompt-or-command "@docs\nwn-skill-pack\forward-tests\prompts\ft-005-release-review.txt" `
  --skill-path "docs\nwn-skill-pack\draft-skills\nwn-server-gamedev" `
  --expected-reference common-antipatterns.md `
  --expected-reference two-da-hak-tlk-pipeline.md `
  --expected-reference nui-player-ui.md `
  --expected-reference locations-areas-tilesets.md `
  --expected-reference testing-runtime-qa.md `
  --observed-reference [observed-reference.md] `
  --evidence-label [design-only|static-checked|runtime-tested|project-specific] `
  --evidence "[short observed behavior]" `
  --issue "[missing First Implementable Slice or weak behavior, if any]" `
  --missing-evidence "[runtime/module/log evidence still missing]" `
  --artifact "[filled returned capture sheet under docs\nwn-skill-pack\.codex-tmp\forward-test-return-captures\]" `
  --first-implementable-slice `
  --improvement-summary "[required for partial/fail; empty for pass]"
```

## FT-006: Economy And Progression

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

Pass and partial records must keep `--first-implementable-slice` only when reviewer scoring confirmed the answer names files/assets touched, expected proof, rollback, and evidence limits. Remove the flag for fail/not-run records.

```powershell
python docs\nwn-skill-pack\tools\forward_test_record.py new `
  --record-type prompt-forward-test `
  --test-id FT-006 `
  --id ft-006-economy-and-progression-fresh-thread `
  --title "FT-006 Economy And Progression" `
  --result [pass|partial|fail] `
  --tester "[tester]" `
  --context "[fresh context; model/build; no expected-answer leakage; raw answer captured before reviewer-only scoring]" `
  --prompt-or-command "@docs\nwn-skill-pack\forward-tests\prompts\ft-006-economy-progression.txt" `
  --skill-path "docs\nwn-skill-pack\draft-skills\nwn-server-gamedev" `
  --expected-reference economy-crafting-progression.md `
  --expected-reference items-equipment-loot.md `
  --expected-reference creatures-encounters-ai.md `
  --expected-reference testing-runtime-qa.md `
  --observed-reference [observed-reference.md] `
  --evidence-label [design-only|static-checked|runtime-tested|project-specific] `
  --evidence "[short observed behavior]" `
  --issue "[missing First Implementable Slice or weak behavior, if any]" `
  --missing-evidence "[runtime/module/log evidence still missing]" `
  --artifact "[filled returned capture sheet under docs\nwn-skill-pack\.codex-tmp\forward-test-return-captures\]" `
  --first-implementable-slice `
  --improvement-summary "[required for partial/fail; empty for pass]"
```

## FT-007: Quest, Dialogue, Journal

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

Pass and partial records must keep `--first-implementable-slice` only when reviewer scoring confirmed the answer names files/assets touched, expected proof, rollback, and evidence limits. Remove the flag for fail/not-run records.

```powershell
python docs\nwn-skill-pack\tools\forward_test_record.py new `
  --record-type prompt-forward-test `
  --test-id FT-007 `
  --id ft-007-quest-dialogue-journal-fresh-thread `
  --title "FT-007 Quest, Dialogue, Journal" `
  --result [pass|partial|fail] `
  --tester "[tester]" `
  --context "[fresh context; model/build; no expected-answer leakage; raw answer captured before reviewer-only scoring]" `
  --prompt-or-command "@docs\nwn-skill-pack\forward-tests\prompts\ft-007-quest-dialogue-journal.txt" `
  --skill-path "docs\nwn-skill-pack\draft-skills\nwn-server-gamedev" `
  --expected-reference quests-dialogues-journal.md `
  --expected-reference persistence-database-nwnx.md `
  --expected-reference economy-crafting-progression.md `
  --expected-reference testing-runtime-qa.md `
  --observed-reference [observed-reference.md] `
  --evidence-label [design-only|static-checked|runtime-tested|project-specific] `
  --evidence "[short observed behavior]" `
  --issue "[missing First Implementable Slice or weak behavior, if any]" `
  --missing-evidence "[runtime/module/log evidence still missing]" `
  --artifact "[filled returned capture sheet under docs\nwn-skill-pack\.codex-tmp\forward-test-return-captures\]" `
  --first-implementable-slice `
  --improvement-summary "[required for partial/fail; empty for pass]"
```

## FT-008: Feedback Contribution

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

Pass and partial records must keep `--first-implementable-slice` only when reviewer scoring confirmed the answer names files/assets touched, expected proof, rollback, and evidence limits. Remove the flag for fail/not-run records.

```powershell
python docs\nwn-skill-pack\tools\forward_test_record.py new `
  --record-type prompt-forward-test `
  --test-id FT-008 `
  --id ft-008-feedback-contribution-fresh-thread `
  --title "FT-008 Feedback Contribution" `
  --result [pass|partial|fail] `
  --tester "[tester]" `
  --context "[fresh context; model/build; no expected-answer leakage; raw answer captured before reviewer-only scoring]" `
  --prompt-or-command "@docs\nwn-skill-pack\forward-tests\prompts\ft-008-feedback-contribution.txt" `
  --skill-path "docs\nwn-skill-pack\draft-skills\nwn-server-gamedev" `
  --expected-reference feedback-and-versioning.md `
  --expected-reference nui-player-ui.md `
  --expected-reference testing-runtime-qa.md `
  --observed-reference [observed-reference.md] `
  --evidence-label [design-only|static-checked|runtime-tested|project-specific] `
  --evidence "[short observed behavior]" `
  --issue "[missing First Implementable Slice or weak behavior, if any]" `
  --missing-evidence "[runtime/module/log evidence still missing]" `
  --artifact "[filled returned capture sheet under docs\nwn-skill-pack\.codex-tmp\forward-test-return-captures\]" `
  --first-implementable-slice `
  --improvement-summary "[required for partial/fail; empty for pass]"
```

## FT-009: Aurora Local Intake Boundary

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

Pass and partial records must keep `--first-implementable-slice` only when reviewer scoring confirmed the answer names files/assets touched, expected proof, rollback, and evidence limits. Remove the flag for fail/not-run records.

```powershell
python docs\nwn-skill-pack\tools\forward_test_record.py new `
  --record-type prompt-forward-test `
  --test-id FT-009 `
  --id ft-009-aurora-local-intake-boundary-fresh-thread `
  --title "FT-009 Aurora Local Intake Boundary" `
  --result [pass|partial|fail] `
  --tester "[tester]" `
  --context "[fresh context; model/build; no expected-answer leakage; raw answer captured before reviewer-only scoring]" `
  --prompt-or-command "@docs\nwn-skill-pack\forward-tests\prompts\ft-009-aurora-local-intake-boundary.txt" `
  --skill-path "docs\nwn-skill-pack\draft-skills\nwn-server-gamedev" `
  --expected-reference source-registry.md `
  --expected-reference feedback-and-versioning.md `
  --expected-reference testing-runtime-qa.md `
  --expected-reference common-antipatterns.md `
  --observed-reference [observed-reference.md] `
  --evidence-label [design-only|static-checked|runtime-tested|project-specific] `
  --evidence "[short observed behavior]" `
  --issue "[missing First Implementable Slice or weak behavior, if any]" `
  --missing-evidence "[runtime/module/log evidence still missing]" `
  --artifact "[filled returned capture sheet under docs\nwn-skill-pack\.codex-tmp\forward-test-return-captures\]" `
  --first-implementable-slice `
  --improvement-summary "[required for partial/fail; empty for pass]"
```

## FT-010: Full Feature Server Slice

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

Pass and partial records must keep `--first-implementable-slice` only when reviewer scoring confirmed the answer names files/assets touched, expected proof, rollback, and evidence limits. Remove the flag for fail/not-run records.

```powershell
python docs\nwn-skill-pack\tools\forward_test_record.py new `
  --record-type prompt-forward-test `
  --test-id FT-010 `
  --id ft-010-full-feature-server-slice-fresh-thread `
  --title "FT-010 Full Feature Server Slice" `
  --result [pass|partial|fail] `
  --tester "[tester]" `
  --context "[fresh context; model/build; no expected-answer leakage; raw answer captured before reviewer-only scoring]" `
  --prompt-or-command "@docs\nwn-skill-pack\forward-tests\prompts\ft-010-full-feature-server-slice.txt" `
  --skill-path "docs\nwn-skill-pack\draft-skills\nwn-server-gamedev" `
  --expected-reference server-gamedev-capability-map.md `
  --expected-reference feature-design-output-template.md `
  --expected-reference locations-areas-tilesets.md `
  --expected-reference items-equipment-loot.md `
  --expected-reference creatures-encounters-ai.md `
  --expected-reference two-da-hak-tlk-pipeline.md `
  --expected-reference nwscript-events-systems.md `
  --expected-reference nui-player-ui.md `
  --expected-reference quests-dialogues-journal.md `
  --expected-reference economy-crafting-progression.md `
  --expected-reference persistence-database-nwnx.md `
  --expected-reference deployment-nwsync-ops.md `
  --expected-reference testing-runtime-qa.md `
  --observed-reference [observed-reference.md] `
  --evidence-label [design-only|static-checked|runtime-tested|project-specific] `
  --evidence "[short observed behavior]" `
  --issue "[missing First Implementable Slice or weak behavior, if any]" `
  --missing-evidence "[runtime/module/log evidence still missing]" `
  --artifact "[filled returned capture sheet under docs\nwn-skill-pack\.codex-tmp\forward-test-return-captures\]" `
  --artifact "docs\nwn-skill-pack\.codex-tmp\forward-test-reviews\full-slice-ft010\ft-010-review.md" `
  --first-implementable-slice `
  --improvement-summary "[required for partial/fail; empty for pass]"
```

## After Recording

```powershell
python docs\nwn-skill-pack\tools\forward_test_record.py validate docs\nwn-skill-pack\forward-tests\records\<record>.json
python docs\nwn-skill-pack\tools\forward_test_record.py aggregate docs\nwn-skill-pack\forward-tests\records --out docs\nwn-skill-pack\forward-tests\aggregate.md
python docs\nwn-skill-pack\tools\generate_release_readiness.py docs\nwn-skill-pack --out docs\nwn-skill-pack\release-readiness.md
python docs\nwn-skill-pack\tools\generate_package_inventory.py docs\nwn-skill-pack --out-json docs\nwn-skill-pack\package-inventory.json --out-md docs\nwn-skill-pack\package-inventory.md
```
