# NWN Skill Pack Release Next Actions

Generated: 2026-06-19T09:43:30+00:00

## Current State

- Package: `nwn-server-gamedev-pack`
- Version: `0.1.0`
- State: `repo artifact`
- Proposed SemVer class: `NONE`
- Proposed next version: `0.1.0`
- Static package records: 4
- Prompt forward tests: 0
- Install smoke tests: 0
- Accepted install smoke tests: 0

## Gate Snapshot

| Target | Status | Checks | Warnings | Blockers |
| --- | --- | ---: | ---: | ---: |
| `repo-artifact` | PASS | 5 | 1 | 0 |
| `release-candidate` | BLOCKED | 6 | 0 | 11 |
| `install-candidate` | BLOCKED | 6 | 0 | 12 |

## Ordered Next Actions

1. Keep the package state as `repo artifact` until stricter gates pass.
2. Run the minimum no-answer-leak prompt-forward tests for RC:
   - `forward-tests/prompts/ft-002-custom-spear-2da-hak-tlk.txt`
   - `forward-tests/prompts/ft-003-nui-crafting-panel.txt`
   - `forward-tests/prompts/ft-008-feedback-contribution.txt`
3. Build `.codex-tmp/forward-test-dispatch/rc-minimum/` with `tools/build_forward_test_dispatch_bundle.py`, then give that no-leak bundle to the clean tester.
4. Build `.codex-tmp/forward-test-clean-session-prompts/rc-minimum/` with `tools/build_forward_test_clean_session_prompts.py`, then run `tools/check_forward_test_clean_session_received_pack.py` to prove the copied prompt pack still passes no-leak/hash checks.
5. Paste exactly one clean-session prompt file into each fresh Codex thread.
6. Initialize or use the included capture sheets from `tools/init_forward_test_capture.py`, then capture each raw answer before opening reviewer-only materials with `forward-tests/answer-capture-template.md`.
7. Run `tools/check_forward_test_return_captures.py --captures <returned-captures-dir>` before reviewer scoring; blank dispatch capture sheets must fail this gate.
8. Score after the return-capture check with `forward-tests/reviewer-packet.md` and record results with `tools/forward_test_record.py`.
9. Optional boundary lane: run `forward-tests/ft-009-local-intake-clean-session-handoff.md` to test Aurora local-intake handling; if you only have local Aurora reverse/thread leads, route through `local-aurora-reverse-ingestion.md`, `local-thread-019ed62e-aurora-ui-gallery-intake.md`, `local-aurora-small-location-live-operator-checklist.md`, `local-aurora-live-gap-queue.md`, and `maintainer-decision-index.md` before patching references. If doing live Toolset evidence intake, run the prepared-only smoke test in `knowledge-inbox/aurora-live-first-session-command-sheet.md` with `tools/check_prepare_aurora_live_session.py` and `tools/check_aurora_live_status.py` before opening Toolset. This does not replace the RC minimum trio.
10. Recommended full-slice probe: run `forward-tests/ft-010-full-slice-clean-session-handoff.md` to test the hub-to-dungeon vertical slice path across locations, items, creatures, 2DA/HAK/TLK, NWScript, NUI, quests, economy, persistence, deployment, and QA. After the returned-capture check passes, initialize the reviewer worksheet with `tools/init_ft010_full_slice_review.py --capture .codex-tmp\forward-test-return-captures\full-slice-ft010\ft-010-capture.md --out .codex-tmp\forward-test-reviews\full-slice-ft010\ft-010-review.md`. Treat it as extra prompt-forward evidence after a filled capture sheet and reviewer scoring, not as automatic RC proof.
11. Run or hand off `INSTALL-001` with `forward-tests/install-smoke-execution-playbook.md` and `forward-tests/install-smoke-packet.md`.
12. If outside-builder contribution is the next lane, send `.codex-tmp/external-trial-dispatch/ext-001/` and record the result with `tools/external_trial_record.py`.
13. For the Aurora live retest promotion lane, regenerate `aurora-live-promotion-proof-gates.md` with `tools/generate_aurora_live_promotion_proof_gates.py`, run `tools/check_aurora_live_promotion_proof_gates.py`, and keep every proof gate blocked until real retest, maintainer decision, reference patch, and release metadata evidence exists.
14. Only after accepted records exist, regenerate feedback intake status, promotion aggregate, version bump plan, release notes, proof-gates dashboard, and this dashboard.

## Current Release-Candidate Blockers

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

## Current Install-Candidate Blockers

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
- no passed install-smoke-test record

## Refresh Commands

```powershell
python docs\nwn-skill-pack\tools\run_repo_artifact_preflight.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\build_forward_test_clean_session_prompts.py docs\nwn-skill-pack --force
python docs\nwn-skill-pack\tools\check_forward_test_clean_session_prompts.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_forward_test_clean_session_received_pack.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_release_gate.py docs\nwn-skill-pack --target release-candidate
python docs\nwn-skill-pack\tools\check_release_gate.py docs\nwn-skill-pack --target install-candidate
python docs\nwn-skill-pack\tools\generate_aurora_live_promotion_proof_gates.py docs\nwn-skill-pack --out docs\nwn-skill-pack\aurora-live-promotion-proof-gates.md
python docs\nwn-skill-pack\tools\check_aurora_live_promotion_proof_gates.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\generate_release_next_actions.py docs\nwn-skill-pack --out docs\nwn-skill-pack\release-next-actions.md
python docs\nwn-skill-pack\tools\check_release_next_actions.py docs\nwn-skill-pack
```

## Does Not Prove

This dashboard proves only that current local release blockers were summarized. The forward-test dispatch bundle and proof-gates dashboard are transport/control scaffolding, not prompt evidence or runtime evidence. This dashboard does not run prompt-forward tests, install the plugin, prove external tester independence, promote human feedback, patch references, or prove NWN runtime behavior.
