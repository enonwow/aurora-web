#!/usr/bin/env python3
"""Create, validate, and aggregate Aurora live retest result records."""

from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ALLOWED_RESULTS = {"pass", "partial", "fail", "blocked", "not-run"}
SHA256_RE = re.compile(r"^[a-f0-9]{64}$")
REQUIRED_FIELDS = [
    "schema_version",
    "id",
    "created_at",
    "source_dispatch_path",
    "dispatch_manifest_path",
    "source_review_outcome_id",
    "source_review_outcome_path",
    "live_record_id",
    "live_record_path",
    "evidence_manifest_path",
    "target_atom",
    "requested_next_action",
    "operator",
    "result",
    "decision_summary",
    "passed_atoms",
    "partial_atoms",
    "failed_atoms",
    "blocked_atoms",
    "returned_artifacts",
    "artifact_hashes",
    "checks_run",
    "checks_passed",
    "privacy_confirmation",
    "privacy_findings",
    "maintainer_verification",
    "next_actions",
    "non_proof_boundaries",
    "notes",
]
LIST_FIELDS = [
    "passed_atoms",
    "partial_atoms",
    "failed_atoms",
    "blocked_atoms",
    "returned_artifacts",
    "checks_run",
    "checks_passed",
    "privacy_findings",
    "next_actions",
    "non_proof_boundaries",
]
REQUIRED_OPERATOR_FIELDS = [
    "handle",
    "toolset_version",
    "nwn_ee_version",
    "environment_summary",
]
REQUIRED_PRIVACY_FIELDS = ["no_private_data", "quarantine_required", "summary"]
REQUIRED_VERIFICATION_FIELDS = [
    "dispatch_check",
    "result_template_check",
    "records_check",
    "evidence_manifest_check",
    "intake_consistency_check",
    "redaction_policy_check",
    "visual_redaction_check",
    "notes",
]


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def slugify(value: str) -> str:
    value = value.lower().strip()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    value = re.sub(r"-{2,}", "-", value).strip("-")
    return value[:64] or "retest-result"


def load_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, dict):
        raise ValueError(f"{path} must contain a JSON object")
    return data


def parse_artifact_hash(values: list[str]) -> list[dict[str, str]]:
    parsed: list[dict[str, str]] = []
    for value in values:
        if "=" not in value:
            raise ValueError("--artifact-hash entries must use path=sha256")
        path, digest = value.split("=", 1)
        parsed.append({"path": path.strip(), "sha256": digest.strip()})
    return parsed


def validate_string_list(data: dict[str, Any], field: str, errors: list[str]) -> None:
    value = data.get(field, [])
    if not isinstance(value, list):
        errors.append(f"{field} must be a list")
    elif not all(isinstance(item, str) for item in value):
        errors.append(f"{field} must contain only strings")


def validate_record(data: dict[str, Any]) -> list[str]:
    errors: list[str] = []

    for field in REQUIRED_FIELDS:
        if field not in data:
            errors.append(f"missing required field: {field}")

    if data.get("schema_version") != "1":
        errors.append("schema_version must be '1'")

    for field in [
        "id",
        "source_dispatch_path",
        "source_review_outcome_id",
        "source_review_outcome_path",
        "live_record_id",
        "live_record_path",
        "target_atom",
    ]:
        if field in data and not str(data.get(field, "")).strip():
            errors.append(f"{field} must be a non-empty string")

    if data.get("result") not in ALLOWED_RESULTS:
        errors.append(f"result must be one of: {', '.join(sorted(ALLOWED_RESULTS))}")

    for field in LIST_FIELDS:
        validate_string_list(data, field, errors)

    artifact_hashes = data.get("artifact_hashes", [])
    if not isinstance(artifact_hashes, list):
        errors.append("artifact_hashes must be a list")
    else:
        for index, item in enumerate(artifact_hashes):
            if not isinstance(item, dict):
                errors.append(f"artifact_hashes[{index}] must be an object")
                continue
            if not str(item.get("path", "")).strip():
                errors.append(f"artifact_hashes[{index}].path must be a non-empty string")
            digest = str(item.get("sha256", ""))
            if not SHA256_RE.match(digest):
                errors.append(f"artifact_hashes[{index}].sha256 must be a lowercase SHA-256 hex digest")

    operator = data.get("operator")
    if not isinstance(operator, dict):
        errors.append("operator must be an object")
    else:
        for field in REQUIRED_OPERATOR_FIELDS:
            if field not in operator:
                errors.append(f"operator.{field} is required")
            elif not isinstance(operator[field], str):
                errors.append(f"operator.{field} must be a string")

    privacy = data.get("privacy_confirmation")
    if not isinstance(privacy, dict):
        errors.append("privacy_confirmation must be an object")
    else:
        for field in REQUIRED_PRIVACY_FIELDS:
            if field not in privacy:
                errors.append(f"privacy_confirmation.{field} is required")
        for field in ["no_private_data", "quarantine_required"]:
            if field in privacy and not isinstance(privacy[field], bool):
                errors.append(f"privacy_confirmation.{field} must be boolean")

    verification = data.get("maintainer_verification")
    if not isinstance(verification, dict):
        errors.append("maintainer_verification must be an object")
    else:
        for field in REQUIRED_VERIFICATION_FIELDS:
            if field not in verification:
                errors.append(f"maintainer_verification.{field} is required")
        for field in REQUIRED_VERIFICATION_FIELDS:
            if field == "notes":
                if field in verification and not isinstance(verification[field], str):
                    errors.append("maintainer_verification.notes must be a string")
            elif field in verification and not isinstance(verification[field], bool):
                errors.append(f"maintainer_verification.{field} must be boolean")

    result = data.get("result")
    passed_atoms = data.get("passed_atoms", []) if isinstance(data.get("passed_atoms", []), list) else []
    partial_atoms = data.get("partial_atoms", []) if isinstance(data.get("partial_atoms", []), list) else []
    failed_atoms = data.get("failed_atoms", []) if isinstance(data.get("failed_atoms", []), list) else []
    blocked_atoms = data.get("blocked_atoms", []) if isinstance(data.get("blocked_atoms", []), list) else []
    returned_artifacts = data.get("returned_artifacts", []) if isinstance(data.get("returned_artifacts", []), list) else []
    privacy_findings = data.get("privacy_findings", []) if isinstance(data.get("privacy_findings", []), list) else []
    next_actions = data.get("next_actions", []) if isinstance(data.get("next_actions", []), list) else []
    checks_run = data.get("checks_run", []) if isinstance(data.get("checks_run", []), list) else []
    checks_passed = data.get("checks_passed", []) if isinstance(data.get("checks_passed", []), list) else []
    target_atom = str(data.get("target_atom", "")).strip()
    no_private_data = isinstance(privacy, dict) and privacy.get("no_private_data") is True
    quarantine_required = isinstance(privacy, dict) and privacy.get("quarantine_required") is True

    if result == "pass":
        if target_atom not in passed_atoms:
            errors.append("pass results require target_atom in passed_atoms")
        if not returned_artifacts:
            errors.append("pass results require returned_artifacts")
        if not no_private_data or quarantine_required or privacy_findings:
            errors.append("pass results require no private data, no quarantine, and no privacy findings")
        if isinstance(verification, dict):
            for field in [
                "dispatch_check",
                "result_template_check",
                "records_check",
                "evidence_manifest_check",
                "intake_consistency_check",
                "redaction_policy_check",
                "visual_redaction_check",
            ]:
                if verification.get(field) is not True:
                    errors.append(f"pass results require maintainer_verification.{field}=true")
        if set(str(item) for item in checks_run) - set(str(item) for item in checks_passed):
            errors.append("pass results require every check in checks_run to appear in checks_passed")
        if not data.get("non_proof_boundaries"):
            errors.append("pass results require non_proof_boundaries")

    if result == "partial":
        if target_atom not in partial_atoms:
            errors.append("partial results require target_atom in partial_atoms")
        if not (returned_artifacts or blocked_atoms or next_actions):
            errors.append("partial results require returned_artifacts, blocked_atoms, or next_actions")
        if not next_actions:
            errors.append("partial results require next_actions")

    if result == "fail":
        if target_atom not in failed_atoms:
            errors.append("fail results require target_atom in failed_atoms")
        if not (privacy_findings or str(data.get("decision_summary", "")).strip()):
            errors.append("fail results require privacy_findings or decision_summary")
        if not next_actions:
            errors.append("fail results require next_actions")

    if result == "blocked":
        if target_atom not in blocked_atoms:
            errors.append("blocked results require target_atom in blocked_atoms")
        if not next_actions:
            errors.append("blocked results require next_actions")

    if result == "not-run":
        if passed_atoms or partial_atoms or failed_atoms or blocked_atoms:
            errors.append("not-run results require empty atom result lists")

    return errors


def command_new(args: argparse.Namespace) -> int:
    output_dir = Path(args.out)
    output_dir.mkdir(parents=True, exist_ok=True)
    record_id = args.id or f"alrr-{slugify(args.live_record_id)}-{slugify(args.target_atom)}"
    try:
        artifact_hashes = parse_artifact_hash(args.artifact_hash)
    except ValueError as exc:
        print(f"[ERROR] {exc}", file=sys.stderr)
        return 1

    record = {
        "schema_version": "1",
        "id": record_id,
        "created_at": now_iso(),
        "source_dispatch_path": args.source_dispatch_path,
        "dispatch_manifest_path": args.dispatch_manifest_path,
        "source_review_outcome_id": args.source_review_outcome_id,
        "source_review_outcome_path": args.source_review_outcome_path,
        "live_record_id": args.live_record_id,
        "live_record_path": args.live_record_path,
        "evidence_manifest_path": args.evidence_manifest_path,
        "target_atom": args.target_atom,
        "requested_next_action": args.requested_next_action,
        "operator": {
            "handle": args.operator,
            "toolset_version": args.toolset_version,
            "nwn_ee_version": args.nwn_ee_version,
            "environment_summary": args.environment_summary,
        },
        "result": args.result,
        "decision_summary": args.decision_summary,
        "passed_atoms": args.passed_atom,
        "partial_atoms": args.partial_atom,
        "failed_atoms": args.failed_atom,
        "blocked_atoms": args.blocked_atom,
        "returned_artifacts": args.returned_artifact,
        "artifact_hashes": artifact_hashes,
        "checks_run": args.check_run,
        "checks_passed": args.check_passed,
        "privacy_confirmation": {
            "no_private_data": args.no_private_data,
            "quarantine_required": args.quarantine_required,
            "summary": args.privacy_summary,
        },
        "privacy_findings": args.privacy_finding,
        "maintainer_verification": {
            "dispatch_check": args.dispatch_check,
            "result_template_check": args.result_template_check,
            "records_check": args.records_check,
            "evidence_manifest_check": args.evidence_manifest_check,
            "intake_consistency_check": args.intake_consistency_check,
            "redaction_policy_check": args.redaction_policy_check,
            "visual_redaction_check": args.visual_redaction_check,
            "notes": args.verification_notes,
        },
        "next_actions": args.next_action,
        "non_proof_boundaries": args.non_proof_boundary or [
            "Retest result records prove maintainer intake process only.",
            "They do not prove screenshot truth, log truth, NWN runtime behavior, redaction completeness, release readiness, or automatic skill improvement.",
        ],
        "notes": args.notes,
    }
    errors = validate_record(record)
    if errors:
        for error in errors:
            print(f"[ERROR] {error}", file=sys.stderr)
        return 1
    path = output_dir / f"{record_id}.json"
    path.write_text(json.dumps(record, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(path)
    return 0


def iter_record_paths(paths: list[str]) -> list[Path]:
    resolved: list[Path] = []
    for raw_path in paths:
        path = Path(raw_path)
        if path.is_dir():
            resolved.extend(sorted(path.glob("*.json")))
        else:
            resolved.append(path)
    return resolved


def command_validate(args: argparse.Namespace) -> int:
    paths = iter_record_paths(args.paths)
    ok = True
    if not paths:
        print("no Aurora live retest result records found")
    for path in paths:
        try:
            errors = validate_record(load_json(path))
        except Exception as exc:
            errors = [str(exc)]
        if errors:
            ok = False
            print(f"{path}: INVALID")
            for error in errors:
                print(f"  - {error}")
        else:
            print(f"{path}: OK")
    return 0 if ok else 1


def command_aggregate(args: argparse.Namespace) -> int:
    input_dir = Path(args.input)
    records: list[dict[str, Any]] = []
    invalid: list[tuple[Path, list[str]]] = []
    for path in sorted(input_dir.glob("*.json")):
        try:
            data = load_json(path)
            errors = validate_record(data)
        except Exception as exc:
            data = {}
            errors = [str(exc)]
        if errors:
            invalid.append((path, errors))
            if not args.include_invalid:
                continue
        data["_path"] = str(path)
        records.append(data)

    counts = Counter(str(record.get("result", "unknown")) for record in records)
    lines = [
        "# Aurora Live Retest Result Records Aggregate",
        "",
        f"Generated: {now_iso()}",
        f"Input: `{input_dir}`",
        f"Records: {len(records)}",
        f"Invalid records: {len(invalid)}",
        "",
        "## Result Counts",
        "",
    ]
    for result in sorted(ALLOWED_RESULTS):
        lines.append(f"- `{result}`: {counts[result]}")
    lines.extend(["", "## Records", ""])
    if records:
        for record in records:
            lines.append(f"- `{record.get('result')}` **{record.get('id')}**")
            lines.append(f"  - source review outcome: `{record.get('source_review_outcome_id')}`")
            lines.append(f"  - live record: `{record.get('live_record_id')}`")
            lines.append(f"  - target atom: `{record.get('target_atom')}`")
            lines.append(f"  - returned artifacts: `{len(record.get('returned_artifacts', []))}`")
            lines.append(f"  - privacy findings: `{len(record.get('privacy_findings', []))}`")
            lines.append(f"  - file: `{record.get('_path')}`")
            next_actions = record.get("next_actions", [])
            if isinstance(next_actions, list):
                for action in next_actions[:3]:
                    lines.append(f"  - next action: {action}")
            lines.append("")
    else:
        lines.append("- none")
        lines.append("")
    lines.extend(["## Invalid Records", ""])
    if invalid:
        for path, errors in invalid:
            lines.append(f"- `{path}`")
            for error in errors:
                lines.append(f"  - {error}")
    else:
        lines.append("- none")
    lines.extend([
        "",
        "## Interpretation",
        "",
        "Aurora live retest result records prove maintainer intake process only. They do not prove screenshot truth, log truth, NWN runtime behavior, privacy safety, release readiness, or automatic skill improvement.",
        "",
    ])

    output = Path(args.out)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text("\n".join(lines), encoding="utf-8")
    print(output)
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="command", required=True)

    new_parser = subparsers.add_parser("new", help="create an Aurora live retest result record")
    new_parser.add_argument("--out", default="docs/nwn-skill-pack/knowledge-inbox/aurora-live-retest-results/records")
    new_parser.add_argument("--id", default="")
    new_parser.add_argument("--source-dispatch-path", default="knowledge-inbox/aurora-live-retest-dispatch.md")
    new_parser.add_argument("--dispatch-manifest-path", default="")
    new_parser.add_argument("--source-review-outcome-id", required=True)
    new_parser.add_argument("--source-review-outcome-path", required=True)
    new_parser.add_argument("--live-record-id", required=True)
    new_parser.add_argument("--live-record-path", required=True)
    new_parser.add_argument("--evidence-manifest-path", default="")
    new_parser.add_argument("--target-atom", required=True)
    new_parser.add_argument("--requested-next-action", default="")
    new_parser.add_argument("--operator", default="")
    new_parser.add_argument("--toolset-version", default="")
    new_parser.add_argument("--nwn-ee-version", default="")
    new_parser.add_argument("--environment-summary", default="")
    new_parser.add_argument("--result", required=True, choices=sorted(ALLOWED_RESULTS))
    new_parser.add_argument("--decision-summary", default="")
    new_parser.add_argument("--passed-atom", action="append", default=[])
    new_parser.add_argument("--partial-atom", action="append", default=[])
    new_parser.add_argument("--failed-atom", action="append", default=[])
    new_parser.add_argument("--blocked-atom", action="append", default=[])
    new_parser.add_argument("--returned-artifact", action="append", default=[])
    new_parser.add_argument("--artifact-hash", action="append", default=[])
    new_parser.add_argument("--check-run", action="append", default=[])
    new_parser.add_argument("--check-passed", action="append", default=[])
    new_parser.add_argument("--no-private-data", action="store_true")
    new_parser.add_argument("--quarantine-required", action="store_true")
    new_parser.add_argument("--privacy-summary", default="")
    new_parser.add_argument("--privacy-finding", action="append", default=[])
    new_parser.add_argument("--dispatch-check", action="store_true")
    new_parser.add_argument("--result-template-check", action="store_true")
    new_parser.add_argument("--records-check", action="store_true")
    new_parser.add_argument("--evidence-manifest-check", action="store_true")
    new_parser.add_argument("--intake-consistency-check", action="store_true")
    new_parser.add_argument("--redaction-policy-check", action="store_true")
    new_parser.add_argument("--visual-redaction-check", action="store_true")
    new_parser.add_argument("--verification-notes", default="")
    new_parser.add_argument("--next-action", action="append", default=[])
    new_parser.add_argument("--non-proof-boundary", action="append", default=[])
    new_parser.add_argument("--notes", default="")
    new_parser.set_defaults(func=command_new)

    validate_parser = subparsers.add_parser("validate", help="validate Aurora live retest result records")
    validate_parser.add_argument("paths", nargs="+")
    validate_parser.set_defaults(func=command_validate)

    aggregate_parser = subparsers.add_parser("aggregate", help="write a markdown aggregate")
    aggregate_parser.add_argument("input")
    aggregate_parser.add_argument("--out", default="docs/nwn-skill-pack/knowledge-inbox/aurora-live-retest-results/aggregate.md")
    aggregate_parser.add_argument("--include-invalid", action="store_true")
    aggregate_parser.set_defaults(func=command_aggregate)

    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
