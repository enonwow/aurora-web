# Aurora Live Promotion Proof Gates

Generated: 2026-06-19T09:43:28+00:00

## Current Package

- Package: `nwn-server-gamedev-pack`
- Version: `0.1.0`
- State: `repo artifact`
- Retest records path: `knowledge-inbox/aurora-live-retest-results/records`
- Promotion decision records path: `knowledge-inbox/reference-promotions/records`
- Promotion bridge report: `knowledge-inbox/aurora-live-retest-promotion-bridge.md`

## Input Snapshot

- Valid Aurora live retest result records: 0
- Valid pass retest records: 0
- Invalid Aurora live retest result records: 0
- Bridge status: `no-promotion-candidates`
- Bridge promotion candidates: 0
- Bridge held records: 0
- Bridge invalid records: 0
- Valid promotion decision records: 0
- Accepted promotion decision records: 0
- Release-ready accepted promotion records: 0
- Invalid promotion decision records: 0
- Release-candidate blockers: 11

## Gate Snapshot

| Gate | Status | Evidence | Next action |
| --- | --- | --- | --- |
| `source-retail-retest-pass-records` | BLOCKED | 0 pass retest record(s) | Run/receive Aurora live retest and validate the result record. |
| `promotion-bridge-candidates` | BLOCKED | status `no-promotion-candidates`, candidates 0 | Regenerate the bridge after accepted pass retest records exist. |
| `maintainer-promotion-decision` | BLOCKED | 0 accepted promotion decision record(s) | Use aurora_live_retest_promotion_decision.py after maintainer review. |
| `reference-patch-and-release-sync` | BLOCKED | 0 release-ready accepted promotion record(s) | Patch authoring/plugin references and update release metadata before accepting. |
| `release-candidate-gate` | BLOCKED | 11 release-candidate blocker(s) | Clear release-candidate blockers without treating proof scaffolding as runtime evidence. |

## Retest Result Counts

- none

## Promotion Decision Counts

- none

## Current Blocking Path

1. Produce a validated Aurora live retest result record with `result=pass` and maintainer privacy verification.
2. Regenerate `knowledge-inbox/aurora-live-retest-promotion-bridge.md` and confirm it reports promotion candidates.
3. Patch both authoring and plugin-packaged references; do not patch from a synthetic or blocked retest.
4. Create an accepted promotion decision record with `tools/aurora_live_retest_promotion_decision.py` only after the patch and release metadata are real.
5. Regenerate promotion aggregate, release readiness, release evidence index, version bump plan, and this dashboard.
6. Run release-candidate and install-candidate gates; keep package state as `repo artifact` until those gates pass.

## Release-Candidate Blockers

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

## Verification Commands

```powershell
python docs\nwn-skill-pack\tools\check_aurora_live_retest_result_records.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_aurora_live_retest_promotion_bridge.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_aurora_live_retest_promotion_decision.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_reference_promotion_records.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_release_gate.py docs\nwn-skill-pack --target release-candidate
python docs\nwn-skill-pack\tools\generate_aurora_live_promotion_proof_gates.py docs\nwn-skill-pack --out docs\nwn-skill-pack\aurora-live-promotion-proof-gates.md
python docs\nwn-skill-pack\tools\check_aurora_live_promotion_proof_gates.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\run_repo_artifact_preflight.py docs\nwn-skill-pack
```

## Does Not Prove

This dashboard summarizes local gates only. It does not prove screenshot truth, log truth, external operator independence, NWN runtime correctness, privacy safety beyond maintainer review, release readiness, public distribution, or automatic skill improvement.
