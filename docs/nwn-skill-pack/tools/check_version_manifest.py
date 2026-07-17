#!/usr/bin/env python3
"""Validate NWN skill-pack version manifest against plugin and skill files."""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any


SEMVER_RE = re.compile(
    r"^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)"
    r"(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?"
    r"(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$"
)

ALLOWED_STATES = {
    "repo artifact",
    "release candidate",
    "local install candidate",
    "public release",
}


class CheckResult:
    def __init__(self) -> None:
        self.checks: list[str] = []
        self.errors: list[str] = []
        self.warnings: list[str] = []

    def ok(self, message: str) -> None:
        self.checks.append(message)

    def error(self, message: str) -> None:
        self.errors.append(message)

    def warn(self, message: str) -> None:
        self.warnings.append(message)


def load_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, dict):
        raise ValueError(f"{path} must contain a JSON object")
    return data


def read_skill_name(skill_dir: Path) -> str:
    skill_md = skill_dir / "SKILL.md"
    lines = skill_md.read_text(encoding="utf-8").splitlines()
    if not lines or lines[0].strip() != "---":
        return ""
    for line in lines[1:]:
        if line.strip() == "---":
            break
        if line.startswith("name:"):
            return line.split(":", 1)[1].strip()
    return ""


def require_path(result: CheckResult, root: Path, relative: str, label: str) -> Path | None:
    path = root / relative
    if path.exists():
        result.ok(f"{label} exists: {relative}")
        return path
    result.error(f"{label} is missing: {relative}")
    return None


def require_tokens(result: CheckResult, path: Path, label: str, tokens: list[str]) -> None:
    try:
        text = path.read_text(encoding="utf-8")
    except Exception as exc:
        result.error(f"{label} could not be read: {exc}")
        return
    for token in tokens:
        if token in text:
            result.ok(f"{label} contains token: {token}")
        else:
            result.error(f"{label} is missing token: {token}")


def run(root: Path) -> CheckResult:
    result = CheckResult()
    manifest_path = root / "version-manifest.json"
    if not manifest_path.exists():
        result.error("version-manifest.json is missing")
        return result

    try:
        manifest = load_json(manifest_path)
    except Exception as exc:
        result.error(f"version-manifest.json is invalid: {exc}")
        return result

    required = [
        "schema_version",
        "package_name",
        "version",
        "package_state",
        "skill_name",
        "plugin_manifest",
        "authoring_skill",
        "plugin_skill",
        "release_gate",
        "semver_policy",
    ]
    for field in required:
        if field not in manifest:
            result.error(f"version manifest missing field: {field}")

    if manifest.get("schema_version") != "1":
        result.error("version manifest schema_version must be '1'")

    version = manifest.get("version")
    if not isinstance(version, str) or not SEMVER_RE.match(version):
        result.error(f"version manifest version is not strict semver: {version!r}")
    else:
        result.ok(f"version manifest version is strict semver: {version}")

    state = manifest.get("package_state")
    if state not in ALLOWED_STATES:
        result.error(f"package_state must be one of: {', '.join(sorted(ALLOWED_STATES))}")
    else:
        result.ok(f"package_state is recognized: {state}")

    plugin_manifest = require_path(
        result,
        root,
        str(manifest.get("plugin_manifest", "")),
        "plugin manifest",
    )
    authoring_skill = require_path(
        result,
        root,
        str(manifest.get("authoring_skill", "")),
        "authoring skill",
    )
    plugin_skill = require_path(
        result,
        root,
        str(manifest.get("plugin_skill", "")),
        "plugin skill",
    )
    readiness_report = manifest.get("readiness_report")
    if readiness_report:
        require_path(
            result,
            root,
            str(readiness_report),
            "readiness report",
        )
    readiness_report_check = manifest.get("readiness_report_check")
    if readiness_report_check:
        require_path(
            result,
            root,
            str(readiness_report_check),
            "release readiness checker",
        )
    release_notes_draft = manifest.get("release_notes_draft")
    if release_notes_draft:
        require_path(
            result,
            root,
            str(release_notes_draft),
            "release notes draft",
        )
    release_notes_draft_generator = manifest.get("release_notes_draft_generator")
    if release_notes_draft_generator:
        require_path(
            result,
            root,
            str(release_notes_draft_generator),
            "release notes draft generator",
        )
    release_notes_draft_check = manifest.get("release_notes_draft_check")
    if release_notes_draft_check:
        require_path(
            result,
            root,
            str(release_notes_draft_check),
            "release notes draft checker",
        )
    release_next_actions = manifest.get("release_next_actions")
    if release_next_actions:
        require_path(
            result,
            root,
            str(release_next_actions),
            "release next-actions dashboard",
        )
    release_next_actions_generator = manifest.get("release_next_actions_generator")
    if release_next_actions_generator:
        require_path(
            result,
            root,
            str(release_next_actions_generator),
            "release next-actions dashboard generator",
        )
    release_next_actions_check = manifest.get("release_next_actions_check")
    if release_next_actions_check:
        require_path(
            result,
            root,
            str(release_next_actions_check),
            "release next-actions dashboard checker",
        )
    release_evidence_index = manifest.get("release_evidence_index")
    if release_evidence_index:
        require_path(
            result,
            root,
            str(release_evidence_index),
            "release evidence index",
        )
    release_evidence_index_generator = manifest.get("release_evidence_index_generator")
    if release_evidence_index_generator:
        require_path(
            result,
            root,
            str(release_evidence_index_generator),
            "release evidence index generator",
        )
    release_evidence_index_check = manifest.get("release_evidence_index_check")
    if release_evidence_index_check:
        require_path(
            result,
            root,
            str(release_evidence_index_check),
            "release evidence index checker",
        )
    rc_blocker_burndown = manifest.get("rc_blocker_burndown")
    if rc_blocker_burndown:
        require_path(
            result,
            root,
            str(rc_blocker_burndown),
            "RC blocker burn-down",
        )
    rc_blocker_burndown_generator = manifest.get("rc_blocker_burndown_generator")
    if rc_blocker_burndown_generator:
        require_path(
            result,
            root,
            str(rc_blocker_burndown_generator),
            "RC blocker burn-down generator",
        )
    rc_blocker_burndown_check = manifest.get("rc_blocker_burndown_check")
    if rc_blocker_burndown_check:
        require_path(
            result,
            root,
            str(rc_blocker_burndown_check),
            "RC blocker burn-down checker",
        )
    rc_prompt_test_handoff = manifest.get("rc_prompt_test_handoff")
    if rc_prompt_test_handoff:
        require_path(
            result,
            root,
            str(rc_prompt_test_handoff),
            "RC prompt-test handoff",
        )
    rc_prompt_test_handoff_generator = manifest.get("rc_prompt_test_handoff_generator")
    if rc_prompt_test_handoff_generator:
        require_path(
            result,
            root,
            str(rc_prompt_test_handoff_generator),
            "RC prompt-test handoff generator",
        )
    rc_prompt_test_handoff_check = manifest.get("rc_prompt_test_handoff_check")
    if rc_prompt_test_handoff_check:
        require_path(
            result,
            root,
            str(rc_prompt_test_handoff_check),
            "RC prompt-test handoff checker",
        )
    minimum_rc_proof_packet = manifest.get("minimum_rc_proof_packet")
    if minimum_rc_proof_packet:
        require_path(
            result,
            root,
            str(minimum_rc_proof_packet),
            "minimum RC proof packet",
        )
    minimum_rc_proof_packet_generator = manifest.get("minimum_rc_proof_packet_generator")
    if minimum_rc_proof_packet_generator:
        require_path(
            result,
            root,
            str(minimum_rc_proof_packet_generator),
            "minimum RC proof packet generator",
        )
    minimum_rc_proof_packet_check = manifest.get("minimum_rc_proof_packet_check")
    if minimum_rc_proof_packet_check:
        require_path(
            result,
            root,
            str(minimum_rc_proof_packet_check),
            "minimum RC proof packet checker",
        )
    rc_unblock_playbook = manifest.get("rc_unblock_playbook")
    if rc_unblock_playbook:
        require_path(
            result,
            root,
            str(rc_unblock_playbook),
            "RC unblock playbook",
        )
    rc_unblock_playbook_check = manifest.get("rc_unblock_playbook_check")
    if rc_unblock_playbook_check:
        require_path(
            result,
            root,
            str(rc_unblock_playbook_check),
            "RC unblock playbook checker",
        )
    release_handoff = manifest.get("release_handoff")
    if release_handoff:
        require_path(
            result,
            root,
            str(release_handoff),
            "concrete release handoff",
        )
    release_handoff_check = manifest.get("release_handoff_check")
    if release_handoff_check:
        require_path(
            result,
            root,
            str(release_handoff_check),
            "release handoff checker",
        )
    package_inventory = manifest.get("package_inventory")
    if package_inventory:
        require_path(
            result,
            root,
            str(package_inventory),
            "package inventory",
        )
    package_inventory_check = manifest.get("package_inventory_check")
    if package_inventory_check:
        require_path(
            result,
            root,
            str(package_inventory_check),
            "package inventory checker",
        )
    package_boundary_doc = manifest.get("package_boundary_doc")
    if package_boundary_doc:
        require_path(
            result,
            root,
            str(package_boundary_doc),
            "package boundary doc",
        )
    package_boundary_check = manifest.get("package_boundary_check")
    if package_boundary_check:
        require_path(
            result,
            root,
            str(package_boundary_check),
            "package boundary checker",
        )
    install_candidate_builder = manifest.get("install_candidate_builder")
    if install_candidate_builder:
        require_path(
            result,
            root,
            str(install_candidate_builder),
            "install candidate builder",
        )
    local_marketplace_candidate_builder = manifest.get("local_marketplace_candidate_builder")
    if local_marketplace_candidate_builder:
        require_path(
            result,
            root,
            str(local_marketplace_candidate_builder),
            "local marketplace candidate builder",
        )
    install_candidate_check = manifest.get("install_candidate_check")
    if install_candidate_check:
        require_path(
            result,
            root,
            str(install_candidate_check),
            "install candidate checker",
        )
    isolated_install_layout_check = manifest.get("isolated_install_layout_check")
    if isolated_install_layout_check:
        require_path(
            result,
            root,
            str(isolated_install_layout_check),
            "isolated install layout checker",
        )
    install_smoke_packet = manifest.get("install_smoke_packet")
    if install_smoke_packet:
        require_path(
            result,
            root,
            str(install_smoke_packet),
            "install smoke packet",
        )
    install_smoke_packet_generator = manifest.get("install_smoke_packet_generator")
    if install_smoke_packet_generator:
        require_path(
            result,
            root,
            str(install_smoke_packet_generator),
            "install smoke packet generator",
        )
    install_smoke_packet_check = manifest.get("install_smoke_packet_check")
    if install_smoke_packet_check:
        require_path(
            result,
            root,
            str(install_smoke_packet_check),
            "install smoke packet checker",
        )
    install_smoke_execution_playbook = manifest.get("install_smoke_execution_playbook")
    if install_smoke_execution_playbook:
        require_path(
            result,
            root,
            str(install_smoke_execution_playbook),
            "install smoke execution playbook",
        )
    install_smoke_execution_playbook_check = manifest.get("install_smoke_execution_playbook_check")
    if install_smoke_execution_playbook_check:
        require_path(
            result,
            root,
            str(install_smoke_execution_playbook_check),
            "install smoke execution playbook checker",
        )
    install_smoke_records_check = manifest.get("install_smoke_records_check")
    if install_smoke_records_check:
        require_path(
            result,
            root,
            str(install_smoke_records_check),
            "install smoke records checker",
        )
    forward_test_prompt_check = manifest.get("forward_test_prompt_check")
    if forward_test_prompt_check:
        require_path(
            result,
            root,
            str(forward_test_prompt_check),
            "forward-test prompt checker",
        )
    forward_test_evidence_policy = manifest.get("forward_test_evidence_policy")
    if forward_test_evidence_policy:
        require_path(
            result,
            root,
            str(forward_test_evidence_policy),
            "forward-test evidence acceptance policy",
        )
    forward_test_evidence_policy_check = manifest.get("forward_test_evidence_policy_check")
    if forward_test_evidence_policy_check:
        require_path(
            result,
            root,
            str(forward_test_evidence_policy_check),
            "forward-test evidence acceptance policy checker",
        )
    forward_test_answer_capture_template = manifest.get("forward_test_answer_capture_template")
    if forward_test_answer_capture_template:
        require_path(
            result,
            root,
            str(forward_test_answer_capture_template),
            "forward-test answer capture template",
        )
    forward_test_answer_capture_template_check = manifest.get("forward_test_answer_capture_template_check")
    if forward_test_answer_capture_template_check:
        require_path(
            result,
            root,
            str(forward_test_answer_capture_template_check),
            "forward-test answer capture template checker",
        )
    forward_test_capture_initializer = manifest.get("forward_test_capture_initializer")
    if forward_test_capture_initializer:
        require_path(
            result,
            root,
            str(forward_test_capture_initializer),
            "forward-test capture initializer",
        )
    forward_test_capture_initializer_check = manifest.get("forward_test_capture_initializer_check")
    if forward_test_capture_initializer_check:
        require_path(
            result,
            root,
            str(forward_test_capture_initializer_check),
            "forward-test capture initializer checker",
        )
    forward_test_dispatch_bundle_builder = manifest.get("forward_test_dispatch_bundle_builder")
    if forward_test_dispatch_bundle_builder:
        require_path(
            result,
            root,
            str(forward_test_dispatch_bundle_builder),
            "forward-test dispatch bundle builder",
        )
    forward_test_dispatch_bundle_check = manifest.get("forward_test_dispatch_bundle_check")
    if forward_test_dispatch_bundle_check:
        require_path(
            result,
            root,
            str(forward_test_dispatch_bundle_check),
            "forward-test dispatch bundle checker",
        )
    forward_test_clean_session_prompt_builder = manifest.get("forward_test_clean_session_prompt_builder")
    if forward_test_clean_session_prompt_builder:
        require_path(
            result,
            root,
            str(forward_test_clean_session_prompt_builder),
            "forward-test clean-session prompt builder",
        )
    forward_test_clean_session_prompt_check = manifest.get("forward_test_clean_session_prompt_check")
    if forward_test_clean_session_prompt_check:
        require_path(
            result,
            root,
            str(forward_test_clean_session_prompt_check),
            "forward-test clean-session prompt checker",
        )
    forward_test_clean_session_received_check = manifest.get("forward_test_clean_session_received_check")
    if forward_test_clean_session_received_check:
        require_path(
            result,
            root,
            str(forward_test_clean_session_received_check),
            "forward-test clean-session received-pack checker",
        )
    forward_test_return_capture_check = manifest.get("forward_test_return_capture_check")
    if forward_test_return_capture_check:
        require_path(
            result,
            root,
            str(forward_test_return_capture_check),
            "forward-test return capture checker",
        )
    ft009_local_intake_handoff = manifest.get("ft009_local_intake_handoff")
    if ft009_local_intake_handoff:
        require_path(
            result,
            root,
            str(ft009_local_intake_handoff),
            "FT-009 local-intake handoff",
        )
    ft009_local_intake_handoff_check = manifest.get("ft009_local_intake_handoff_check")
    if ft009_local_intake_handoff_check:
        require_path(
            result,
            root,
            str(ft009_local_intake_handoff_check),
            "FT-009 local-intake handoff checker",
        )
    forward_test_reviewer_matrix = manifest.get("forward_test_reviewer_matrix")
    if forward_test_reviewer_matrix:
        require_path(
            result,
            root,
            str(forward_test_reviewer_matrix),
            "forward-test reviewer matrix",
        )
    forward_test_record_templates = manifest.get("forward_test_record_templates")
    if forward_test_record_templates:
        require_path(
            result,
            root,
            str(forward_test_record_templates),
            "forward-test record templates",
        )
    forward_test_record_template_generator = manifest.get("forward_test_record_template_generator")
    if forward_test_record_template_generator:
        require_path(
            result,
            root,
            str(forward_test_record_template_generator),
            "forward-test record template generator",
        )
    forward_test_reviewer_packet = manifest.get("forward_test_reviewer_packet")
    if forward_test_reviewer_packet:
        require_path(
            result,
            root,
            str(forward_test_reviewer_packet),
            "forward-test reviewer packet",
        )
    forward_test_reviewer_packet_generator = manifest.get("forward_test_reviewer_packet_generator")
    if forward_test_reviewer_packet_generator:
        require_path(
            result,
            root,
            str(forward_test_reviewer_packet_generator),
            "forward-test reviewer packet generator",
        )
    forward_test_execution_queue = manifest.get("forward_test_execution_queue")
    if forward_test_execution_queue:
        require_path(
            result,
            root,
            str(forward_test_execution_queue),
            "forward-test execution queue",
        )
    forward_test_execution_queue_generator = manifest.get("forward_test_execution_queue_generator")
    if forward_test_execution_queue_generator:
        require_path(
            result,
            root,
            str(forward_test_execution_queue_generator),
            "forward-test execution queue generator",
        )
    feedback_release_workflow = manifest.get("feedback_release_workflow")
    if feedback_release_workflow:
        require_path(
            result,
            root,
            str(feedback_release_workflow),
            "human feedback release workflow",
        )
    feedback_review_rubric = manifest.get("feedback_review_rubric")
    if feedback_review_rubric:
        require_path(
            result,
            root,
            str(feedback_review_rubric),
            "feedback review rubric",
        )
    feedback_review_rubric_check = manifest.get("feedback_review_rubric_check")
    if feedback_review_rubric_check:
        require_path(
            result,
            root,
            str(feedback_review_rubric_check),
            "feedback review rubric checker",
        )
    feedback_intake_status = manifest.get("feedback_intake_status")
    if feedback_intake_status:
        require_path(
            result,
            root,
            str(feedback_intake_status),
            "feedback intake status",
        )
    feedback_intake_status_generator = manifest.get("feedback_intake_status_generator")
    if feedback_intake_status_generator:
        require_path(
            result,
            root,
            str(feedback_intake_status_generator),
            "feedback intake status generator",
        )
    feedback_intake_status_check = manifest.get("feedback_intake_status_check")
    if feedback_intake_status_check:
        require_path(
            result,
            root,
            str(feedback_intake_status_check),
            "feedback intake status checker",
        )
    feedback_lifecycle_check = manifest.get("feedback_lifecycle_check")
    if feedback_lifecycle_check:
        require_path(
            result,
            root,
            str(feedback_lifecycle_check),
            "feedback lifecycle checker",
        )
    reference_promotion_proposal_template = manifest.get("reference_promotion_proposal_template")
    if reference_promotion_proposal_template:
        require_path(
            result,
            root,
            str(reference_promotion_proposal_template),
            "reference promotion proposal template",
        )
    reference_promotion_proposal_template_check = manifest.get("reference_promotion_proposal_template_check")
    if reference_promotion_proposal_template_check:
        require_path(
            result,
            root,
            str(reference_promotion_proposal_template_check),
            "reference promotion proposal template checker",
        )
    reference_promotion_proposal_generator = manifest.get("reference_promotion_proposal_generator")
    if reference_promotion_proposal_generator:
        require_path(
            result,
            root,
            str(reference_promotion_proposal_generator),
            "reference promotion proposal generator",
        )
    reference_promotion_proposal_generator_check = manifest.get("reference_promotion_proposal_generator_check")
    if reference_promotion_proposal_generator_check:
        require_path(
            result,
            root,
            str(reference_promotion_proposal_generator_check),
            "reference promotion proposal generator checker",
        )
    reference_promotion_record_tool = manifest.get("reference_promotion_record_tool")
    if reference_promotion_record_tool:
        require_path(
            result,
            root,
            str(reference_promotion_record_tool),
            "reference promotion record tool",
        )
    reference_promotion_record_schema = manifest.get("reference_promotion_record_schema")
    if reference_promotion_record_schema:
        require_path(
            result,
            root,
            str(reference_promotion_record_schema),
            "reference promotion record schema",
        )
    reference_promotion_record_aggregate = manifest.get("reference_promotion_record_aggregate")
    if reference_promotion_record_aggregate:
        require_path(
            result,
            root,
            str(reference_promotion_record_aggregate),
            "reference promotion record aggregate",
        )
    reference_promotion_record_check = manifest.get("reference_promotion_record_check")
    if reference_promotion_record_check:
        require_path(
            result,
            root,
            str(reference_promotion_record_check),
            "reference promotion record checker",
        )
    contribution_bundle_format = manifest.get("contribution_bundle_format")
    if contribution_bundle_format:
        require_path(
            result,
            root,
            str(contribution_bundle_format),
            "contribution bundle format",
        )
    contribution_bundle_format_check = manifest.get("contribution_bundle_format_check")
    if contribution_bundle_format_check:
        require_path(
            result,
            root,
            str(contribution_bundle_format_check),
            "contribution bundle format checker",
        )
    contribution_bundle_roundtrip_check = manifest.get("contribution_bundle_roundtrip_check")
    if contribution_bundle_roundtrip_check:
        require_path(
            result,
            root,
            str(contribution_bundle_roundtrip_check),
            "contribution bundle roundtrip checker",
        )
    contributor_intake_quickstart = manifest.get("contributor_intake_quickstart")
    if contributor_intake_quickstart:
        require_path(
            result,
            root,
            str(contributor_intake_quickstart),
            "contributor intake quickstart",
        )
    contributor_intake_quickstart_check = manifest.get("contributor_intake_quickstart_check")
    if contributor_intake_quickstart_check:
        require_path(
            result,
            root,
            str(contributor_intake_quickstart_check),
            "contributor intake quickstart checker",
        )
    external_contributor_trial_packet = manifest.get("external_contributor_trial_packet")
    if external_contributor_trial_packet:
        require_path(
            result,
            root,
            str(external_contributor_trial_packet),
            "external contributor trial packet",
        )
    external_contributor_trial_packet_check = manifest.get("external_contributor_trial_packet_check")
    if external_contributor_trial_packet_check:
        require_path(
            result,
            root,
            str(external_contributor_trial_packet_check),
            "external contributor trial packet checker",
        )
    external_contributor_trial_result_template = manifest.get("external_contributor_trial_result_template")
    if external_contributor_trial_result_template:
        require_path(
            result,
            root,
            str(external_contributor_trial_result_template),
            "external contributor trial result template",
        )
    external_contributor_trial_result_template_check = manifest.get("external_contributor_trial_result_template_check")
    if external_contributor_trial_result_template_check:
        require_path(
            result,
            root,
            str(external_contributor_trial_result_template_check),
            "external contributor trial result template checker",
        )
    external_contributor_trial_record_tool = manifest.get("external_contributor_trial_record_tool")
    if external_contributor_trial_record_tool:
        require_path(
            result,
            root,
            str(external_contributor_trial_record_tool),
            "external contributor trial record tool",
        )
    external_contributor_trial_record_schema = manifest.get("external_contributor_trial_record_schema")
    if external_contributor_trial_record_schema:
        require_path(
            result,
            root,
            str(external_contributor_trial_record_schema),
            "external contributor trial record schema",
        )
    external_contributor_trial_aggregate = manifest.get("external_contributor_trial_aggregate")
    if external_contributor_trial_aggregate:
        require_path(
            result,
            root,
            str(external_contributor_trial_aggregate),
            "external contributor trial aggregate",
        )
    external_contributor_trial_records_check = manifest.get("external_contributor_trial_records_check")
    if external_contributor_trial_records_check:
        require_path(
            result,
            root,
            str(external_contributor_trial_records_check),
            "external contributor trial records checker",
        )
    external_contributor_trial_handoff = manifest.get("external_contributor_trial_handoff")
    if external_contributor_trial_handoff:
        require_path(
            result,
            root,
            str(external_contributor_trial_handoff),
            "external contributor trial handoff",
        )
    external_contributor_trial_handoff_generator = manifest.get("external_contributor_trial_handoff_generator")
    if external_contributor_trial_handoff_generator:
        require_path(
            result,
            root,
            str(external_contributor_trial_handoff_generator),
            "external contributor trial handoff generator",
        )
    external_contributor_trial_handoff_check = manifest.get("external_contributor_trial_handoff_check")
    if external_contributor_trial_handoff_check:
        require_path(
            result,
            root,
            str(external_contributor_trial_handoff_check),
            "external contributor trial handoff checker",
        )
    external_contributor_trial_tester_message = manifest.get("external_contributor_trial_tester_message")
    if external_contributor_trial_tester_message:
        require_path(
            result,
            root,
            str(external_contributor_trial_tester_message),
            "external contributor trial tester message",
        )
    external_contributor_trial_tester_message_generator = manifest.get("external_contributor_trial_tester_message_generator")
    if external_contributor_trial_tester_message_generator:
        require_path(
            result,
            root,
            str(external_contributor_trial_tester_message_generator),
            "external contributor trial tester message generator",
        )
    external_contributor_trial_tester_message_check = manifest.get("external_contributor_trial_tester_message_check")
    if external_contributor_trial_tester_message_check:
        require_path(
            result,
            root,
            str(external_contributor_trial_tester_message_check),
            "external contributor trial tester message checker",
        )
    external_contributor_trial_public_packet_builder = manifest.get("external_contributor_trial_public_packet_builder")
    if external_contributor_trial_public_packet_builder:
        require_path(
            result,
            root,
            str(external_contributor_trial_public_packet_builder),
            "external contributor trial public packet builder",
        )
    external_contributor_trial_public_packet_check = manifest.get("external_contributor_trial_public_packet_check")
    if external_contributor_trial_public_packet_check:
        require_path(
            result,
            root,
            str(external_contributor_trial_public_packet_check),
            "external contributor trial public packet checker",
        )
    external_contributor_trial_cleanroom_check = manifest.get("external_contributor_trial_cleanroom_check")
    if external_contributor_trial_cleanroom_check:
        require_path(
            result,
            root,
            str(external_contributor_trial_cleanroom_check),
            "external contributor trial cleanroom checker",
        )
    external_contributor_trial_dispatch_bundle_builder = manifest.get("external_contributor_trial_dispatch_bundle_builder")
    if external_contributor_trial_dispatch_bundle_builder:
        require_path(
            result,
            root,
            str(external_contributor_trial_dispatch_bundle_builder),
            "external contributor trial dispatch bundle builder",
        )
    external_contributor_trial_dispatch_bundle_check = manifest.get("external_contributor_trial_dispatch_bundle_check")
    if external_contributor_trial_dispatch_bundle_check:
        require_path(
            result,
            root,
            str(external_contributor_trial_dispatch_bundle_check),
            "external contributor trial dispatch bundle checker",
        )
    external_contributor_trial_received_dispatch_check = manifest.get("external_contributor_trial_received_dispatch_check")
    if external_contributor_trial_received_dispatch_check:
        require_path(
            result,
            root,
            str(external_contributor_trial_received_dispatch_check),
            "external contributor trial received dispatch checker",
        )
    architecture_scorecard = manifest.get("architecture_scorecard")
    if architecture_scorecard:
        require_path(
            result,
            root,
            str(architecture_scorecard),
            "architecture escalation scorecard",
        )
    architecture_scorecard_check = manifest.get("architecture_scorecard_check")
    if architecture_scorecard_check:
        require_path(
            result,
            root,
            str(architecture_scorecard_check),
            "architecture escalation scorecard checker",
        )
    architecture_decision = manifest.get("architecture_decision")
    if architecture_decision:
        require_path(
            result,
            root,
            str(architecture_decision),
            "architecture decision record",
        )
    architecture_decision_check = manifest.get("architecture_decision_check")
    if architecture_decision_check:
        require_path(
            result,
            root,
            str(architecture_decision_check),
            "architecture decision checker",
        )
    maintainer_decision_index = manifest.get("maintainer_decision_index")
    if maintainer_decision_index:
        require_path(
            result,
            root,
            str(maintainer_decision_index),
            "maintainer decision index",
        )
    maintainer_decision_index_check = manifest.get("maintainer_decision_index_check")
    if maintainer_decision_index_check:
        require_path(
            result,
            root,
            str(maintainer_decision_index_check),
            "maintainer decision index checker",
        )
    versioning_policy = manifest.get("versioning_policy")
    if versioning_policy:
        require_path(
            result,
            root,
            str(versioning_policy),
            "versioning policy",
        )
    versioning_policy_check = manifest.get("versioning_policy_check")
    if versioning_policy_check:
        require_path(
            result,
            root,
            str(versioning_policy_check),
            "versioning policy checker",
        )
    version_bump_plan = manifest.get("version_bump_plan")
    if version_bump_plan:
        require_path(
            result,
            root,
            str(version_bump_plan),
            "version bump plan",
        )
    version_bump_plan_generator = manifest.get("version_bump_plan_generator")
    if version_bump_plan_generator:
        require_path(
            result,
            root,
            str(version_bump_plan_generator),
            "version bump plan generator",
        )
    version_bump_plan_check = manifest.get("version_bump_plan_check")
    if version_bump_plan_check:
        require_path(
            result,
            root,
            str(version_bump_plan_check),
            "version bump plan checker",
        )
    research_run_log = manifest.get("research_run_log")
    if research_run_log:
        require_path(
            result,
            root,
            str(research_run_log),
            "research run log",
        )
    research_run_log_check = manifest.get("research_run_log_check")
    if research_run_log_check:
        require_path(
            result,
            root,
            str(research_run_log_check),
            "research run log checker",
        )
    research_run_summary = manifest.get("research_run_summary")
    if research_run_summary:
        require_path(
            result,
            root,
            str(research_run_summary),
            "research run summary",
        )
    research_run_summary_generator = manifest.get("research_run_summary_generator")
    if research_run_summary_generator:
        require_path(
            result,
            root,
            str(research_run_summary_generator),
            "research run summary generator",
        )
    research_run_summary_check = manifest.get("research_run_summary_check")
    if research_run_summary_check:
        require_path(
            result,
            root,
            str(research_run_summary_check),
            "research run summary checker",
        )
    model_import_policy = manifest.get("model_import_policy")
    if model_import_policy:
        require_path(
            result,
            root,
            str(model_import_policy),
            "model import policy",
        )
    model_import_policy_check = manifest.get("model_import_policy_check")
    if model_import_policy_check:
        require_path(
            result,
            root,
            str(model_import_policy_check),
            "model import policy checker",
        )
    knowledge_index_policy = manifest.get("knowledge_index_policy")
    if knowledge_index_policy:
        require_path(
            result,
            root,
            str(knowledge_index_policy),
            "knowledge index policy",
        )
    knowledge_index_policy_check = manifest.get("knowledge_index_policy_check")
    if knowledge_index_policy_check:
        require_path(
            result,
            root,
            str(knowledge_index_policy_check),
            "knowledge index policy checker",
        )
    local_aurora_reverse_ingestion = manifest.get("local_aurora_reverse_ingestion")
    if local_aurora_reverse_ingestion:
        local_aurora_reverse_ingestion_path = require_path(
            result,
            root,
            str(local_aurora_reverse_ingestion),
            "local Aurora reverse ingestion",
        )
        if local_aurora_reverse_ingestion_path:
            require_tokens(
                result,
                local_aurora_reverse_ingestion_path,
                "local Aurora reverse ingestion",
                [
                    "Local Aurora Reverse Ingestion",
                    "019ed62e-3e0f-7253-91ff-f529be54abfe",
                    "C:\\Projects\\New Folder",
                    "Use evidence label `local-reverse-lead`",
                    "not live Toolset verification",
                ],
            )
    else:
        result.error("version manifest missing local_aurora_reverse_ingestion")
    local_thread_019ed62e_intake = manifest.get("local_thread_019ed62e_intake")
    if local_thread_019ed62e_intake:
        local_thread_019ed62e_intake_path = require_path(
            result,
            root,
            str(local_thread_019ed62e_intake),
            "local thread 019ed62e intake",
        )
        if local_thread_019ed62e_intake_path:
            require_tokens(
                result,
                local_thread_019ed62e_intake_path,
                "local thread 019ed62e intake",
                [
                    "Local Thread Intake: Aurora UI Screenshot Gallery",
                    "Fresh Thread Probe - 2026-06-19T09:03:17Z",
                    "Batch82 remains the newest useful passive UI intake",
                    "verified-live Toolset evidence",
                    "do not patch compact skill",
                ],
            )
    else:
        result.error("version manifest missing local_thread_019ed62e_intake")
    local_aurora_symbol_index = manifest.get("local_aurora_symbol_index")
    if local_aurora_symbol_index:
        local_aurora_symbol_index_path = require_path(
            result,
            root,
            str(local_aurora_symbol_index),
            "local Aurora symbol index",
        )
        if local_aurora_symbol_index_path:
            require_tokens(
                result,
                local_aurora_symbol_index_path,
                "local Aurora symbol index",
                [
                    "Local Aurora Symbol Index",
                    "Evidence label: `local-reverse-lead`",
                    "Reverse root: `C:\\Projects\\New Folder`",
                    "Parsed text rows: `29323`",
                    "Domain Coverage Leads",
                ],
            )
    else:
        result.error("version manifest missing local_aurora_symbol_index")
    local_aurora_small_location_live_operator_checklist = manifest.get(
        "local_aurora_small_location_live_operator_checklist"
    )
    if local_aurora_small_location_live_operator_checklist:
        local_aurora_small_location_live_operator_checklist_path = require_path(
            result,
            root,
            str(local_aurora_small_location_live_operator_checklist),
            "local Aurora small-location live operator checklist",
        )
        if local_aurora_small_location_live_operator_checklist_path:
            require_tokens(
                result,
                local_aurora_small_location_live_operator_checklist_path,
                "local Aurora small-location live operator checklist",
                [
                    "Local Aurora Small Location Live Operator Checklist",
                    "Evidence label before completion: `local-reverse-lead`",
                    "Promotion target after successful live review",
                    "First Live Record Seed",
                    "small-location-first-pass",
                ],
            )
    else:
        result.error("version manifest missing local_aurora_small_location_live_operator_checklist")
    local_aurora_reverse_scope_check = manifest.get("local_aurora_reverse_scope_check")
    if local_aurora_reverse_scope_check:
        require_path(
            result,
            root,
            str(local_aurora_reverse_scope_check),
            "local Aurora reverse scope checker",
        )
    local_aurora_live_gap_queue = manifest.get("local_aurora_live_gap_queue")
    if local_aurora_live_gap_queue:
        local_aurora_live_gap_queue_path = require_path(
            result,
            root,
            str(local_aurora_live_gap_queue),
            "local Aurora live gap queue",
        )
        if local_aurora_live_gap_queue_path:
            require_tokens(
                result,
                local_aurora_live_gap_queue_path,
                "local Aurora live gap queue",
                [
                    "Local Aurora Live Gap Queue",
                    "Evidence label before completion: `local-reverse-lead`",
                    "gap-trigger-geometry-script",
                    "gap-encounter-wizard-spawn",
                    "not installed skill content",
                ],
            )
    else:
        result.error("version manifest missing local_aurora_live_gap_queue")
    aurora_live_operator_execution_packet = manifest.get("aurora_live_operator_execution_packet")
    if aurora_live_operator_execution_packet:
        require_path(
            result,
            root,
            str(aurora_live_operator_execution_packet),
            "Aurora live-operator execution packet",
        )
    aurora_live_operator_execution_packet_check = manifest.get("aurora_live_operator_execution_packet_check")
    if aurora_live_operator_execution_packet_check:
        require_path(
            result,
            root,
            str(aurora_live_operator_execution_packet_check),
            "Aurora live-operator execution packet checker",
        )
    aurora_live_first_session_command_sheet = manifest.get("aurora_live_first_session_command_sheet")
    if aurora_live_first_session_command_sheet:
        require_path(
            result,
            root,
            str(aurora_live_first_session_command_sheet),
            "Aurora live first-session command sheet",
        )
    aurora_live_first_review_command_sheet = manifest.get("aurora_live_first_review_command_sheet")
    if aurora_live_first_review_command_sheet:
        require_path(
            result,
            root,
            str(aurora_live_first_review_command_sheet),
            "Aurora live first-review command sheet",
        )
    aurora_live_return_packet = manifest.get("aurora_live_return_packet")
    if aurora_live_return_packet:
        require_path(
            result,
            root,
            str(aurora_live_return_packet),
            "Aurora live return packet",
        )
    aurora_live_return_packet_check = manifest.get("aurora_live_return_packet_check")
    if aurora_live_return_packet_check:
        require_path(
            result,
            root,
            str(aurora_live_return_packet_check),
            "Aurora live return packet checker",
        )
    aurora_live_return_roundtrip_check = manifest.get("aurora_live_return_roundtrip_check")
    if aurora_live_return_roundtrip_check:
        require_path(
            result,
            root,
            str(aurora_live_return_roundtrip_check),
            "Aurora live return roundtrip checker",
        )
    aurora_live_session_preparer = manifest.get("aurora_live_session_preparer")
    if aurora_live_session_preparer:
        require_path(
            result,
            root,
            str(aurora_live_session_preparer),
            "Aurora live session preparer",
        )
    aurora_live_session_preparer_check = manifest.get("aurora_live_session_preparer_check")
    if aurora_live_session_preparer_check:
        require_path(
            result,
            root,
            str(aurora_live_session_preparer_check),
            "Aurora live session preparer checker",
        )
    aurora_live_record_initializer = manifest.get("aurora_live_record_initializer")
    if aurora_live_record_initializer:
        require_path(
            result,
            root,
            str(aurora_live_record_initializer),
            "Aurora live-record initializer",
        )
    aurora_live_record_initializer_check = manifest.get("aurora_live_record_initializer_check")
    if aurora_live_record_initializer_check:
        require_path(
            result,
            root,
            str(aurora_live_record_initializer_check),
            "Aurora live-record initializer checker",
        )
    aurora_live_records_check = manifest.get("aurora_live_records_check")
    if aurora_live_records_check:
        require_path(
            result,
            root,
            str(aurora_live_records_check),
            "Aurora live records checker",
        )
    aurora_live_redaction_policy = manifest.get("aurora_live_redaction_policy")
    if aurora_live_redaction_policy:
        require_path(
            result,
            root,
            str(aurora_live_redaction_policy),
            "Aurora live redaction policy",
        )
    aurora_live_redaction_policy_check = manifest.get("aurora_live_redaction_policy_check")
    if aurora_live_redaction_policy_check:
        require_path(
            result,
            root,
            str(aurora_live_redaction_policy_check),
            "Aurora live redaction policy checker",
        )
    aurora_live_visual_redaction_checklist = manifest.get("aurora_live_visual_redaction_checklist")
    if aurora_live_visual_redaction_checklist:
        require_path(
            result,
            root,
            str(aurora_live_visual_redaction_checklist),
            "Aurora live visual redaction checklist",
        )
    aurora_live_visual_redaction_checklist_check = manifest.get("aurora_live_visual_redaction_checklist_check")
    if aurora_live_visual_redaction_checklist_check:
        require_path(
            result,
            root,
            str(aurora_live_visual_redaction_checklist_check),
            "Aurora live visual redaction checklist checker",
        )
    aurora_live_visual_redaction_record_tool = manifest.get("aurora_live_visual_redaction_record_tool")
    if aurora_live_visual_redaction_record_tool:
        require_path(
            result,
            root,
            str(aurora_live_visual_redaction_record_tool),
            "Aurora live visual redaction record tool",
        )
    aurora_live_visual_redaction_record_schema = manifest.get("aurora_live_visual_redaction_record_schema")
    if aurora_live_visual_redaction_record_schema:
        require_path(
            result,
            root,
            str(aurora_live_visual_redaction_record_schema),
            "Aurora live visual redaction record schema",
        )
    aurora_live_visual_redaction_record_aggregate = manifest.get("aurora_live_visual_redaction_record_aggregate")
    if aurora_live_visual_redaction_record_aggregate:
        require_path(
            result,
            root,
            str(aurora_live_visual_redaction_record_aggregate),
            "Aurora live visual redaction record aggregate",
        )
    aurora_live_visual_redaction_record_check = manifest.get("aurora_live_visual_redaction_record_check")
    if aurora_live_visual_redaction_record_check:
        require_path(
            result,
            root,
            str(aurora_live_visual_redaction_record_check),
            "Aurora live visual redaction record checker",
        )
    aurora_live_evidence_manifest_template = manifest.get("aurora_live_evidence_manifest_template")
    if aurora_live_evidence_manifest_template:
        require_path(
            result,
            root,
            str(aurora_live_evidence_manifest_template),
            "Aurora live evidence manifest template",
        )
    aurora_live_evidence_manifest_initializer = manifest.get("aurora_live_evidence_manifest_initializer")
    if aurora_live_evidence_manifest_initializer:
        require_path(
            result,
            root,
            str(aurora_live_evidence_manifest_initializer),
            "Aurora live evidence manifest initializer",
        )
    aurora_live_evidence_manifest_initializer_check = manifest.get("aurora_live_evidence_manifest_initializer_check")
    if aurora_live_evidence_manifest_initializer_check:
        require_path(
            result,
            root,
            str(aurora_live_evidence_manifest_initializer_check),
            "Aurora live evidence manifest initializer checker",
        )
    aurora_live_evidence_manifest_check = manifest.get("aurora_live_evidence_manifest_check")
    if aurora_live_evidence_manifest_check:
        require_path(
            result,
            root,
            str(aurora_live_evidence_manifest_check),
            "Aurora live evidence manifest checker",
        )
    aurora_live_intake_consistency_check = manifest.get("aurora_live_intake_consistency_check")
    if aurora_live_intake_consistency_check:
        require_path(
            result,
            root,
            str(aurora_live_intake_consistency_check),
            "Aurora live intake consistency checker",
        )
    aurora_live_record_review_checklist = manifest.get("aurora_live_record_review_checklist")
    if aurora_live_record_review_checklist:
        require_path(
            result,
            root,
            str(aurora_live_record_review_checklist),
            "Aurora live-record review checklist",
        )
    aurora_live_record_review_checklist_check = manifest.get("aurora_live_record_review_checklist_check")
    if aurora_live_record_review_checklist_check:
        require_path(
            result,
            root,
            str(aurora_live_record_review_checklist_check),
            "Aurora live-record review checklist checker",
        )
    aurora_live_review_outcome_record_tool = manifest.get("aurora_live_review_outcome_record_tool")
    if aurora_live_review_outcome_record_tool:
        require_path(
            result,
            root,
            str(aurora_live_review_outcome_record_tool),
            "Aurora live review outcome record tool",
        )
    aurora_live_review_outcome_record_schema = manifest.get("aurora_live_review_outcome_record_schema")
    if aurora_live_review_outcome_record_schema:
        require_path(
            result,
            root,
            str(aurora_live_review_outcome_record_schema),
            "Aurora live review outcome record schema",
        )
    aurora_live_review_outcome_record_template = manifest.get("aurora_live_review_outcome_record_template")
    if aurora_live_review_outcome_record_template:
        require_path(
            result,
            root,
            str(aurora_live_review_outcome_record_template),
            "Aurora live review outcome record template",
        )
    aurora_live_review_outcome_record_aggregate = manifest.get("aurora_live_review_outcome_record_aggregate")
    if aurora_live_review_outcome_record_aggregate:
        require_path(
            result,
            root,
            str(aurora_live_review_outcome_record_aggregate),
            "Aurora live review outcome record aggregate",
        )
    aurora_live_review_outcome_record_check = manifest.get("aurora_live_review_outcome_record_check")
    if aurora_live_review_outcome_record_check:
        require_path(
            result,
            root,
            str(aurora_live_review_outcome_record_check),
            "Aurora live review outcome record checker",
        )
    aurora_live_review_queue = manifest.get("aurora_live_review_queue")
    if aurora_live_review_queue:
        require_path(
            result,
            root,
            str(aurora_live_review_queue),
            "Aurora live review queue",
        )
    aurora_live_review_queue_generator = manifest.get("aurora_live_review_queue_generator")
    if aurora_live_review_queue_generator:
        require_path(
            result,
            root,
            str(aurora_live_review_queue_generator),
            "Aurora live review queue generator",
        )
    aurora_live_review_queue_check = manifest.get("aurora_live_review_queue_check")
    if aurora_live_review_queue_check:
        require_path(
            result,
            root,
            str(aurora_live_review_queue_check),
            "Aurora live review queue checker",
        )
    aurora_live_retest_dispatch = manifest.get("aurora_live_retest_dispatch")
    if aurora_live_retest_dispatch:
        require_path(
            result,
            root,
            str(aurora_live_retest_dispatch),
            "Aurora live retest dispatch",
        )
    aurora_live_retest_dispatch_generator = manifest.get("aurora_live_retest_dispatch_generator")
    if aurora_live_retest_dispatch_generator:
        require_path(
            result,
            root,
            str(aurora_live_retest_dispatch_generator),
            "Aurora live retest dispatch generator",
        )
    aurora_live_retest_dispatch_check = manifest.get("aurora_live_retest_dispatch_check")
    if aurora_live_retest_dispatch_check:
        require_path(
            result,
            root,
            str(aurora_live_retest_dispatch_check),
            "Aurora live retest dispatch checker",
        )
    aurora_live_retest_dispatch_roundtrip_check = manifest.get("aurora_live_retest_dispatch_roundtrip_check")
    if aurora_live_retest_dispatch_roundtrip_check:
        require_path(
            result,
            root,
            str(aurora_live_retest_dispatch_roundtrip_check),
            "Aurora live retest dispatch roundtrip checker",
        )
    aurora_live_retest_result_template = manifest.get("aurora_live_retest_result_template")
    if aurora_live_retest_result_template:
        require_path(
            result,
            root,
            str(aurora_live_retest_result_template),
            "Aurora live retest result template",
        )
    aurora_live_retest_result_template_check = manifest.get("aurora_live_retest_result_template_check")
    if aurora_live_retest_result_template_check:
        require_path(
            result,
            root,
            str(aurora_live_retest_result_template_check),
            "Aurora live retest result template checker",
        )
    aurora_live_retest_result_record_tool = manifest.get("aurora_live_retest_result_record_tool")
    if aurora_live_retest_result_record_tool:
        require_path(
            result,
            root,
            str(aurora_live_retest_result_record_tool),
            "Aurora live retest result record tool",
        )
    aurora_live_retest_result_record_schema = manifest.get("aurora_live_retest_result_record_schema")
    if aurora_live_retest_result_record_schema:
        require_path(
            result,
            root,
            str(aurora_live_retest_result_record_schema),
            "Aurora live retest result record schema",
        )
    aurora_live_retest_result_record_template = manifest.get("aurora_live_retest_result_record_template")
    if aurora_live_retest_result_record_template:
        require_path(
            result,
            root,
            str(aurora_live_retest_result_record_template),
            "Aurora live retest result record template",
        )
    aurora_live_retest_result_record_aggregate = manifest.get("aurora_live_retest_result_record_aggregate")
    if aurora_live_retest_result_record_aggregate:
        require_path(
            result,
            root,
            str(aurora_live_retest_result_record_aggregate),
            "Aurora live retest result record aggregate",
        )
    aurora_live_retest_result_record_check = manifest.get("aurora_live_retest_result_record_check")
    if aurora_live_retest_result_record_check:
        require_path(
            result,
            root,
            str(aurora_live_retest_result_record_check),
            "Aurora live retest result record checker",
        )
    aurora_live_retest_operator_bundle_builder = manifest.get("aurora_live_retest_operator_bundle_builder")
    if aurora_live_retest_operator_bundle_builder:
        require_path(
            result,
            root,
            str(aurora_live_retest_operator_bundle_builder),
            "Aurora live retest operator bundle builder",
        )
    aurora_live_retest_operator_bundle_check = manifest.get("aurora_live_retest_operator_bundle_check")
    if aurora_live_retest_operator_bundle_check:
        require_path(
            result,
            root,
            str(aurora_live_retest_operator_bundle_check),
            "Aurora live retest operator bundle checker",
        )
    aurora_live_retest_result_received_bundle_check = manifest.get("aurora_live_retest_result_received_bundle_check")
    if aurora_live_retest_result_received_bundle_check:
        require_path(
            result,
            root,
            str(aurora_live_retest_result_received_bundle_check),
            "Aurora live retest result received bundle checker",
        )
    aurora_live_retest_promotion_bridge = manifest.get("aurora_live_retest_promotion_bridge")
    if aurora_live_retest_promotion_bridge:
        require_path(
            result,
            root,
            str(aurora_live_retest_promotion_bridge),
            "Aurora live retest promotion bridge",
        )
    aurora_live_retest_promotion_bridge_generator = manifest.get("aurora_live_retest_promotion_bridge_generator")
    if aurora_live_retest_promotion_bridge_generator:
        require_path(
            result,
            root,
            str(aurora_live_retest_promotion_bridge_generator),
            "Aurora live retest promotion bridge generator",
        )
    aurora_live_retest_promotion_bridge_check = manifest.get("aurora_live_retest_promotion_bridge_check")
    if aurora_live_retest_promotion_bridge_check:
        require_path(
            result,
            root,
            str(aurora_live_retest_promotion_bridge_check),
            "Aurora live retest promotion bridge checker",
        )
    aurora_live_retest_promotion_decision_tool = manifest.get("aurora_live_retest_promotion_decision_tool")
    if aurora_live_retest_promotion_decision_tool:
        require_path(
            result,
            root,
            str(aurora_live_retest_promotion_decision_tool),
            "Aurora live retest promotion decision tool",
        )
    aurora_live_retest_promotion_decision_check = manifest.get("aurora_live_retest_promotion_decision_check")
    if aurora_live_retest_promotion_decision_check:
        require_path(
            result,
            root,
            str(aurora_live_retest_promotion_decision_check),
            "Aurora live retest promotion decision checker",
        )
    aurora_live_promotion_proof_gates = manifest.get("aurora_live_promotion_proof_gates")
    if aurora_live_promotion_proof_gates:
        require_path(
            result,
            root,
            str(aurora_live_promotion_proof_gates),
            "Aurora live promotion proof-gates dashboard",
        )
    aurora_live_promotion_proof_gates_generator = manifest.get("aurora_live_promotion_proof_gates_generator")
    if aurora_live_promotion_proof_gates_generator:
        require_path(
            result,
            root,
            str(aurora_live_promotion_proof_gates_generator),
            "Aurora live promotion proof-gates generator",
        )
    aurora_live_promotion_proof_gates_check = manifest.get("aurora_live_promotion_proof_gates_check")
    if aurora_live_promotion_proof_gates_check:
        require_path(
            result,
            root,
            str(aurora_live_promotion_proof_gates_check),
            "Aurora live promotion proof-gates checker",
        )
    aurora_live_status = manifest.get("aurora_live_status")
    if aurora_live_status:
        require_path(
            result,
            root,
            str(aurora_live_status),
            "Aurora live evidence status",
        )
    aurora_live_status_generator = manifest.get("aurora_live_status_generator")
    if aurora_live_status_generator:
        require_path(
            result,
            root,
            str(aurora_live_status_generator),
            "Aurora live evidence status generator",
        )
    aurora_live_status_check = manifest.get("aurora_live_status_check")
    if aurora_live_status_check:
        require_path(
            result,
            root,
            str(aurora_live_status_check),
            "Aurora live evidence status checker",
        )
    external_source_registry = manifest.get("external_source_registry")
    if external_source_registry:
        require_path(
            result,
            root,
            str(external_source_registry),
            "external source registry",
        )
    external_source_registry_check = manifest.get("external_source_registry_check")
    if external_source_registry_check:
        require_path(
            result,
            root,
            str(external_source_registry_check),
            "external source registry checker",
        )
    domain_reference_status_check = manifest.get("domain_reference_status_check")
    if domain_reference_status_check:
        require_path(
            result,
            root,
            str(domain_reference_status_check),
            "domain reference status checker",
        )
    capability_map_check = manifest.get("capability_map_check")
    if capability_map_check:
        require_path(
            result,
            root,
            str(capability_map_check),
            "capability map checker",
        )
    feature_design_template = manifest.get("feature_design_template")
    if feature_design_template:
        require_path(
            result,
            root,
            str(feature_design_template),
            "feature design output template",
        )
    feature_design_template_check = manifest.get("feature_design_template_check")
    if feature_design_template_check:
        require_path(
            result,
            root,
            str(feature_design_template_check),
            "feature design output template checker",
        )
    repo_artifact_preflight = manifest.get("repo_artifact_preflight")
    if repo_artifact_preflight:
        require_path(
            result,
            root,
            str(repo_artifact_preflight),
            "repo artifact preflight runner",
        )

    if plugin_manifest:
        try:
            plugin = load_json(plugin_manifest)
        except Exception as exc:
            result.error(f"plugin manifest is invalid: {exc}")
            plugin = {}
        if plugin.get("name") != manifest.get("package_name"):
            result.error(
                f"plugin name {plugin.get('name')!r} does not match "
                f"version manifest package_name {manifest.get('package_name')!r}"
            )
        else:
            result.ok("plugin name matches version manifest")
        if plugin.get("version") != manifest.get("version"):
            result.error(
                f"plugin version {plugin.get('version')!r} does not match "
                f"version manifest version {manifest.get('version')!r}"
            )
        else:
            result.ok("plugin version matches version manifest")

    for label, path in [("authoring skill", authoring_skill), ("plugin skill", plugin_skill)]:
        if not path:
            continue
        skill_name = read_skill_name(path)
        if skill_name != manifest.get("skill_name"):
            result.error(
                f"{label} name {skill_name!r} does not match "
                f"version manifest skill_name {manifest.get('skill_name')!r}"
            )
        else:
            result.ok(f"{label} name matches version manifest")

    gate = manifest.get("release_gate")
    if not isinstance(gate, dict):
        result.error("release_gate must be an object")
    else:
        rc_allowed = gate.get("rc_allowed")
        blockers = gate.get("blockers")
        if not isinstance(rc_allowed, bool):
            result.error("release_gate.rc_allowed must be boolean")
        if not isinstance(blockers, list) or not all(isinstance(item, str) for item in blockers):
            result.error("release_gate.blockers must be a list of strings")
        elif state == "repo artifact":
            if rc_allowed:
                result.error("repo artifact must not set release_gate.rc_allowed=true")
            if not blockers:
                result.warn("repo artifact has no blockers listed")
            else:
                result.ok("repo artifact blockers are listed")
        elif state in {"release candidate", "local install candidate", "public release"}:
            if not rc_allowed:
                result.error(f"{state} must set release_gate.rc_allowed=true")
            if blockers:
                result.error(f"{state} must not list active release blockers")

    semver_policy = manifest.get("semver_policy")
    if not isinstance(semver_policy, dict):
        result.error("semver_policy must be an object")
    else:
        for key in ["patch", "minor", "major"]:
            if not semver_policy.get(key):
                result.error(f"semver_policy.{key} is required")
        if not any(error.startswith("semver_policy.") for error in result.errors):
            result.ok("semver policy is complete")

    return result


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("root", nargs="?", default="docs/nwn-skill-pack")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    result = run(Path(args.root))
    if args.json:
        print(json.dumps({
            "checks": result.checks,
            "warnings": result.warnings,
            "errors": result.errors,
        }, indent=2))
    else:
        for check in result.checks:
            print(f"OK: {check}")
        for warning in result.warnings:
            print(f"WARN: {warning}")
        for error in result.errors:
            print(f"ERROR: {error}")
        if result.errors:
            print(f"Version manifest check failed: {len(result.errors)} error(s)")
        else:
            suffix = f", {len(result.warnings)} warning(s)" if result.warnings else ""
            print(f"Version manifest check passed{suffix}")
    return 1 if result.errors else 0


if __name__ == "__main__":
    sys.exit(main())
