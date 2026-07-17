# NWN Skill Pack Release Readiness

Generated: 2026-06-19T09:43:29+00:00

## Package

- Package: `nwn-server-gamedev-pack`
- Version: `0.1.0`
- State: `repo artifact`
- Skill: `nwn-server-gamedev`

## Gate Summary

- `BLOCKED` At least three prompt forward tests
- `BLOCKED` At least one install smoke test has accepted pass evidence
- `PASS` No failed forward tests
- `PASS` No partial tests without improvement action
- `BLOCKED` Version manifest allows RC

## Active Blockers

- At least three accepted independent prompt forward tests with fresh/no-leak context and answer-capture artifacts have not been run.
- No local marketplace install or reinstall smoke test has been recorded.
- Concrete release handoff is filled only for repo-artifact review, not release-candidate or install handoff.

## Forward Tests

- Records: 4
- Prompt forward tests: 0
- Install smoke tests: 0
- Accepted passed install smoke tests: 0

Result counts:

- `pass`: 4

Record type counts:

- `static-check`: 4

## Feedback Records

- Records: 2

Status counts:

- `rejected`: 1
- `unverified`: 1

Source type counts:

- `codex-session`: 2

## Required Verification Commands

```powershell
python docs\nwn-skill-pack\tools\run_repo_artifact_preflight.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_version_manifest.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_release_handoff.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_release_readiness.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\generate_release_notes_draft.py docs\nwn-skill-pack --out docs\nwn-skill-pack\release-notes-draft.md
python docs\nwn-skill-pack\tools\check_release_notes_draft.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\generate_release_next_actions.py docs\nwn-skill-pack --out docs\nwn-skill-pack\release-next-actions.md
python docs\nwn-skill-pack\tools\check_release_next_actions.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\generate_release_evidence_index.py docs\nwn-skill-pack --out docs\nwn-skill-pack\release-evidence-index.md
python docs\nwn-skill-pack\tools\check_release_evidence_index.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\generate_aurora_live_promotion_proof_gates.py docs\nwn-skill-pack --out docs\nwn-skill-pack\aurora-live-promotion-proof-gates.md
python docs\nwn-skill-pack\tools\check_aurora_live_promotion_proof_gates.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\generate_rc_blocker_burndown.py docs\nwn-skill-pack --out docs\nwn-skill-pack\rc-blocker-burndown.md
python docs\nwn-skill-pack\tools\check_rc_blocker_burndown.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\generate_minimum_rc_proof_packet.py docs\nwn-skill-pack --out docs\nwn-skill-pack\forward-tests\minimum-rc-proof-packet.md
python docs\nwn-skill-pack\tools\check_minimum_rc_proof_packet.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_rc_unblock_playbook.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_record_contracts.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_feedback_intake_docs.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_feedback_review_rubric.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_reference_promotion_proposal_template.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_reference_promotion_proposal_tool.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\reference_promotion_record.py aggregate docs\nwn-skill-pack\knowledge-inbox\reference-promotions\records --out docs\nwn-skill-pack\knowledge-inbox\reference-promotions\aggregate.md
python docs\nwn-skill-pack\tools\check_reference_promotion_records.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_contributor_intake_quickstart.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_model_import_policy.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_knowledge_index_policy.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_architecture_scorecard.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_architecture_decisions.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_maintainer_decision_index.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_versioning_policy.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\generate_version_bump_plan.py docs\nwn-skill-pack --out docs\nwn-skill-pack\version-bump-plan.md
python docs\nwn-skill-pack\tools\check_version_bump_plan.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_external_source_registry.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_domain_reference_status.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_capability_map.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_feature_design_template.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\generate_feedback_promotion_backlog.py docs\nwn-skill-pack --out docs\nwn-skill-pack\knowledge-inbox\promotion-backlog.md
python docs\nwn-skill-pack\tools\generate_feedback_intake_status.py docs\nwn-skill-pack --out docs\nwn-skill-pack\feedback-intake-status.md
python docs\nwn-skill-pack\tools\check_feedback_intake_status.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\generate_package_inventory.py docs\nwn-skill-pack --out-json docs\nwn-skill-pack\package-inventory.json --out-md docs\nwn-skill-pack\package-inventory.md
python docs\nwn-skill-pack\tools\check_package_inventory.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_package_boundaries.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\generate_forward_test_execution_queue.py docs\nwn-skill-pack --out docs\nwn-skill-pack\forward-tests\execution-queue.md
python docs\nwn-skill-pack\tools\generate_forward_test_reviewer_packet.py docs\nwn-skill-pack --out docs\nwn-skill-pack\forward-tests\reviewer-packet.md
python docs\nwn-skill-pack\tools\generate_forward_test_record_templates.py docs\nwn-skill-pack --out docs\nwn-skill-pack\forward-tests\record-command-templates.md
python docs\nwn-skill-pack\tools\check_forward_test_prompts.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\build_plugin_install_candidate.py docs\nwn-skill-pack --force
python docs\nwn-skill-pack\tools\build_local_marketplace_candidate.py docs\nwn-skill-pack --force
python docs\nwn-skill-pack\tools\check_install_candidate.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_isolated_install_layout.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\generate_install_smoke_packet.py docs\nwn-skill-pack --out docs\nwn-skill-pack\forward-tests\install-smoke-packet.md
python docs\nwn-skill-pack\tools\check_install_smoke_packet.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_install_smoke_playbook.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_install_smoke_records.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_plugin_package.py docs\nwn-skill-pack
python docs\nwn-skill-pack\tools\check_release_gate.py docs\nwn-skill-pack --target repo-artifact
python docs\nwn-skill-pack\tools\check_skill_routes.py docs\nwn-skill-pack\draft-skills\nwn-server-gamedev
python docs\nwn-skill-pack\tools\check_skill_routes.py docs\nwn-skill-pack\draft-plugins\nwn-server-gamedev-pack\skills\nwn-server-gamedev
```

## Candidate Gate Commands

These are stricter candidate checks. A filled repo-artifact handoff can pass the handoff check, but staged release gates must still block until the claimed package state and evidence exist:

```powershell
python docs\nwn-skill-pack\tools\check_release_handoff.py docs\nwn-skill-pack --require-filled
python docs\nwn-skill-pack\tools\check_release_gate.py docs\nwn-skill-pack --target release-candidate
python docs\nwn-skill-pack\tools\check_release_gate.py docs\nwn-skill-pack --target install-candidate
```

## Maintainer Handoff Before Candidate Promotion

- Read `release-evidence-index.md` and `aurora-live-promotion-proof-gates.md` before changing `package_state` away from `repo artifact`.
- Treat local Aurora reverse/thread leads from `local-aurora-reverse-ingestion.md`, `local-thread-019ed62e-aurora-ui-gallery-intake.md`, and `local-aurora-live-gap-queue.md` as release-routing evidence only; they do not unblock release-candidate or install-candidate gates without reviewed Aurora live records or exact blockers routed through `maintainer-decision-index.md`.
- Treat the proof-gates dashboard as control evidence only; it summarizes blockers and does not prove NWN runtime behavior or automatic skill improvement.
- Do not claim the skill was strengthened until real pass retest records, bridge candidates, accepted maintainer decisions, reference patch/release sync, and release-candidate gate clearance are all present.
- This handoff does not replace prompt forward tests, install smoke tests, privacy review, or release handoff review.

## Aurora Live Review Outcome Gate

- `check_release_gate.py` validates `knowledge-inbox/aurora-live-review-outcomes/records` with `aurora_live_review_outcome_record.py` contextual validation.
- When a review outcome has a local `live_record_path`, accepted atoms are checked against the linked Aurora live record; the Minimum First Live Pass cannot be accepted until every required atom has returned evidence or an exact blocker.
- Missing or unavailable live records remain maintainer-risk cases. They are not NWN runtime proof.

## Interpretation

This report summarizes local release metadata and records. It does not prove NWN runtime correctness.
