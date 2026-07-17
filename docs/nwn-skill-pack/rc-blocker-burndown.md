# Release-Candidate Blocker Burn-Down

Generated from package metadata last updated: 2026-06-19T04:09:42Z

## Package

- Package: `nwn-server-gamedev-pack`
- Version: `0.1.0`
- State: `repo artifact`
- Target gate: `release-candidate`

## Current Gate Result

- `BLOCKED` Release-candidate gate has 11 blocker(s).

## Blockers

- accepted prompt forward tests run: 0; required: 3
- coverage missing: NUI
- coverage missing: 2DA/HAK/TLK or packaging
- coverage missing: runtime QA
- coverage missing: economy/progression
- coverage missing: human feedback contribution
- version manifest does not allow RC
- manifest blocker: At least three accepted independent prompt forward tests with fresh/no-leak context and answer-capture artifacts have not been run.
- manifest blocker: No local marketplace install or reinstall smoke test has been recorded.
- manifest blocker: Concrete release handoff is filled only for repo-artifact review, not release-candidate or install handoff.
- release handoff is still marked as repo artifact or unfilled

## Minimal Forward-Test Path

Run these first in fresh contexts, one prompt per context, then score with `forward-tests/reviewer-packet.md`:

- `FT-002` `Custom Item Plus 2DA/HAK/TLK Impact`: `forward-tests/prompts/ft-002-custom-spear-2da-hak-tlk.txt`; expected coverage: `items-equipment-loot.md`, `two-da-hak-tlk-pipeline.md`, `nwscript-events-systems.md`, `testing-runtime-qa.md`
- `FT-003` `NUI Crafting Panel`: `forward-tests/prompts/ft-003-nui-crafting-panel.txt`; expected coverage: `nui-player-ui.md`, `economy-crafting-progression.md`, `nwscript-events-systems.md`, `testing-runtime-qa.md`
- `FT-008` `Feedback Contribution`: `forward-tests/prompts/ft-008-feedback-contribution.txt`; expected coverage: `feedback-and-versioning.md`, `nui-player-ui.md`, `testing-runtime-qa.md`

Why this trio:

- It gives the required three independent prompt forward tests.
- It covers NUI through FT-003 and FT-008.
- It covers 2DA/HAK/TLK or packaging through FT-002.
- It covers runtime QA through all three prompts.
- It covers economy/progression through FT-003.
- It covers human feedback contribution through FT-008.

## Return-Capture Gate Before Scoring

After the fresh contexts answer, initialize or fill the capture sheets for the same trio and run the returned-capture check before opening reviewer-only materials:

```powershell
python docs\nwn-skill-pack\tools\init_forward_test_capture.py docs\nwn-skill-pack --test-id FT-002 --out docs\nwn-skill-pack\.codex-tmp\forward-test-return-captures\ft-002-capture.md
python docs\nwn-skill-pack\tools\init_forward_test_capture.py docs\nwn-skill-pack --test-id FT-003 --out docs\nwn-skill-pack\.codex-tmp\forward-test-return-captures\ft-003-capture.md
python docs\nwn-skill-pack\tools\init_forward_test_capture.py docs\nwn-skill-pack --test-id FT-008 --out docs\nwn-skill-pack\.codex-tmp\forward-test-return-captures\ft-008-capture.md
python docs\nwn-skill-pack\tools\check_forward_test_return_captures.py docs\nwn-skill-pack --captures docs\nwn-skill-pack\.codex-tmp\forward-test-return-captures
```

Blank initialized capture sheets must fail this gate. Treat that failure as the expected blocker until raw answers and session facts are pasted into the capture sheets.

Do not score with `forward-tests/reviewer-packet.md` until `check_forward_test_return_captures.py` passes on filled returned captures.

## Install-Smoke Path

After RC evidence exists, run the install-smoke handoff instead of treating sandbox generation as proof:

```powershell
python docs\nwn-skill-pack\tools\generate_install_smoke_packet.py docs\nwn-skill-pack --out docs\nwn-skill-pack\forward-tests\install-smoke-packet.md
python docs\nwn-skill-pack\tools\check_install_smoke_packet.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_install_smoke_playbook.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_install_smoke_records.py docs\nwn-skill-pack
```

Then record the actual result with `tools/forward_test_record.py`; a pass requires `install_verification` from a fresh Codex context that discovers and invokes the plugin/skill.

For the short human execution packet, refresh `forward-tests/minimum-rc-proof-packet.md`.

## Required Refresh Commands

```powershell
python docs\nwn-skill-pack\tools\generate_minimum_rc_proof_packet.py docs\nwn-skill-pack --out docs\nwn-skill-pack\forward-tests\minimum-rc-proof-packet.md
python docs\nwn-skill-pack\tools\check_minimum_rc_proof_packet.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_rc_blocker_burndown.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\run_repo_artifact_preflight.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_release_gate.py docs\nwn-skill-pack --target release-candidate
```

## Verified

- This burn-down is generated from `version-manifest.json`, `forward-tests/reviewer-matrix.json`, and `tools/check_release_gate.py`.
- The current repo-artifact preflight can pass while the release-candidate gate remains blocked.

## Still Hypothesis

- The recommended forward-test trio is a planning shortcut, not test evidence.
- A fresh Codex context may still expose trigger, installation, or answer-quality issues.
- Passing static checks does not prove NWN runtime behavior.
