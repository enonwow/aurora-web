#!/usr/bin/env python3
"""Check Aurora live review outcome record schema, validator, and aggregate."""

from __future__ import annotations

import argparse
import importlib.util
import json
import subprocess
import sys
from dataclasses import dataclass, field
from pathlib import Path
from types import ModuleType
from typing import Any


SCHEMA = Path("knowledge-inbox/schema/aurora-live-review-outcome-record.schema.json")
TEMPLATE = Path("knowledge-inbox/templates/aurora-live-review-outcome-record-template.json")
AGGREGATE = Path("knowledge-inbox/aurora-live-review-outcomes/aggregate.md")
RECORD_DIR = Path("knowledge-inbox/aurora-live-review-outcomes/records")
SCRATCH = Path(".codex-tmp/aurora-live-review-outcomes")
MINIMUM_FIRST_PASS_HELD_ATOMS = [
    "area.createWithWizard",
    "palette.switchBlueprintSource",
    "palette.selectObjectFamilyByIcon",
    "placeable.editBlueprintOrInstance",
    "inventory.insertItem",
    "creature.editBlueprintOrInstance",
    "door.linkAreaTransition",
    "toolset.buildAndClientRun",
]
MINIMUM_FIRST_PASS_BLOCKER = (
    "Minimum First Live Pass incomplete: return evidence or exact blockers for the smallest failed atom."
)
MINIMUM_FIRST_PASS_NEXT_ACTION = "Repeat Minimum First Live Pass before generating a promotion proposal."
REQUIRED_TEMPLATE_TOKENS = [
    "alro-YYYYMMDD-small-location-first-pass",
    "aurora-live-YYYYMMDD-small-location-first-pass",
    "aurora-live-evidence-manifest-YYYYMMDD-small-location-first-pass.json",
]
STALE_TEMPLATE_TOKENS = [
    "alro-YYYYMMDD-small-location\"",
    "aurora-live-YYYYMMDD-small-location\"",
    "aurora-live-YYYYMMDD-small-location.json",
    "aurora-live-evidence-manifest-YYYYMMDD-small-location.json",
]


@dataclass
class OutcomeRecordCheck:
    checks: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)

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


def load_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, dict):
        raise ValueError(f"{path} must contain a JSON object")
    return data


def write_json(path: Path, data: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def nested_properties(schema: dict[str, Any], *keys: str) -> dict[str, Any]:
    value: Any = schema
    for key in keys:
        if not isinstance(value, dict):
            return {}
        value = value.get(key, {})
    return value if isinstance(value, dict) else {}


def compare_set(result: OutcomeRecordCheck, label: str, left: object, right: object) -> None:
    left_set = set(left) if isinstance(left, (list, set, tuple)) else set()
    right_set = set(right) if isinstance(right, (list, set, tuple)) else set()
    if left_set != right_set:
        result.error(
            f"{label} mismatch: schema-only={sorted(left_set - right_set)}, "
            f"tool-only={sorted(right_set - left_set)}"
        )
    else:
        result.ok(f"{label} matches")


def base_record(outcome: str = "accept-for-proposal") -> dict[str, Any]:
    return {
        "schema_version": "1",
        "id": "alro-fixture-live-review",
        "created_at": "2026-06-19T02:59:41+00:00",
        "live_record_id": "aurora-live-20990101-review-outcome-fixture",
        "live_record_path": "knowledge-inbox/aurora-live-records/aurora-live-20990101-review-outcome-fixture.json",
        "evidence_manifest_path": "knowledge-inbox/aurora-live-evidence-manifests/aurora-live-evidence-manifest-20990101-review-outcome-fixture.json",
        "reviewer": "fixture-maintainer",
        "outcome": outcome,
        "decision_summary": "Synthetic fixture outcome.",
        "promotion_proposal_path": "knowledge-inbox/reference-promotion-proposals/aurora-live-20990101-review-outcome-fixture.md",
        "reference_promotion_allowed": True,
        "accepted_atoms": ["area.createWithWizard"],
        "held_atoms": [],
        "rejected_atoms": [],
        "blocked_atoms": [],
        "visual_redaction_record_ids": ["avr-fixture-visual-redaction"],
        "checks_run": [
            "check_aurora_live_records.py",
            "check_aurora_live_evidence_manifest.py",
            "check_aurora_live_intake_consistency.py",
            "check_aurora_live_visual_redaction_records.py",
        ],
        "checks_passed": [
            "check_aurora_live_records.py",
            "check_aurora_live_evidence_manifest.py",
            "check_aurora_live_intake_consistency.py",
            "check_aurora_live_visual_redaction_records.py",
        ],
        "privacy_findings": [],
        "schema_expansion_candidates": [],
        "next_actions": ["Generate and review a reference promotion proposal."],
        "non_proof_boundaries": [
            "Review outcome records do not prove Aurora Toolset behavior or NWN runtime behavior."
        ],
        "notes": "Synthetic accepted live review fixture.",
    }


def base_live_record() -> dict[str, Any]:
    return {
        "schema_version": "1",
        "id": "aurora-live-20990101-roundtrip-smoke",
        "atoms": [
            {
                "atom": "area.createWithWizard",
                "status": "observed-toolset",
                "promotion_ready": True,
            },
            {
                "atom": "area.editProperties",
                "status": "blocked",
                "promotion_ready": False,
            },
        ],
    }


def base_minimum_first_pass_live_record(complete: bool) -> dict[str, Any]:
    atoms: list[dict[str, Any]] = []
    for index, atom in enumerate(MINIMUM_FIRST_PASS_HELD_ATOMS):
        ready = complete or index == 0
        atoms.append(
            {
                "atom": atom,
                "status": "observed-toolset" if ready else "blocked",
                "promotion_ready": ready,
            }
        )
    return {
        "schema_version": "1",
        "id": "aurora-live-20990101-minimum-first-pass",
        "checklist_path": "docs/nwn-skill-pack/local-aurora-small-location-live-operator-checklist.md",
        "atoms": atoms,
    }


def run(root: Path) -> OutcomeRecordCheck:
    result = OutcomeRecordCheck()
    tool = load_module(root / "tools" / "aurora_live_review_outcome_record.py", "aurora_review_outcome_check")

    schema_path = root / SCHEMA
    if not schema_path.exists():
        result.error(f"{SCHEMA} is missing")
        return result
    schema = load_json(schema_path)
    result.ok(f"{SCHEMA} exists and parses")

    compare_set(result, "review outcome required fields", schema.get("required", []), tool.REQUIRED_FIELDS)
    compare_set(
        result,
        "review outcome enum",
        nested_properties(schema, "properties", "outcome").get("enum", []),
        tool.ALLOWED_OUTCOMES,
    )

    template_path = root / TEMPLATE
    if not template_path.exists():
        result.error(f"{TEMPLATE} is missing")
    else:
        template = load_json(template_path)
        template_errors = tool.validate_record(template)
        if template_errors:
            result.error("review outcome not-run template should validate: " + "; ".join(template_errors))
        else:
            result.ok("review outcome not-run template validates")
        template_text = template_path.read_text(encoding="utf-8")
        missing = [token for token in REQUIRED_TEMPLATE_TOKENS if token not in template_text]
        if missing:
            result.error("review outcome template missing first-pass tokens: " + ", ".join(missing))
        else:
            result.ok("review outcome template includes first-pass id/path tokens")
        stale = [token for token in STALE_TEMPLATE_TOKENS if token in template_text]
        if stale:
            result.error("review outcome template contains stale pre-first-pass tokens: " + ", ".join(stale))
        else:
            result.ok("review outcome template does not contain stale pre-first-pass path tokens")

    accepted = base_record()
    accepted_errors = tool.validate_record(accepted)
    if accepted_errors:
        result.error("accepted review outcome fixture should validate: " + "; ".join(accepted_errors))
    else:
        result.ok("accepted review outcome fixture validates")

    bad = base_record()
    bad["reference_promotion_allowed"] = False
    bad["visual_redaction_record_ids"] = []
    bad["checks_passed"] = []
    bad_errors = tool.validate_record(bad)
    if (
        any("reference_promotion_allowed=true" in error for error in bad_errors)
        and any("visual_redaction_record_ids" in error for error in bad_errors)
        and any("checks_passed" in error for error in bad_errors)
    ):
        result.ok("accepted review outcome fixture rejects missing promotion permission, visual review record, and passed checks")
    else:
        result.error("accepted review outcome fixture did not reject required negative conditions")

    hold = base_record("hold-for-retest")
    hold["promotion_proposal_path"] = ""
    hold["reference_promotion_allowed"] = False
    hold["accepted_atoms"] = []
    hold["held_atoms"] = MINIMUM_FIRST_PASS_HELD_ATOMS
    hold["blocked_atoms"] = [MINIMUM_FIRST_PASS_BLOCKER]
    hold["next_actions"] = [MINIMUM_FIRST_PASS_NEXT_ACTION]
    hold_errors = tool.validate_record(hold)
    if hold_errors:
        result.error("held review outcome fixture should validate: " + "; ".join(hold_errors))
    else:
        result.ok("held review outcome fixture validates")

    bad_hold = dict(hold)
    bad_hold["accepted_atoms"] = ["area.createWithWizard"]
    bad_hold_errors = tool.validate_record(bad_hold)
    if any("empty accepted_atoms" in error for error in bad_hold_errors):
        result.ok("held review outcome fixture rejects inherited accepted atoms")
    else:
        result.error("held review outcome fixture did not reject inherited accepted atoms")

    reject = base_record("reject")
    reject["promotion_proposal_path"] = ""
    reject["reference_promotion_allowed"] = False
    reject["accepted_atoms"] = []
    reject["rejected_atoms"] = ["area.createWithWizard"]
    reject["privacy_findings"] = ["Synthetic raw/private evidence finding."]
    reject_errors = tool.validate_record(reject)
    if reject_errors:
        result.error("rejected review outcome fixture should validate: " + "; ".join(reject_errors))
    else:
        result.ok("rejected review outcome fixture validates")

    bad_reject = dict(reject)
    bad_reject["accepted_atoms"] = ["area.createWithWizard"]
    bad_reject_errors = tool.validate_record(bad_reject)
    if any("empty accepted_atoms" in error for error in bad_reject_errors):
        result.ok("rejected review outcome fixture rejects inherited accepted atoms")
    else:
        result.error("rejected review outcome fixture did not reject inherited accepted atoms")

    scratch_new_records = root / SCRATCH / "new-command-records"
    completed_new = subprocess.run(
        [
            sys.executable,
            str(root / "tools" / "aurora_live_review_outcome_record.py"),
            "new",
            "--out",
            str(scratch_new_records),
            "--id",
            "alro-fixture-new-command",
            "--live-record-id",
            "aurora-live-20990101-review-outcome-fixture",
            "--live-record-path",
            "knowledge-inbox/aurora-live-records/aurora-live-20990101-review-outcome-fixture.json",
            "--evidence-manifest-path",
            "knowledge-inbox/aurora-live-evidence-manifests/aurora-live-evidence-manifest-20990101-review-outcome-fixture.json",
            "--reviewer",
            "fixture-maintainer",
            "--outcome",
            "accept-for-proposal",
            "--decision-summary",
            "Synthetic new-command fixture accepted.",
            "--promotion-proposal-path",
            "knowledge-inbox/reference-promotion-proposals/aurora-live-20990101-review-outcome-fixture.md",
            "--reference-promotion-allowed",
            "--accepted-atom",
            "area.createWithWizard",
            "--visual-redaction-record-id",
            "avr-fixture-visual-redaction",
            "--check-run",
            "check_aurora_live_records.py",
            "--check-run",
            "check_aurora_live_visual_redaction_records.py",
            "--check-passed",
            "check_aurora_live_records.py",
            "--check-passed",
            "check_aurora_live_visual_redaction_records.py",
            "--next-action",
            "Generate and review a reference promotion proposal.",
        ],
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )
    new_record_path = scratch_new_records / "alro-fixture-new-command.json"
    if completed_new.returncode != 0:
        result.error(f"review outcome new command failed: {completed_new.stdout.strip()}")
    elif not new_record_path.exists():
        result.error("review outcome new command did not write expected record")
    else:
        new_errors = tool.validate_record(load_json(new_record_path))
        if new_errors:
            result.error("review outcome new command wrote invalid record: " + "; ".join(new_errors))
        else:
            result.ok("review outcome new command writes a valid accepted record")

    scratch_from_live = root / SCRATCH / "from-live-record-command"
    live_record_path = scratch_from_live / "aurora-live-20990101-roundtrip-smoke.json"
    write_json(live_record_path, base_live_record())
    scratch_preview_records = scratch_from_live / "dry-run-records"
    completed_preview = subprocess.run(
        [
            sys.executable,
            str(root / "tools" / "aurora_live_review_outcome_record.py"),
            "from-live-record",
            str(live_record_path),
            "--out",
            str(scratch_preview_records),
            "--id",
            "alro-fixture-from-live-record-preview",
            "--reviewer",
            "fixture-maintainer",
            "--outcome",
            "accept-for-proposal",
            "--reference-promotion-allowed",
            "--accepted-standard-checks",
            "--next-action",
            "Generate and review a reference promotion proposal.",
            "--dry-run",
        ],
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )
    if completed_preview.returncode != 0:
        result.error(f"review outcome from-live-record dry-run failed: {completed_preview.stdout.strip()}")
    else:
        try:
            preview_record = json.loads(completed_preview.stdout)
            preview_errors = tool.validate_record(preview_record)
        except Exception as exc:
            preview_record = {}
            preview_errors = [str(exc)]
        if scratch_preview_records.exists():
            result.error("review outcome from-live-record dry-run wrote a records directory")
        elif preview_errors:
            result.error("review outcome from-live-record dry-run printed invalid record: " + "; ".join(preview_errors))
        elif preview_record.get("accepted_atoms") != ["area.createWithWizard"]:
            result.error("review outcome from-live-record dry-run did not derive promotion-ready accepted atom")
        elif preview_record.get("checks_run") != tool.STANDARD_ACCEPTED_CHECKS:
            result.error("review outcome from-live-record dry-run did not derive standard check_run set")
        elif preview_record.get("checks_passed") != tool.STANDARD_ACCEPTED_CHECKS:
            result.error("review outcome from-live-record dry-run did not derive standard check_passed set")
        else:
            result.ok("review outcome from-live-record dry-run prints a valid standard accepted record without writing it")

    complete_minimum_live_record_path = scratch_from_live / "aurora-live-20990101-minimum-first-pass-complete.json"
    write_json(complete_minimum_live_record_path, base_minimum_first_pass_live_record(complete=True))
    completed_minimum_preview = subprocess.run(
        [
            sys.executable,
            str(root / "tools" / "aurora_live_review_outcome_record.py"),
            "from-live-record",
            str(complete_minimum_live_record_path),
            "--out",
            str(scratch_from_live / "complete-minimum-preview-records"),
            "--id",
            "alro-fixture-complete-minimum-first-pass-preview",
            "--reviewer",
            "fixture-maintainer",
            "--outcome",
            "accept-for-proposal",
            "--reference-promotion-allowed",
            "--accepted-standard-checks",
            "--dry-run",
        ],
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )
    if completed_minimum_preview.returncode != 0:
        result.error(
            f"review outcome complete minimum first pass accept dry-run failed: {completed_minimum_preview.stdout.strip()}"
        )
    else:
        try:
            minimum_preview_record = json.loads(completed_minimum_preview.stdout)
            minimum_preview_errors = tool.validate_record(minimum_preview_record)
        except Exception as exc:
            minimum_preview_record = {}
            minimum_preview_errors = [str(exc)]
        if minimum_preview_errors:
            result.error(
                "review outcome complete minimum first pass accept dry-run printed invalid record: "
                + "; ".join(minimum_preview_errors)
            )
        elif minimum_preview_record.get("accepted_atoms") != MINIMUM_FIRST_PASS_HELD_ATOMS:
            result.error("review outcome complete minimum first pass accept dry-run did not derive all minimum atoms")
        else:
            result.ok("review outcome complete minimum first pass accept dry-run derives all minimum atoms")

    incomplete_minimum_live_record_path = scratch_from_live / "aurora-live-20990101-minimum-first-pass-incomplete.json"
    write_json(incomplete_minimum_live_record_path, base_minimum_first_pass_live_record(complete=False))
    completed_incomplete_minimum_preview = subprocess.run(
        [
            sys.executable,
            str(root / "tools" / "aurora_live_review_outcome_record.py"),
            "from-live-record",
            str(incomplete_minimum_live_record_path),
            "--out",
            str(scratch_from_live / "incomplete-minimum-preview-records"),
            "--id",
            "alro-fixture-incomplete-minimum-first-pass-preview",
            "--reviewer",
            "fixture-maintainer",
            "--outcome",
            "accept-for-proposal",
            "--reference-promotion-allowed",
            "--accepted-standard-checks",
            "--dry-run",
        ],
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )
    if (
        completed_incomplete_minimum_preview.returncode != 1
        or "Minimum First Live Pass incomplete" not in completed_incomplete_minimum_preview.stdout
        or "toolset.buildAndClientRun" not in completed_incomplete_minimum_preview.stdout
    ):
        result.error("review outcome incomplete minimum first pass accept dry-run was not rejected")
    else:
        result.ok("review outcome incomplete minimum first pass accept dry-run is rejected before proposal fields")

    manual_records = scratch_from_live / "manual-review-records"
    complete_manual_record = base_record()
    complete_manual_record["id"] = "alro-fixture-manual-complete-minimum-first-pass"
    complete_manual_record["live_record_id"] = "aurora-live-20990101-minimum-first-pass"
    complete_manual_record["live_record_path"] = complete_minimum_live_record_path.relative_to(root).as_posix()
    complete_manual_record["accepted_atoms"] = MINIMUM_FIRST_PASS_HELD_ATOMS
    complete_manual_path = manual_records / "complete-minimum-first-pass.json"
    write_json(complete_manual_path, complete_manual_record)
    completed_manual_validate = subprocess.run(
        [
            sys.executable,
            str(root / "tools" / "aurora_live_review_outcome_record.py"),
            "validate",
            str(complete_manual_path),
            "--root",
            str(root),
        ],
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )
    if completed_manual_validate.returncode != 0:
        result.error(
            "manual complete minimum first pass accept record failed contextual validation: "
            + completed_manual_validate.stdout.strip()
        )
    else:
        result.ok("manual complete minimum first pass accept record passes contextual validation")

    incomplete_manual_record = base_record()
    incomplete_manual_record["id"] = "alro-fixture-manual-incomplete-minimum-first-pass"
    incomplete_manual_record["live_record_id"] = "aurora-live-20990101-minimum-first-pass"
    incomplete_manual_record["live_record_path"] = incomplete_minimum_live_record_path.relative_to(root).as_posix()
    incomplete_manual_record["accepted_atoms"] = ["area.createWithWizard"]
    incomplete_manual_path = manual_records / "incomplete-minimum-first-pass.json"
    write_json(incomplete_manual_path, incomplete_manual_record)
    completed_incomplete_manual_validate = subprocess.run(
        [
            sys.executable,
            str(root / "tools" / "aurora_live_review_outcome_record.py"),
            "validate",
            str(incomplete_manual_path),
            "--root",
            str(root),
        ],
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )
    if (
        completed_incomplete_manual_validate.returncode != 1
        or "Minimum First Live Pass incomplete" not in completed_incomplete_manual_validate.stdout
        or "toolset.buildAndClientRun" not in completed_incomplete_manual_validate.stdout
    ):
        result.error("manual incomplete minimum first pass accept record was not rejected by contextual validation")
    else:
        result.ok("manual incomplete minimum first pass accept record is rejected by contextual validation")

    completed_incomplete_manual_new = subprocess.run(
        [
            sys.executable,
            str(root / "tools" / "aurora_live_review_outcome_record.py"),
            "new",
            "--out",
            str(scratch_from_live / "manual-new-records"),
            "--id",
            "alro-fixture-new-incomplete-minimum-first-pass",
            "--live-record-id",
            "aurora-live-20990101-minimum-first-pass",
            "--live-record-path",
            incomplete_minimum_live_record_path.relative_to(root).as_posix(),
            "--evidence-manifest-path",
            "knowledge-inbox/aurora-live-evidence-manifests/aurora-live-evidence-manifest-20990101-minimum-first-pass.json",
            "--reviewer",
            "fixture-maintainer",
            "--outcome",
            "accept-for-proposal",
            "--decision-summary",
            "Synthetic incomplete minimum pass manual new attempt.",
            "--promotion-proposal-path",
            "knowledge-inbox/reference-promotion-proposals/aurora-live-20990101-minimum-first-pass.md",
            "--reference-promotion-allowed",
            "--accepted-atom",
            "area.createWithWizard",
            "--visual-redaction-record-id",
            "avr-fixture-visual-redaction",
            "--check-run",
            "check_aurora_live_records.py",
            "--check-passed",
            "check_aurora_live_records.py",
            "--root",
            str(root),
        ],
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )
    if (
        completed_incomplete_manual_new.returncode != 1
        or "Minimum First Live Pass incomplete" not in completed_incomplete_manual_new.stdout
    ):
        result.error("review outcome new command accepted an incomplete minimum first pass manual record")
    else:
        result.ok("review outcome new command rejects incomplete minimum first pass manual accept records")

    release_gate = load_module(root / "tools" / "check_release_gate.py", "release_gate_review_outcome_check")
    release_gate_errors = release_gate.aurora_review_outcome_errors(root, manual_records)
    if (
        not any("Minimum First Live Pass incomplete" in error for error in release_gate_errors)
        or not any("toolset.buildAndClientRun" in error for error in release_gate_errors)
    ):
        result.error("release gate did not reject incomplete minimum first pass review outcome records")
    else:
        result.ok("release gate rejects incomplete minimum first pass review outcome records via contextual validation")

    completed_bad_preset = subprocess.run(
        [
            sys.executable,
            str(root / "tools" / "aurora_live_review_outcome_record.py"),
            "from-live-record",
            str(live_record_path),
            "--out",
            str(scratch_from_live / "bad-preset-records"),
            "--id",
            "alro-fixture-bad-standard-preset",
            "--reviewer",
            "fixture-maintainer",
            "--outcome",
            "hold-for-retest",
            "--accepted-standard-checks",
            "--dry-run",
        ],
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )
    if completed_bad_preset.returncode != 1 or "--accepted-standard-checks is only valid" not in completed_bad_preset.stdout:
        result.error("review outcome from-live-record accepted-standard-checks preset was not rejected for hold-for-retest")
    else:
        result.ok("review outcome from-live-record accepted-standard-checks preset is rejected outside accept-for-proposal")

    hold_preview_command = [
        sys.executable,
        str(root / "tools" / "aurora_live_review_outcome_record.py"),
        "from-live-record",
        str(live_record_path),
        "--out",
        str(scratch_from_live / "hold-preview-records"),
        "--id",
        "alro-fixture-from-live-record-hold-preview",
        "--reviewer",
        "fixture-maintainer",
        "--outcome",
        "hold-for-retest",
    ]
    for atom in MINIMUM_FIRST_PASS_HELD_ATOMS:
        hold_preview_command.extend(["--held-atom", atom])
    hold_preview_command.extend(
        [
            "--blocked-atom",
            MINIMUM_FIRST_PASS_BLOCKER,
            "--next-action",
            MINIMUM_FIRST_PASS_NEXT_ACTION,
            "--dry-run",
        ]
    )
    completed_hold_preview = subprocess.run(
        hold_preview_command,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )
    if completed_hold_preview.returncode != 0:
        result.error(f"review outcome from-live-record hold dry-run failed: {completed_hold_preview.stdout.strip()}")
    else:
        try:
            hold_preview_record = json.loads(completed_hold_preview.stdout)
            hold_preview_errors = tool.validate_record(hold_preview_record)
        except Exception as exc:
            hold_preview_record = {}
            hold_preview_errors = [str(exc)]
        if hold_preview_errors:
            result.error("review outcome from-live-record hold dry-run printed invalid record: " + "; ".join(hold_preview_errors))
        elif hold_preview_record.get("accepted_atoms"):
            result.error("review outcome from-live-record hold dry-run inherited promotion-ready accepted atoms")
        elif hold_preview_record.get("promotion_proposal_path"):
            result.error("review outcome from-live-record hold dry-run set promotion_proposal_path")
        elif hold_preview_record.get("visual_redaction_record_ids"):
            result.error("review outcome from-live-record hold dry-run set visual_redaction_record_ids")
        elif hold_preview_record.get("reference_promotion_allowed") is not False:
            result.error("review outcome from-live-record hold dry-run allowed reference promotion")
        elif hold_preview_record.get("held_atoms") != MINIMUM_FIRST_PASS_HELD_ATOMS:
            result.error("review outcome from-live-record hold dry-run did not preserve minimum first pass held atoms")
        elif MINIMUM_FIRST_PASS_BLOCKER not in hold_preview_record.get("blocked_atoms", []):
            result.error("review outcome from-live-record hold dry-run did not preserve minimum first pass blocker")
        elif MINIMUM_FIRST_PASS_NEXT_ACTION not in hold_preview_record.get("next_actions", []):
            result.error("review outcome from-live-record hold dry-run did not preserve minimum first pass next action")
        else:
            result.ok(
                "review outcome from-live-record hold dry-run preserves minimum first pass boundary without accepted atoms or proposal fields"
            )

    completed_reject_preview = subprocess.run(
        [
            sys.executable,
            str(root / "tools" / "aurora_live_review_outcome_record.py"),
            "from-live-record",
            str(live_record_path),
            "--out",
            str(scratch_from_live / "reject-preview-records"),
            "--id",
            "alro-fixture-from-live-record-reject-preview",
            "--reviewer",
            "fixture-maintainer",
            "--outcome",
            "reject",
            "--rejected-atom",
            "area.createWithWizard",
            "--privacy-finding",
            "Synthetic raw/private evidence finding.",
            "--dry-run",
        ],
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )
    if completed_reject_preview.returncode != 0:
        result.error(f"review outcome from-live-record reject dry-run failed: {completed_reject_preview.stdout.strip()}")
    else:
        try:
            reject_preview_record = json.loads(completed_reject_preview.stdout)
            reject_preview_errors = tool.validate_record(reject_preview_record)
        except Exception as exc:
            reject_preview_record = {}
            reject_preview_errors = [str(exc)]
        if reject_preview_errors:
            result.error("review outcome from-live-record reject dry-run printed invalid record: " + "; ".join(reject_preview_errors))
        elif reject_preview_record.get("accepted_atoms"):
            result.error("review outcome from-live-record reject dry-run inherited promotion-ready accepted atoms")
        elif reject_preview_record.get("promotion_proposal_path"):
            result.error("review outcome from-live-record reject dry-run set promotion_proposal_path")
        elif reject_preview_record.get("visual_redaction_record_ids"):
            result.error("review outcome from-live-record reject dry-run set visual_redaction_record_ids")
        elif reject_preview_record.get("reference_promotion_allowed") is not False:
            result.error("review outcome from-live-record reject dry-run allowed reference promotion")
        else:
            result.ok("review outcome from-live-record reject dry-run does not inherit accepted atoms or proposal fields")

    completed_from_live = subprocess.run(
        [
            sys.executable,
            str(root / "tools" / "aurora_live_review_outcome_record.py"),
            "from-live-record",
            str(live_record_path),
            "--out",
            str(scratch_from_live / "records"),
            "--id",
            "alro-fixture-from-live-record",
            "--reviewer",
            "fixture-maintainer",
            "--outcome",
            "accept-for-proposal",
            "--reference-promotion-allowed",
            "--accepted-standard-checks",
            "--next-action",
            "Generate and review a reference promotion proposal.",
        ],
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )
    from_live_record_path = scratch_from_live / "records" / "alro-fixture-from-live-record.json"
    if completed_from_live.returncode != 0:
        result.error(f"review outcome from-live-record command failed: {completed_from_live.stdout.strip()}")
    elif not from_live_record_path.exists():
        result.error("review outcome from-live-record command did not write expected record")
    else:
        from_live_record = load_json(from_live_record_path)
        from_live_errors = tool.validate_record(from_live_record)
        if from_live_errors:
            result.error("review outcome from-live-record command wrote invalid record: " + "; ".join(from_live_errors))
        elif from_live_record.get("accepted_atoms") != ["area.createWithWizard"]:
            result.error("review outcome from-live-record command did not derive promotion-ready accepted atom")
        elif from_live_record.get("visual_redaction_record_ids") != ["avr-20990101-roundtrip-smoke"]:
            result.error("review outcome from-live-record command did not derive default visual redaction record id")
        elif from_live_record.get("checks_run") != tool.STANDARD_ACCEPTED_CHECKS:
            result.error("review outcome from-live-record command did not derive standard check_run set")
        elif from_live_record.get("checks_passed") != tool.STANDARD_ACCEPTED_CHECKS:
            result.error("review outcome from-live-record command did not derive standard check_passed set")
        else:
            result.ok("review outcome from-live-record command derives accepted atom, standard checks, and writes a valid record")

    scratch_records = root / SCRATCH / "records"
    write_json(scratch_records / "accepted.json", accepted)
    write_json(scratch_records / "hold.json", hold)
    write_json(scratch_records / "reject.json", reject)
    scratch_aggregate = root / SCRATCH / "aggregate.md"
    completed = subprocess.run(
        [
            sys.executable,
            str(root / "tools" / "aurora_live_review_outcome_record.py"),
            "aggregate",
            str(scratch_records),
            "--out",
            str(scratch_aggregate),
        ],
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )
    if completed.returncode != 0:
        result.error(f"review outcome aggregate command failed: {completed.stdout.strip()}")
    elif not scratch_aggregate.exists():
        result.error("review outcome aggregate command did not write output")
    else:
        text = scratch_aggregate.read_text(encoding="utf-8")
        required_tokens = {
            "Aurora Live Review Outcome Records Aggregate",
            "`accept-for-proposal`: 1",
            "`hold-for-retest`: 1",
            "`reject`: 1",
            "accepted atoms: `1`",
            f"held atoms: `{len(MINIMUM_FIRST_PASS_HELD_ATOMS)}`",
            "rejected atoms: `1`",
            "blocked atoms: `1`",
            "privacy findings: `1`",
            "next actions: `1`",
            MINIMUM_FIRST_PASS_BLOCKER,
            MINIMUM_FIRST_PASS_NEXT_ACTION,
            "maintainer process only",
            "fresh Codex answer improvement",
        }
        missing = sorted(token for token in required_tokens if token not in text)
        if missing:
            result.error(f"review outcome aggregate missing tokens: {', '.join(missing)}")
        else:
            result.ok("review outcome aggregate includes counts and trust boundaries")

    aggregate = root / AGGREGATE
    if aggregate.exists() and "Aurora Live Review Outcome Records Aggregate" in aggregate.read_text(encoding="utf-8"):
        result.ok(f"{AGGREGATE} exists and has expected heading")
    else:
        result.error(f"{AGGREGATE} is missing or has wrong heading")

    records_dir = root / RECORD_DIR
    if records_dir.exists():
        existing = sorted(records_dir.glob("*.json"))
        for path in existing:
            try:
                errors = tool.validate_record_with_live_context(load_json(path), root)
            except Exception as exc:
                errors = [str(exc)]
            if errors:
                result.error(f"{path.relative_to(root)} is invalid: {'; '.join(errors)}")
        result.ok(f"existing review outcome records checked: {len(existing)}")
    else:
        result.ok("no review outcome records directory yet; no real review outcomes recorded")

    manifest = load_json(root / "version-manifest.json")
    for key, expected in {
        "aurora_live_review_outcome_record_tool": "tools/aurora_live_review_outcome_record.py",
        "aurora_live_review_outcome_record_schema": SCHEMA.as_posix(),
        "aurora_live_review_outcome_record_template": TEMPLATE.as_posix(),
        "aurora_live_review_outcome_record_aggregate": AGGREGATE.as_posix(),
        "aurora_live_review_outcome_record_check": "tools/check_aurora_live_review_outcome_records.py",
    }.items():
        value = manifest.get(key)
        if value != expected:
            result.error(f"version manifest {key} must point at {expected}")
        elif not (root / expected).exists():
            result.error(f"manifest artifact does not exist for {key}: {expected}")
        else:
            result.ok(f"version manifest points at {key}")

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
            print(f"Aurora live review outcome record check failed: {len(result.errors)} error(s)")
        else:
            print("Aurora live review outcome record check passed")
    return 1 if result.errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
