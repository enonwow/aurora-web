# Forward-Test Execution Queue

Generated from package metadata last updated: 2026-06-19T04:09:42Z

## Purpose

Use this no-answer-leak queue to schedule the reviewer-matrix prompt forward tests.
Do not give this file to the agent under test; give the agent exactly one prompt file.

## Summary

- Prompt tests passed: 0
- Prompt tests pending: 10
- Prompt tests required before RC: 3

## Queue

| Test | Title | Prompt file | State | Records | Next action |
| --- | --- | --- | --- | ---: | --- |
| `FT-001` | Low-Level Forest Area | `forward-tests/prompts/ft-001-low-level-forest-area.txt` | `pending` | 0 | Run `forward-tests/prompts/ft-001-low-level-forest-area.txt` in a fresh context, capture the raw answer, run `check_forward_test_return_captures.py`, then score with `reviewer-packet.md`. |
| `FT-002` | Custom Item Plus 2DA/HAK/TLK Impact | `forward-tests/prompts/ft-002-custom-spear-2da-hak-tlk.txt` | `pending` | 0 | Run `forward-tests/prompts/ft-002-custom-spear-2da-hak-tlk.txt` in a fresh context, capture the raw answer, run `check_forward_test_return_captures.py`, then score with `reviewer-packet.md`. |
| `FT-003` | NUI Crafting Panel | `forward-tests/prompts/ft-003-nui-crafting-panel.txt` | `pending` | 0 | Run `forward-tests/prompts/ft-003-nui-crafting-panel.txt` in a fresh context, capture the raw answer, run `check_forward_test_return_captures.py`, then score with `reviewer-packet.md`. |
| `FT-004` | Persistence And Restart Safety | `forward-tests/prompts/ft-004-persistence-restart-safety.txt` | `pending` | 0 | Run `forward-tests/prompts/ft-004-persistence-restart-safety.txt` in a fresh context, capture the raw answer, run `check_forward_test_return_captures.py`, then score with `reviewer-packet.md`. |
| `FT-005` | Release Review | `forward-tests/prompts/ft-005-release-review.txt` | `pending` | 0 | Run `forward-tests/prompts/ft-005-release-review.txt` in a fresh context, capture the raw answer, run `check_forward_test_return_captures.py`, then score with `reviewer-packet.md`. |
| `FT-006` | Economy And Progression | `forward-tests/prompts/ft-006-economy-progression.txt` | `pending` | 0 | Run `forward-tests/prompts/ft-006-economy-progression.txt` in a fresh context, capture the raw answer, run `check_forward_test_return_captures.py`, then score with `reviewer-packet.md`. |
| `FT-007` | Quest, Dialogue, Journal | `forward-tests/prompts/ft-007-quest-dialogue-journal.txt` | `pending` | 0 | Run `forward-tests/prompts/ft-007-quest-dialogue-journal.txt` in a fresh context, capture the raw answer, run `check_forward_test_return_captures.py`, then score with `reviewer-packet.md`. |
| `FT-008` | Feedback Contribution | `forward-tests/prompts/ft-008-feedback-contribution.txt` | `pending` | 0 | Run `forward-tests/prompts/ft-008-feedback-contribution.txt` in a fresh context, capture the raw answer, run `check_forward_test_return_captures.py`, then score with `reviewer-packet.md`. |
| `FT-009` | Aurora Local Intake Boundary | `forward-tests/prompts/ft-009-aurora-local-intake-boundary.txt` | `pending` | 0 | Run the boundary handoff `forward-tests/ft-009-local-intake-clean-session-handoff.md` in a fresh context, then validate its returned capture before reviewer scoring. |
| `FT-010` | Full Feature Server Slice | `forward-tests/prompts/ft-010-full-feature-server-slice.txt` | `pending` | 0 | Run the boundary handoff `forward-tests/ft-010-full-slice-clean-session-handoff.md` in a fresh context, then validate its returned capture before reviewer scoring. |

## Boundary Test Lanes

- `FT-009` uses `forward-tests/ft-009-local-intake-clean-session-handoff.md` for custom clean-session, received-pack, and returned-capture checks. It is additional boundary coverage, not part of the minimum RC trio.
- `FT-010` uses `forward-tests/ft-010-full-slice-clean-session-handoff.md` for custom clean-session, received-pack, and returned-capture checks. It is additional boundary coverage, not part of the minimum RC trio.

## Reviewer Files

- Give the agent only one file from `forward-tests/prompts/`.
- Use `forward-tests/tester-packet.md` for no-answer-leak tester workflow.
- Use `forward-tests/answer-capture-template.md` or `tools/init_forward_test_capture.py` before reviewer-only scoring.
- Run `tools/check_forward_test_return_captures.py --captures <returned-captures-dir>` before opening `forward-tests/reviewer-packet.md`; blank initialized capture sheets must fail this gate.
- Use `forward-tests/reviewer-packet.md` only after the returned-capture check passes.
- Use `forward-tests/record-command-templates.md` only when recording results.

## Refresh Commands

```powershell
python docs\nwn-skill-pack\tools\check_forward_test_prompts.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\forward_test_record.py aggregate docs\nwn-skill-pack\forward-tests\records --out docs\nwn-skill-pack\forward-tests\aggregate.md
python docs\nwn-skill-pack\tools\generate_release_readiness.py docs\nwn-skill-pack --out docs\nwn-skill-pack\release-readiness.md
python docs\nwn-skill-pack\tools\generate_package_inventory.py docs\nwn-skill-pack --out-json docs\nwn-skill-pack\package-inventory.json --out-md docs\nwn-skill-pack\package-inventory.md
```

This queue is scheduling evidence only. It does not prove that any fresh-context prompt test has passed.
