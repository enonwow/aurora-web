#!/usr/bin/env python3
"""Check that record JSON Schemas match the local feedback/test CLIs."""

from __future__ import annotations

import argparse
import importlib.util
import json
import sys
from dataclasses import dataclass, field
from pathlib import Path
from types import ModuleType
from typing import Any


@dataclass
class ContractCheck:
    errors: list[str] = field(default_factory=list)
    checks: list[str] = field(default_factory=list)

    def ok(self, message: str) -> None:
        self.checks.append(message)

    def error(self, message: str) -> None:
        self.errors.append(message)


def load_module(path: Path, name: str) -> ModuleType:
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"cannot import {path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


def load_schema(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, dict):
        raise ValueError(f"{path} must be a JSON object")
    return data


def compare_set(check: ContractCheck, label: str, left: object, right: object) -> None:
    left_set = set(left) if isinstance(left, (list, set, tuple)) else set()
    right_set = set(right) if isinstance(right, (list, set, tuple)) else set()
    if left_set != right_set:
        check.error(
            f"{label} mismatch: schema-only={sorted(left_set - right_set)}, "
            f"cli-only={sorted(right_set - left_set)}"
        )
        return
    check.ok(f"{label} matches")


def nested_properties(schema: dict[str, Any], *keys: str) -> dict[str, Any]:
    value: Any = schema
    for key in keys:
        if not isinstance(value, dict):
            return {}
        value = value.get(key, {})
    return value if isinstance(value, dict) else {}


def check_feedback(root: Path, result: ContractCheck) -> None:
    module = load_module(root / "tools" / "nwn_skill_feedback.py", "nwn_skill_feedback_contract")
    schema = load_schema(root / "knowledge-inbox" / "schema" / "feedback-record.schema.json")

    compare_set(result, "feedback.required", schema.get("required", []), module.REQUIRED_FIELDS)
    compare_set(
        result,
        "feedback.domain enum",
        nested_properties(schema, "properties", "domain").get("enum", []),
        module.ALLOWED_DOMAINS,
    )
    compare_set(
        result,
        "feedback.status enum",
        nested_properties(schema, "properties", "status").get("enum", []),
        module.ALLOWED_STATUSES,
    )
    compare_set(
        result,
        "feedback.source_type enum",
        nested_properties(schema, "properties", "source_type").get("enum", []),
        module.ALLOWED_SOURCE_TYPES,
    )
    review_schema = nested_properties(schema, "properties", "review")
    compare_set(result, "feedback.review.required", review_schema.get("required", []), module.REQUIRED_REVIEW_FIELDS)
    compare_set(
        result,
        "feedback.review.decision enum",
        nested_properties(review_schema, "properties", "decision").get("enum", []),
        module.ALLOWED_REVIEW_DECISIONS,
    )


def check_forward(root: Path, result: ContractCheck) -> None:
    module = load_module(root / "tools" / "forward_test_record.py", "forward_test_record_contract")
    schema = load_schema(root / "forward-tests" / "schema" / "forward-test-record.schema.json")

    compare_set(result, "forward.required", schema.get("required", []), module.REQUIRED_FIELDS)
    compare_set(
        result,
        "forward.record_type enum",
        nested_properties(schema, "properties", "record_type").get("enum", []),
        module.ALLOWED_RECORD_TYPES,
    )
    compare_set(
        result,
        "forward.result enum",
        nested_properties(schema, "properties", "result").get("enum", []),
        module.ALLOWED_RESULTS,
    )
    test_id_pattern = nested_properties(schema, "properties", "test_id").get("pattern")
    if test_id_pattern != module.TEST_ID_RE.pattern:
        result.error(
            f"forward.test_id pattern mismatch: schema={test_id_pattern!r}, "
            f"cli={module.TEST_ID_RE.pattern!r}"
        )
    else:
        result.ok("forward.test_id pattern matches")
    compare_set(
        result,
        "forward.improvement_action.required",
        nested_properties(schema, "properties", "improvement_action").get("required", []),
        module.REQUIRED_IMPROVEMENT_FIELDS,
    )
    compare_set(
        result,
        "forward.install_verification.required",
        nested_properties(schema, "properties", "install_verification").get("required", []),
        module.REQUIRED_INSTALL_VERIFICATION_FIELDS,
    )
    compare_set(
        result,
        "forward.reviewer_assertions.required",
        nested_properties(schema, "properties", "reviewer_assertions").get("required", []),
        module.REQUIRED_REVIEWER_ASSERTION_FIELDS,
    )
    prompt_record = {
        "schema_version": "1",
        "id": "ft-003-contract-smoke",
        "created_at": "2026-06-18T00:00:00Z",
        "record_type": "prompt-forward-test",
        "test_id": "FT-003",
        "title": "Contract prompt smoke",
        "result": "pass",
        "prompt_or_command": "synthetic",
        "skill_path": "synthetic",
        "expected_references": [],
        "observed_references": [],
        "evidence_labels": [],
        "evidence": ["synthetic"],
        "issues": [],
        "missing_evidence": [],
        "artifacts": ["answer-capture synthetic"],
        "feedback_record_ids": [],
        "improvement_action": {
            "needed": False,
            "summary": "",
        },
    }
    prompt_negative_errors = module.validate_record(dict(prompt_record))
    if any("reviewer_assertions" in error for error in prompt_negative_errors):
        result.ok("forward prompt pass without reviewer_assertions is rejected")
    else:
        result.error("forward prompt pass without reviewer_assertions should be rejected")

    prompt_false_record = dict(prompt_record)
    prompt_false_record["reviewer_assertions"] = {
        "first_implementable_slice": False,
    }
    prompt_false_errors = module.validate_record(prompt_false_record)
    if any("first_implementable_slice=true" in error for error in prompt_false_errors):
        result.ok("forward prompt pass with first_implementable_slice=false is rejected")
    else:
        result.error("forward prompt pass with first_implementable_slice=false should be rejected")

    prompt_missing_capture_record = dict(prompt_record)
    prompt_missing_capture_record["reviewer_assertions"] = {
        "first_implementable_slice": True,
    }
    prompt_missing_capture_errors = module.validate_record(prompt_missing_capture_record)
    if any("forward-test-return-captures" in error for error in prompt_missing_capture_errors):
        result.ok("forward prompt pass without returned capture artifact is rejected")
    else:
        result.error("forward prompt pass without returned capture artifact should be rejected")

    prompt_positive_record = dict(prompt_record)
    prompt_positive_record["reviewer_assertions"] = {
        "first_implementable_slice": True,
    }
    prompt_positive_record["artifacts"] = [
        "docs/nwn-skill-pack/.codex-tmp/forward-test-return-captures/FT-003-returned-capture.md"
    ]
    prompt_positive_errors = module.validate_record(prompt_positive_record)
    if prompt_positive_errors:
        result.error(
            "forward prompt pass with reviewer-confirmed First Implementable Slice should be accepted: "
            + "; ".join(prompt_positive_errors)
        )
    else:
        result.ok("forward prompt pass with reviewer-confirmed First Implementable Slice is accepted")

    base_record = {
        "schema_version": "1",
        "id": "install-001-contract-smoke",
        "created_at": "2026-06-18T00:00:00Z",
        "record_type": "install-smoke-test",
        "test_id": "INSTALL-001",
        "title": "Contract smoke",
        "result": "pass",
        "prompt_or_command": "synthetic",
        "skill_path": "synthetic",
        "expected_references": [],
        "observed_references": [],
        "evidence_labels": [],
        "evidence": ["synthetic"],
        "issues": [],
        "missing_evidence": [],
        "artifacts": [],
        "feedback_record_ids": [],
        "improvement_action": {
            "needed": False,
            "summary": "",
        },
    }
    negative_errors = module.validate_record(dict(base_record))
    if any("install_verification" in error for error in negative_errors):
        result.ok("forward install-smoke pass without install_verification is rejected")
    else:
        result.error("forward install-smoke pass without install_verification should be rejected")

    positive_record = dict(base_record)
    positive_record["install_verification"] = {
        "registered_or_installed": True,
        "fresh_context_started": True,
        "skill_visible_or_invokable": True,
        "expected_references_routed": True,
        "runtime_boundary_preserved": True,
        "preparation_only": False,
    }
    positive_errors = module.validate_record(positive_record)
    if positive_errors:
        result.error(
            "forward install-smoke pass with full install_verification should be accepted: "
            + "; ".join(positive_errors)
        )
    else:
        result.ok("forward install-smoke pass with full install_verification is accepted")


def check_external_trial(root: Path, result: ContractCheck) -> None:
    module = load_module(root / "tools" / "external_trial_record.py", "external_trial_record_contract")
    schema = load_schema(root / "knowledge-inbox" / "schema" / "external-contributor-trial-record.schema.json")

    compare_set(result, "external_trial.required", schema.get("required", []), module.REQUIRED_FIELDS)
    compare_set(
        result,
        "external_trial.result enum",
        nested_properties(schema, "properties", "result").get("enum", []),
        module.ALLOWED_RESULTS,
    )
    compare_set(
        result,
        "external_trial.path_used enum",
        nested_properties(schema, "properties", "path_used").get("enum", []),
        module.ALLOWED_PATHS,
    )
    trial_id_pattern = nested_properties(schema, "properties", "trial_id").get("pattern")
    if trial_id_pattern != module.TRIAL_ID_RE.pattern:
        result.error(
            f"external_trial.trial_id pattern mismatch: schema={trial_id_pattern!r}, "
            f"cli={module.TRIAL_ID_RE.pattern!r}"
        )
    else:
        result.ok("external_trial.trial_id pattern matches")
    compare_set(
        result,
        "external_trial.privacy_confirmation.required",
        nested_properties(schema, "properties", "privacy_confirmation").get("required", []),
        module.REQUIRED_PRIVACY_FIELDS,
    )
    compare_set(
        result,
        "external_trial.maintainer_verification.required",
        nested_properties(schema, "properties", "maintainer_verification").get("required", []),
        module.REQUIRED_VERIFICATION_FIELDS,
    )
    compare_set(
        result,
        "external_trial.improvement_action.required",
        nested_properties(schema, "properties", "improvement_action").get("required", []),
        module.REQUIRED_IMPROVEMENT_FIELDS,
    )


def check_reference_promotion(root: Path, result: ContractCheck) -> None:
    module = load_module(root / "tools" / "reference_promotion_record.py", "reference_promotion_record_contract")
    schema = load_schema(root / "knowledge-inbox" / "schema" / "reference-promotion-record.schema.json")

    compare_set(result, "reference_promotion.required", schema.get("required", []), module.REQUIRED_FIELDS)
    compare_set(
        result,
        "reference_promotion.result enum",
        nested_properties(schema, "properties", "result").get("enum", []),
        module.ALLOWED_RESULTS,
    )
    compare_set(
        result,
        "reference_promotion.semver enum",
        nested_properties(schema, "properties", "semver").get("enum", []),
        module.ALLOWED_SEMVER,
    )
    compare_set(
        result,
        "reference_promotion.evidence_label enum",
        nested_properties(schema, "properties", "evidence_label").get("enum", []),
        module.ALLOWED_EVIDENCE_LABELS,
    )
    compare_set(
        result,
        "reference_promotion.verification.required",
        nested_properties(schema, "properties", "verification").get("required", []),
        module.REQUIRED_VERIFICATION_FIELDS,
    )
    compare_set(
        result,
        "reference_promotion.release_updates.required",
        nested_properties(schema, "properties", "release_updates").get("required", []),
        module.REQUIRED_RELEASE_UPDATE_FIELDS,
    )

    base_record = {
        "schema_version": "1",
        "id": "rpr-contract-smoke",
        "created_at": "2026-06-18T00:00:00Z",
        "feedback_record_id": "feedback-contract-smoke",
        "proposal_path": "knowledge-inbox/reference-promotion-proposals/feedback-contract-smoke.md",
        "result": "accepted",
        "maintainer": "contract-maintainer",
        "target_references": [
            "draft-skills/nwn-server-gamedev/references/nui-player-ui.md",
            "draft-plugins/nwn-server-gamedev-pack/skills/nwn-server-gamedev/references/nui-player-ui.md",
        ],
        "evidence_label": "docs-verified",
        "semver": "MINOR",
        "verification": {
            "proposal_reviewed": True,
            "references_patched": True,
            "authoring_and_plugin_synced": True,
            "privacy_checked": True,
            "checks_run": ["check_skill_routes.py", "run_repo_artifact_preflight.py"],
            "checks_passed": ["check_skill_routes.py", "run_repo_artifact_preflight.py"],
        },
        "release_updates": {
            "version_manifest_updated": True,
            "plugin_manifest_updated": True,
            "release_handoff_updated": True,
            "source_of_truth_updated": True,
            "promoted_record_path": "knowledge-inbox/promoted/feedback-contract-smoke.json",
        },
        "follow_up_actions": [],
        "non_proof_boundaries": ["Does not prove NWN runtime behavior."],
        "notes": "Synthetic contract smoke.",
    }
    positive_errors = module.validate_record(base_record)
    if positive_errors:
        result.error(
            "reference promotion accepted record should be accepted: "
            + "; ".join(positive_errors)
        )
    else:
        result.ok("reference promotion accepted record is accepted")

    negative_record = dict(base_record)
    negative_record["semver"] = "NONE"
    negative_errors = module.validate_record(negative_record)
    if any("semver" in error for error in negative_errors):
        result.ok("reference promotion accepted record with semver=NONE is rejected")
    else:
        result.error("reference promotion accepted record with semver=NONE should be rejected")


def check_aurora_toolset_live(root: Path, result: ContractCheck) -> None:
    module = load_module(root / "tools" / "aurora_toolset_live_record.py", "aurora_toolset_live_record_contract")
    schema = load_schema(root / "knowledge-inbox" / "schema" / "aurora-toolset-live-record.schema.json")

    compare_set(result, "aurora_toolset_live.required", schema.get("required", []), module.REQUIRED_FIELDS)
    compare_set(
        result,
        "aurora_toolset_live.environment.required",
        nested_properties(schema, "properties", "environment").get("required", []),
        module.REQUIRED_ENV_FIELDS,
    )
    atom_items = nested_properties(schema, "properties", "atoms", "items")
    compare_set(
        result,
        "aurora_toolset_live.atom.required",
        atom_items.get("required", []),
        module.REQUIRED_ATOM_FIELDS,
    )
    compare_set(
        result,
        "aurora_toolset_live.atom enum",
        nested_properties(atom_items, "properties", "atom").get("enum", []),
        module.ATOMS,
    )
    compare_set(
        result,
        "aurora_toolset_live.status enum",
        nested_properties(atom_items, "properties", "status").get("enum", []),
        module.ALLOWED_STATUSES,
    )
    compare_set(
        result,
        "aurora_toolset_live.evidence_label enum",
        nested_properties(atom_items, "properties", "evidence_label").get("enum", []),
        module.ALLOWED_EVIDENCE_LABELS,
    )
    compare_set(
        result,
        "aurora_toolset_live.overall_result enum",
        nested_properties(schema, "properties", "overall_result").get("enum", []),
        module.ALLOWED_RESULTS,
    )
    compare_set(
        result,
        "aurora_toolset_live.promotion.required",
        nested_properties(schema, "properties", "promotion").get("required", []),
        module.REQUIRED_PROMOTION_FIELDS,
    )

    template = load_schema(root / "knowledge-inbox" / "templates" / "aurora-toolset-live-record-template.json")
    template_errors = module.validate_record(template)
    if template_errors:
        result.error(
            "aurora Toolset live not-run template should be accepted: "
            + "; ".join(template_errors)
        )
    else:
        result.ok("aurora Toolset live not-run template is accepted")
    if template.get("id") == "aurora-live-YYYYMMDD-small-location-first-pass":
        result.ok("aurora Toolset live template uses first-pass record id")
    else:
        result.error("aurora Toolset live template must use aurora-live-YYYYMMDD-small-location-first-pass")

    positive_record = json.loads(json.dumps(template))
    for atom_record in positive_record["atoms"]:
        atom_record["status"] = "observed-toolset"
        atom_record["evidence_label"] = "toolset-observed"
        atom_record["observations"] = [f"Observed {atom_record['atom']} in synthetic smoke."]
        atom_record["artifacts"] = [f".codex-tmp/synthetic/{atom_record['atom']}.png"]
    positive_record["overall_result"] = "partial"
    positive_errors = module.validate_record(positive_record)
    if positive_errors:
        result.error(
            "aurora Toolset live observed-toolset synthetic record should be accepted: "
            + "; ".join(positive_errors)
        )
    else:
        result.ok("aurora Toolset live observed-toolset synthetic record is accepted")

    negative_record = json.loads(json.dumps(template))
    negative_record["atoms"][0]["status"] = "runtime-tested"
    negative_record["atoms"][0]["evidence_label"] = "toolset-observed"
    negative_record["atoms"][0]["observations"] = ["Synthetic runtime claim."]
    negative_record["atoms"][0]["artifacts"] = [".codex-tmp/synthetic/runtime.png"]
    negative_errors = module.validate_record(negative_record)
    if any("runtime-tested" in error for error in negative_errors):
        result.ok("aurora Toolset live runtime-tested atom without runtime evidence label is rejected")
    else:
        result.error("aurora Toolset live runtime-tested atom without runtime evidence label should be rejected")


def check_aurora_visual_redaction(root: Path, result: ContractCheck) -> None:
    module = load_module(
        root / "tools" / "aurora_live_visual_redaction_record.py",
        "aurora_visual_redaction_record_contract",
    )
    schema = load_schema(root / "knowledge-inbox" / "schema" / "aurora-live-visual-redaction-record.schema.json")

    compare_set(result, "aurora_visual_redaction.required", schema.get("required", []), module.REQUIRED_FIELDS)
    compare_set(
        result,
        "aurora_visual_redaction.result enum",
        nested_properties(schema, "properties", "result").get("enum", []),
        module.ALLOWED_RESULTS,
    )
    artifact_schema = nested_properties(schema, "properties", "artifacts_reviewed", "items")
    compare_set(
        result,
        "aurora_visual_redaction.artifact.required",
        artifact_schema.get("required", []),
        module.REQUIRED_ARTIFACT_FIELDS,
    )
    compare_set(
        result,
        "aurora_visual_redaction.artifact.kind enum",
        nested_properties(artifact_schema, "properties", "kind").get("enum", []),
        module.ALLOWED_ARTIFACT_KINDS,
    )
    compare_set(
        result,
        "aurora_visual_redaction.artifact.redaction enum",
        nested_properties(artifact_schema, "properties", "redaction_status").get("enum", []),
        module.ALLOWED_REDACTION_STATUSES,
    )
    compare_set(
        result,
        "aurora_visual_redaction.artifact.review enum",
        nested_properties(artifact_schema, "properties", "review_result").get("enum", []),
        module.ALLOWED_REVIEW_RESULTS,
    )
    for field in ["source_artifact_sha256", "reviewed_artifact_sha256"]:
        pattern = nested_properties(artifact_schema, "properties", field).get("pattern")
        if pattern != module.SHA256_RE.pattern:
            result.error(f"aurora_visual_redaction.artifact.{field} pattern mismatch")
        else:
            result.ok(f"aurora_visual_redaction.artifact.{field} pattern matches")
    if nested_properties(artifact_schema, "properties", "external_provenance_note").get("type") == "string":
        result.ok("aurora_visual_redaction.artifact.external_provenance_note schema field exists")
    else:
        result.error("aurora_visual_redaction.artifact.external_provenance_note schema field missing")
    for field in ["external_storage_provider", "external_access_checked_at"]:
        if nested_properties(artifact_schema, "properties", field).get("type") == "string":
            result.ok(f"aurora_visual_redaction.artifact.{field} schema field exists")
        else:
            result.error(f"aurora_visual_redaction.artifact.{field} schema field missing")
    compare_set(
        result,
        "aurora_visual_redaction.visual_review.required",
        nested_properties(schema, "properties", "visual_review").get("required", []),
        module.REQUIRED_VISUAL_REVIEW_FIELDS,
    )

    base_record = {
        "schema_version": "1",
        "id": "avr-contract-smoke",
        "created_at": "2026-06-18T23:26:07Z",
        "live_record_id": "aurora-live-contract-smoke",
        "evidence_manifest_path": "knowledge-inbox/aurora-live-evidence-manifests/aurora-live-contract-smoke.json",
        "reviewer": "contract-maintainer",
        "result": "pass",
        "artifacts_reviewed": [
            {
                "artifact_id": "area-wizard-step-01",
                "atom": "area.createWithWizard",
                "kind": "screenshot",
                "path_or_external_ref": "redacted/area-wizard-step-01.png",
                "source_artifact_ref": "screenshots/area-wizard-step-01.png",
                "source_artifact_sha256": "a" * 64,
                "reviewed_artifact_sha256": "b" * 64,
                "redaction_status": "redacted",
                "review_result": "passed",
            }
        ],
        "visual_review": {
            "all_artifacts_opened": True,
            "screenshots_reviewed": True,
            "logs_reviewed": True,
            "no_private_data_visible": True,
            "redaction_irreversible": True,
            "hashes_or_external_notes_checked": True,
            "raw_reverse_excluded": True,
        },
        "privacy_findings": [],
        "blocked_atoms": [],
        "checks_run": ["check_aurora_live_visual_redaction_checklist.py"],
        "checks_passed": ["check_aurora_live_visual_redaction_checklist.py"],
        "non_proof_boundaries": ["Does not prove NWN runtime behavior."],
        "notes": "Synthetic contract smoke.",
    }
    positive_errors = module.validate_record(base_record)
    if positive_errors:
        result.error(
            "aurora visual redaction pass record should be accepted: "
            + "; ".join(positive_errors)
        )
    else:
        result.ok("aurora visual redaction pass record is accepted")

    negative_record = json.loads(json.dumps(base_record))
    negative_record["artifacts_reviewed"][0]["redaction_status"] = "pending-redaction"
    negative_record["visual_review"]["no_private_data_visible"] = False
    negative_errors = module.validate_record(negative_record)
    if (
        any("redaction_status" in error for error in negative_errors)
        and any("no_private_data_visible" in error for error in negative_errors)
    ):
        result.ok("aurora visual redaction pass record with pending/private state is rejected")
    else:
        result.error("aurora visual redaction pass record with pending/private state should be rejected")


def check_aurora_review_outcome(root: Path, result: ContractCheck) -> None:
    module = load_module(
        root / "tools" / "aurora_live_review_outcome_record.py",
        "aurora_review_outcome_record_contract",
    )
    schema = load_schema(root / "knowledge-inbox" / "schema" / "aurora-live-review-outcome-record.schema.json")

    compare_set(result, "aurora_review_outcome.required", schema.get("required", []), module.REQUIRED_FIELDS)
    compare_set(
        result,
        "aurora_review_outcome.outcome enum",
        nested_properties(schema, "properties", "outcome").get("enum", []),
        module.ALLOWED_OUTCOMES,
    )

    template = load_schema(root / "knowledge-inbox" / "templates" / "aurora-live-review-outcome-record-template.json")
    template_errors = module.validate_record(template)
    if template_errors:
        result.error(
            "aurora review outcome not-run template should be accepted: "
            + "; ".join(template_errors)
        )
    else:
        result.ok("aurora review outcome not-run template is accepted")
    if (
        template.get("id") == "alro-YYYYMMDD-small-location-first-pass"
        and template.get("live_record_id") == "aurora-live-YYYYMMDD-small-location-first-pass"
        and str(template.get("evidence_manifest_path", "")).endswith(
            "aurora-live-evidence-manifest-YYYYMMDD-small-location-first-pass.json"
        )
    ):
        result.ok("aurora review outcome template uses first-pass record and manifest ids")
    else:
        result.error("aurora review outcome template must use first-pass record and manifest ids")

    base_record = {
        "schema_version": "1",
        "id": "alro-contract-smoke",
        "created_at": "2026-06-19T02:59:41Z",
        "live_record_id": "aurora-live-contract-smoke",
        "live_record_path": "knowledge-inbox/aurora-live-records/aurora-live-contract-smoke.json",
        "evidence_manifest_path": "knowledge-inbox/aurora-live-evidence-manifests/aurora-live-evidence-manifest-contract-smoke.json",
        "reviewer": "contract-maintainer",
        "outcome": "accept-for-proposal",
        "decision_summary": "Synthetic accepted review outcome.",
        "promotion_proposal_path": "knowledge-inbox/reference-promotion-proposals/aurora-live-contract-smoke.md",
        "reference_promotion_allowed": True,
        "accepted_atoms": ["area.createWithWizard"],
        "held_atoms": [],
        "rejected_atoms": [],
        "blocked_atoms": [],
        "visual_redaction_record_ids": ["avr-contract-smoke"],
        "checks_run": ["check_aurora_live_records.py"],
        "checks_passed": ["check_aurora_live_records.py"],
        "privacy_findings": [],
        "schema_expansion_candidates": [],
        "next_actions": ["Generate and review a promotion proposal."],
        "non_proof_boundaries": [
            "Review outcome records do not prove Aurora Toolset behavior or NWN runtime behavior."
        ],
        "notes": "Synthetic contract smoke.",
    }
    positive_errors = module.validate_record(base_record)
    if positive_errors:
        result.error(
            "aurora review outcome accept-for-proposal record should be accepted: "
            + "; ".join(positive_errors)
        )
    else:
        result.ok("aurora review outcome accept-for-proposal record is accepted")

    negative_record = dict(base_record)
    negative_record["reference_promotion_allowed"] = False
    negative_record["visual_redaction_record_ids"] = []
    negative_record["checks_passed"] = []
    negative_errors = module.validate_record(negative_record)
    if (
        any("reference_promotion_allowed=true" in error for error in negative_errors)
        and any("visual_redaction_record_ids" in error for error in negative_errors)
        and any("checks_passed" in error for error in negative_errors)
    ):
        result.ok("aurora review outcome accepted record with missing promotion gates is rejected")
    else:
        result.error("aurora review outcome accepted record with missing promotion gates should be rejected")


def check_aurora_retest_result(root: Path, result: ContractCheck) -> None:
    module = load_module(
        root / "tools" / "aurora_live_retest_result_record.py",
        "aurora_retest_result_record_contract",
    )
    schema = load_schema(root / "knowledge-inbox" / "schema" / "aurora-live-retest-result-record.schema.json")

    compare_set(result, "aurora_retest_result.required", schema.get("required", []), module.REQUIRED_FIELDS)
    compare_set(
        result,
        "aurora_retest_result.result enum",
        nested_properties(schema, "properties", "result").get("enum", []),
        module.ALLOWED_RESULTS,
    )
    compare_set(
        result,
        "aurora_retest_result.operator.required",
        nested_properties(schema, "properties", "operator").get("required", []),
        module.REQUIRED_OPERATOR_FIELDS,
    )
    compare_set(
        result,
        "aurora_retest_result.privacy.required",
        nested_properties(schema, "properties", "privacy_confirmation").get("required", []),
        module.REQUIRED_PRIVACY_FIELDS,
    )
    compare_set(
        result,
        "aurora_retest_result.maintainer_verification.required",
        nested_properties(schema, "properties", "maintainer_verification").get("required", []),
        module.REQUIRED_VERIFICATION_FIELDS,
    )
    sha_pattern = nested_properties(
        schema,
        "properties",
        "artifact_hashes",
        "items",
        "properties",
        "sha256",
    ).get("pattern")
    if sha_pattern != module.SHA256_RE.pattern:
        result.error("aurora_retest_result.artifact_hash.sha256 pattern mismatch")
    else:
        result.ok("aurora_retest_result.artifact_hash.sha256 pattern matches")

    template = load_schema(root / "knowledge-inbox" / "templates" / "aurora-live-retest-result-record-template.json")
    template_errors = module.validate_record(template)
    if template_errors:
        result.error(
            "aurora retest result not-run template should be accepted: "
            + "; ".join(template_errors)
        )
    else:
        result.ok("aurora retest result not-run template is accepted")
    if (
        template.get("id") == "alrr-YYYYMMDD-small-location-first-pass-toolset-build"
        and template.get("source_review_outcome_id") == "alro-YYYYMMDD-small-location-first-pass"
        and template.get("live_record_id") == "aurora-live-YYYYMMDD-small-location-first-pass"
        and str(template.get("evidence_manifest_path", "")).endswith(
            "aurora-live-evidence-manifest-YYYYMMDD-small-location-first-pass.json"
        )
    ):
        result.ok("aurora retest result template uses first-pass review, record, and manifest ids")
    else:
        result.error("aurora retest result template must use first-pass review, record, and manifest ids")

    base_record = {
        "schema_version": "1",
        "id": "alrr-contract-smoke",
        "created_at": "2026-06-19T06:44:44Z",
        "source_dispatch_path": "knowledge-inbox/aurora-live-retest-dispatch.md",
        "dispatch_manifest_path": ".codex-tmp/aurora-live-retest-operator-bundle/current/RETEST-OPERATOR-BUNDLE-MANIFEST.json",
        "source_review_outcome_id": "alro-contract-smoke",
        "source_review_outcome_path": "knowledge-inbox/aurora-live-review-outcomes/records/alro-contract-smoke.json",
        "live_record_id": "aurora-live-contract-smoke",
        "live_record_path": "knowledge-inbox/aurora-live-records/aurora-live-contract-smoke.json",
        "evidence_manifest_path": "knowledge-inbox/aurora-live-evidence-manifests/aurora-live-evidence-manifest-contract-smoke.json",
        "target_atom": "toolset.buildAndClientRun",
        "requested_next_action": "Repeat Minimum First Live Pass for build and client runtime evidence.",
        "operator": {
            "handle": "contract-operator",
            "toolset_version": "contract-toolset",
            "nwn_ee_version": "contract-nwn-ee",
            "environment_summary": "synthetic contract environment",
        },
        "result": "pass",
        "decision_summary": "Synthetic pass retest result.",
        "passed_atoms": ["toolset.buildAndClientRun"],
        "partial_atoms": [],
        "failed_atoms": [],
        "blocked_atoms": [],
        "returned_artifacts": [
            ".codex-tmp/aurora-live-evidence/contract/client.log",
        ],
        "artifact_hashes": [
            {
                "path": ".codex-tmp/aurora-live-evidence/contract/client.log",
                "sha256": "a" * 64,
            }
        ],
        "checks_run": ["check_aurora_live_records.py"],
        "checks_passed": ["check_aurora_live_records.py"],
        "privacy_confirmation": {
            "no_private_data": True,
            "quarantine_required": False,
            "summary": "Synthetic scrub found no private data.",
        },
        "privacy_findings": [],
        "maintainer_verification": {
            "dispatch_check": True,
            "result_template_check": True,
            "records_check": True,
            "evidence_manifest_check": True,
            "intake_consistency_check": True,
            "redaction_policy_check": True,
            "visual_redaction_check": True,
            "notes": "Synthetic maintainer verification.",
        },
        "next_actions": ["Run review outcome intake before promotion."],
        "non_proof_boundaries": [
            "Retest result records prove maintainer intake process only.",
        ],
        "notes": "Synthetic contract smoke.",
    }
    positive_errors = module.validate_record(base_record)
    if positive_errors:
        result.error(
            "aurora retest result pass record should be accepted: "
            + "; ".join(positive_errors)
        )
    else:
        result.ok("aurora retest result pass record is accepted")

    negative_record = json.loads(json.dumps(base_record))
    negative_record["returned_artifacts"] = []
    negative_record["privacy_confirmation"]["no_private_data"] = False
    negative_errors = module.validate_record(negative_record)
    if (
        any("returned_artifacts" in error for error in negative_errors)
        and any("no private data" in error for error in negative_errors)
    ):
        result.ok("aurora retest result pass without artifacts/privacy is rejected")
    else:
        result.error("aurora retest result pass without artifacts/privacy should be rejected")


def run(root: Path) -> ContractCheck:
    result = ContractCheck()
    check_feedback(root, result)
    check_forward(root, result)
    check_external_trial(root, result)
    check_reference_promotion(root, result)
    check_aurora_toolset_live(root, result)
    check_aurora_visual_redaction(root, result)
    check_aurora_review_outcome(root, result)
    check_aurora_retest_result(root, result)
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
            print(f"Record contract check failed: {len(result.errors)} error(s)")
        else:
            print("Record contract check passed")
    return 1 if result.errors else 0


if __name__ == "__main__":
    sys.exit(main())
