#!/usr/bin/env python3
"""Check the maintainer decision index for required routes and boundaries."""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


INDEX = Path("maintainer-decision-index.md")


@dataclass
class DecisionIndexCheck:
    checks: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)

    def ok(self, message: str) -> None:
        self.checks.append(message)

    def error(self, message: str) -> None:
        self.errors.append(message)


def load_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, dict):
        raise ValueError(f"{path} must contain a JSON object")
    return data


def run(root: Path) -> DecisionIndexCheck:
    result = DecisionIndexCheck()
    index_path = root / INDEX
    if not index_path.exists():
        result.error(f"{INDEX} is missing")
        return result

    text = index_path.read_text(encoding="utf-8")
    manifest = load_json(root / "version-manifest.json")

    required_tokens = [
        "Decision Table",
        "Required Maintenance Loop",
        "Verified",
        "Still Hypothesis",
        "repo artifact",
        "skill plus plugin first",
        "human feedback",
        "feedback review rubric",
        "feedback intake status",
        "reference patch proposal",
        "model-import",
        "prompt forward tests",
        "install-smoke",
        "release notes draft",
        "release next-actions",
        "version-manifest.json",
        "release-candidate",
        "install-candidate",
        "repo template",
        "MCP",
        "architecture scorecard",
        "knowledge index policy",
        "workflow tooling",
        "docs/RAG",
        "RAG should include reviewed records only",
        "Preparation commands are not install evidence.",
        "Model agreement is not verification.",
        "Planned tests are not test evidence.",
        "run_repo_artifact_preflight.py",
        "Schema Expansion Gate",
        "knowledge-inbox/aurora-live-first-session-command-sheet.md",
        "knowledge-inbox/aurora-live-first-review-command-sheet.md",
        "knowledge-inbox/templates/aurora-live-review-outcome-record-template.json",
        "tools/aurora_live_review_outcome_record.py",
        "accept-for-proposal",
        "local Aurora reverse/thread leads",
        "local-aurora-reverse-ingestion.md",
        "local-thread-019ed62e-aurora-ui-gallery-intake.md",
        "local-aurora-symbol-index.md",
        "local-aurora-live-gap-queue.md",
        "Local reverse/thread leads are routing material",
        "new Aurora live-record atom",
        "current core-atom model loses important workflow",
    ]
    for token in required_tokens:
        if token not in text:
            result.error(f"{INDEX} missing token: {token}")
    if not result.errors:
        result.ok("decision index includes required workflow, evidence, and escalation tokens")

    manifest_paths = [
        "authoring_skill",
        "plugin_skill",
        "rc_blocker_burndown",
        "rc_unblock_playbook",
        "install_smoke_packet",
        "install_smoke_execution_playbook",
        "contribution_bundle_format",
        "contribution_bundle_roundtrip_check",
        "contributor_intake_quickstart",
        "external_contributor_trial_packet",
        "external_contributor_trial_result_template",
        "external_contributor_trial_record_tool",
        "external_contributor_trial_aggregate",
        "external_contributor_trial_handoff",
        "external_contributor_trial_public_packet_builder",
        "external_contributor_trial_public_packet_check",
        "model_import_policy",
        "knowledge_index_policy",
        "knowledge_index_policy_check",
        "local_aurora_reverse_ingestion",
        "local_thread_019ed62e_intake",
        "local_aurora_symbol_index",
        "local_aurora_small_location_live_operator_checklist",
        "local_aurora_reverse_scope_check",
        "local_aurora_live_gap_queue",
        "aurora_live_operator_execution_packet",
        "aurora_live_operator_execution_packet_check",
        "aurora_live_return_packet",
        "aurora_live_return_packet_check",
        "aurora_live_return_roundtrip_check",
        "aurora_live_session_preparer",
        "aurora_live_session_preparer_check",
        "aurora_live_record_initializer",
        "aurora_live_record_initializer_check",
        "aurora_live_records_check",
        "aurora_live_redaction_policy",
        "aurora_live_redaction_policy_check",
        "aurora_live_visual_redaction_checklist",
        "aurora_live_visual_redaction_checklist_check",
        "aurora_live_visual_redaction_record_tool",
        "aurora_live_visual_redaction_record_schema",
        "aurora_live_visual_redaction_record_aggregate",
        "aurora_live_visual_redaction_record_check",
        "aurora_live_evidence_manifest_template",
        "aurora_live_evidence_manifest_initializer",
        "aurora_live_evidence_manifest_initializer_check",
        "aurora_live_evidence_manifest_check",
        "aurora_live_intake_consistency_check",
        "aurora_live_record_review_checklist",
        "aurora_live_record_review_checklist_check",
        "aurora_live_review_outcome_record_tool",
        "aurora_live_review_outcome_record_schema",
        "aurora_live_review_outcome_record_template",
        "aurora_live_review_outcome_record_aggregate",
        "aurora_live_review_outcome_record_check",
        "aurora_live_review_queue",
        "aurora_live_review_queue_generator",
        "aurora_live_review_queue_check",
        "aurora_live_status",
        "aurora_live_status_generator",
        "aurora_live_status_check",
        "feedback_release_workflow",
        "feedback_review_rubric",
        "feedback_review_rubric_check",
        "feedback_intake_status",
        "feedback_intake_status_generator",
        "feedback_intake_status_check",
        "reference_promotion_proposal_template",
        "reference_promotion_proposal_template_check",
        "reference_promotion_proposal_generator",
        "reference_promotion_proposal_generator_check",
        "reference_promotion_record_tool",
        "reference_promotion_record_schema",
        "reference_promotion_record_aggregate",
        "reference_promotion_record_check",
        "architecture_scorecard",
        "architecture_scorecard_check",
        "architecture_decision",
        "versioning_policy",
        "version_bump_plan",
        "version_bump_plan_generator",
        "version_bump_plan_check",
        "release_notes_draft",
        "release_notes_draft_generator",
        "release_notes_draft_check",
        "release_next_actions",
        "release_next_actions_generator",
        "release_next_actions_check",
        "repo_artifact_preflight",
    ]
    for key in manifest_paths:
        value = manifest.get(key)
        if not isinstance(value, str) or not value:
            result.error(f"version-manifest.json missing {key}")
            continue
        if value not in text:
            result.error(f"{INDEX} does not mention manifest artifact {key}: {value}")
        elif not (root / value).exists():
            result.error(f"manifest artifact does not exist for {key}: {value}")
        else:
            result.ok(f"decision index mentions existing manifest artifact: {key}")

    checker_tokens = [
        "tools/check_capability_map.py",
        "tools/check_contributor_intake_quickstart.py",
        "tools/check_contribution_bundle_format.py",
        "tools/check_contribution_bundle_roundtrip.py",
        "tools/check_external_contributor_trial_packet.py",
        "tools/check_external_contributor_trial_result_template.py",
        "tools/check_external_trial_handoff.py",
        "tools/check_external_trial_public_packet.py",
        "tools/check_external_trial_records.py",
        "tools/check_model_import_policy.py",
        "tools/check_knowledge_index_policy.py",
        "tools/check_local_aurora_reverse_scope.py",
        "tools/check_aurora_live_operator_packet.py",
        "tools/check_aurora_live_return_packet.py",
        "tools/check_aurora_live_return_roundtrip.py",
        "tools/check_prepare_aurora_live_session.py",
        "tools/check_init_aurora_live_record.py",
        "tools/check_init_aurora_live_evidence_manifest.py",
        "tools/check_aurora_live_records.py",
        "tools/check_aurora_live_redaction_policy.py",
        "tools/check_aurora_live_visual_redaction_checklist.py",
        "tools/aurora_live_visual_redaction_record.py",
        "tools/check_aurora_live_visual_redaction_records.py",
        "tools/check_aurora_live_evidence_manifest.py",
        "tools/check_aurora_live_intake_consistency.py",
        "tools/generate_aurora_live_review_queue.py",
        "tools/check_aurora_live_review_queue.py",
        "tools/check_aurora_live_record_review_checklist.py",
        "tools/aurora_live_review_outcome_record.py",
        "tools/check_aurora_live_review_outcome_records.py",
        "tools/check_aurora_live_status.py",
        "tools/check_architecture_scorecard.py",
        "tools/check_feedback_intake_docs.py",
        "tools/check_feedback_review_rubric.py",
        "tools/check_feedback_intake_status.py",
        "tools/check_reference_promotion_proposal_template.py",
        "tools/check_reference_promotion_proposal_tool.py",
        "tools/check_reference_promotion_records.py",
        "tools/check_record_contracts.py",
        "tools/check_rc_blocker_burndown.py",
        "tools/check_rc_unblock_playbook.py",
        "tools/check_forward_test_prompts.py",
        "tools/check_install_smoke_playbook.py",
        "tools/check_install_smoke_packet.py",
        "tools/check_versioning_policy.py",
        "tools/check_version_bump_plan.py",
        "tools/check_release_notes_draft.py",
        "tools/check_release_next_actions.py",
        "tools/check_version_manifest.py",
        "tools/check_release_handoff.py",
        "tools/check_architecture_decisions.py",
        "tools/check_release_gate.py",
    ]
    for token in checker_tokens:
        if token not in text:
            result.error(f"{INDEX} missing checker route: {token}")
        else:
            tool_path = root / token
            if not tool_path.exists():
                result.error(f"checker route file is missing: {token}")
            else:
                result.ok(f"decision index mentions checker route: {token}")

    return result


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("root", nargs="?", default="docs/nwn-skill-pack")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    result = run(Path(args.root))
    if args.json:
        print(json.dumps({"checks": result.checks, "errors": result.errors}, indent=2))
    else:
        for check in result.checks:
            print(f"OK: {check}")
        for error in result.errors:
            print(f"ERROR: {error}")
        if result.errors:
            print(f"Maintainer decision index check failed: {len(result.errors)} error(s)")
        else:
            print("Maintainer decision index check passed")
    return 1 if result.errors else 0


if __name__ == "__main__":
    sys.exit(main())
