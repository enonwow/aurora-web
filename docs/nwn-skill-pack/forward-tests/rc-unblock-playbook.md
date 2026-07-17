# RC Unblock Playbook

## Purpose

Use this playbook when a maintainer wants to move `nwn-server-gamedev-pack` from `repo artifact` toward `release candidate` without leaking reviewer-only expected answers to the agent under test.

This file is repo-level handoff material. Do not place it inside the installed skill or plugin package.

## Inputs

- Current blocker report: `rc-blocker-burndown.md`
- Tester handoff for the minimal trio: `forward-tests/rc-prompt-test-handoff.md`
- Prompt execution queue: `forward-tests/execution-queue.md`
- Prompt files for the agent under test: `forward-tests/prompts/`
- Clean-session prompt pack builder: `tools/build_forward_test_clean_session_prompts.py`
- Clean-session prompt pack checker: `tools/check_forward_test_clean_session_prompts.py`
- Clean-session received-pack checker: `tools/check_forward_test_clean_session_received_pack.py`
- Preferred clean-session received inbox: `.codex-tmp/forward-test-clean-session-received/rc-minimum/inbox/`
- Answer capture template: `forward-tests/answer-capture-template.md`
- Returned-capture validator: `tools/check_forward_test_return_captures.py`
- Reviewer-only scoring packet: `forward-tests/reviewer-packet.md`
- Reviewer-only record commands: `forward-tests/record-command-templates.md`
- Record CLI: `tools/forward_test_record.py`

## No-Leak Rule

Give the agent under test exactly one prompt file and the skill path named in that prompt.

Do not give the agent under test:

- `forward-tests/reviewer-packet.md`
- `forward-tests/reviewer-matrix.json`
- `forward-tests/record-command-templates.md`
- `rc-blocker-burndown.md`
- this playbook
- expected references, scoring focus, or intended answer notes

## Phase 0: Refresh Static State

Run this before starting test contexts:

```powershell
python docs\nwn-skill-pack\tools\run_repo_artifact_preflight.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_release_gate.py docs\nwn-skill-pack --target release-candidate
python docs\nwn-skill-pack\tools\build_forward_test_clean_session_prompts.py docs\nwn-skill-pack --force
python docs\nwn-skill-pack\tools\check_forward_test_clean_session_received_pack.py docs\nwn-skill-pack
```

Expected current result before testing: `release-candidate` is blocked.
Expected prompt-pack result before testing: the received inbox exists and passes no-leak/hash checks.

## Phase 1: Minimal Prompt Forward Tests

Run these in fresh contexts, one clean-session prompt per context:

1. `FT-002`: `.codex-tmp/forward-test-clean-session-received/rc-minimum/inbox/prompts/ft-002-clean-session.md`
2. `FT-003`: `.codex-tmp/forward-test-clean-session-received/rc-minimum/inbox/prompts/ft-003-clean-session.md`
3. `FT-008`: `.codex-tmp/forward-test-clean-session-received/rc-minimum/inbox/prompts/ft-008-clean-session.md`

Use a fresh Codex context for each prompt. Do not let one test see outputs from another test.
For external testers, use `forward-tests/rc-prompt-test-handoff.md` as the sanitized handoff and still give the agent under test only one clean-session prompt file.

The original prompt source files remain:

- `FT-002`: `forward-tests/prompts/ft-002-custom-spear-2da-hak-tlk.txt`
- `FT-003`: `forward-tests/prompts/ft-003-nui-crafting-panel.txt`
- `FT-008`: `forward-tests/prompts/ft-008-feedback-contribution.txt`

## Phase 2: Review And Record

After each test, capture the raw answer and session facts with `forward-tests/answer-capture-template.md` before opening reviewer-only scoring material.

Validate the filled returned capture sheets before scoring:

```powershell
python docs\nwn-skill-pack\tools\check_forward_test_return_captures.py docs\nwn-skill-pack --captures docs\nwn-skill-pack\.codex-tmp\forward-test-return-captures
```

Blank initialized capture sheets must fail this gate. Treat that failure as the expected blocker until raw answers and session facts are pasted into the capture sheets.

Then, only after the returned-capture check passes, the reviewer reads the captured model output and scores it using `forward-tests/reviewer-packet.md`.

Record the outcome with the matching command shape from `forward-tests/record-command-templates.md`.

Every record must include:

- `--record-type prompt-forward-test`
- the matching `--test-id`
- `--result pass`, `partial`, `fail`, or `not-run`
- `--prompt-or-command` naming the exact prompt file
- `--skill-path` naming the tested skill path
- observed references or missing evidence
- `--improvement-needed` and `--improvement-summary` when the result is `partial` or `fail`

Then validate the record and regenerate the aggregate:

```powershell
python docs\nwn-skill-pack\tools\forward_test_record.py validate docs\nwn-skill-pack\forward-tests\records
python docs\nwn-skill-pack\tools\forward_test_record.py aggregate docs\nwn-skill-pack\forward-tests\records --out docs\nwn-skill-pack\forward-tests\aggregate.md
```

## Phase 3: Recheck RC Gate

After all three prompt-forward-test records exist:

```powershell
python docs\nwn-skill-pack\tools\run_repo_artifact_preflight.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_release_gate.py docs\nwn-skill-pack --target release-candidate
```

If the gate still blocks, update `version-manifest.json`, the concrete handoff under `release-handoffs/`, or the failing records only after reading the blocker text. Do not set `release_gate.rc_allowed=true` while prompt tests, coverage, install-smoke, or handoff evidence is still missing.

## Phase 4: Install-Smoke Comes After RC Evidence

After prompt-forward-test evidence is real, prepare the install-smoke handoff:

```powershell
python docs\nwn-skill-pack\tools\generate_install_smoke_packet.py docs\nwn-skill-pack --out docs\nwn-skill-pack\forward-tests\install-smoke-packet.md
python docs\nwn-skill-pack\tools\check_install_smoke_packet.py docs\nwn-skill-pack
```

Run INSTALL-001 in a fresh context that has the local marketplace sandbox configured. Preparation commands alone are not an install-smoke pass.

## Verified

- This playbook is derived from the current release gate, `rc-blocker-burndown.md`, `forward-tests/reviewer-matrix.json`, and the forward-test tooling.
- `FT-002`, `FT-003`, and `FT-008` are the minimal planned prompt trio for the current blocker set.
- `forward-tests/rc-prompt-test-handoff.md` is generated from the current matrix but includes only prompt paths and capture instructions, not reviewer-only expected references.
- `.codex-tmp/forward-test-clean-session-received/rc-minimum/inbox/` is the preferred prompt source for the clean tester after `tools/check_forward_test_clean_session_received_pack.py` passes.
- Reviewer-only artifacts exist to keep expected references out of the test prompt.
- The answer capture template records raw session facts before reviewer-only scoring begins.
- `tools/check_forward_test_return_captures.py` blocks blank or incomplete returned capture sheets before reviewer-only scoring begins.

## Still Hypothesis

- The planned trio may still fail in fresh contexts.
- The clean-session received-pack checker proves transport hygiene only; it does not prove a fresh Codex thread ran or returned an answer.
- Passing prompt forward tests does not prove NWN runtime behavior.
- Passing install-smoke proves discovery and invocation in one environment, not public marketplace readiness.
