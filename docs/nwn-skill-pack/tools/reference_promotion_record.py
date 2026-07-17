#!/usr/bin/env python3
"""Validate and aggregate reference promotion decision records."""

from __future__ import annotations

import argparse
import json
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ALLOWED_RESULTS = {"accepted", "accepted-with-follow-up", "held", "rejected"}
ALLOWED_SEMVER = {"PATCH", "MINOR", "MAJOR", "NONE"}
ALLOWED_EVIDENCE_LABELS = {
    "docs-verified",
    "runtime-tested",
    "project-specific",
    "unverified",
}
ACCEPTED_RESULTS = {"accepted", "accepted-with-follow-up"}
AUTHOR_REF_PREFIX = "draft-skills/nwn-server-gamedev/references/"
PLUGIN_REF_PREFIX = "draft-plugins/nwn-server-gamedev-pack/skills/nwn-server-gamedev/references/"
REQUIRED_FIELDS = [
    "schema_version",
    "id",
    "created_at",
    "feedback_record_id",
    "proposal_path",
    "result",
    "maintainer",
    "target_references",
    "evidence_label",
    "semver",
    "verification",
    "release_updates",
    "follow_up_actions",
    "non_proof_boundaries",
    "notes",
]
LIST_FIELDS = ["target_references", "follow_up_actions", "non_proof_boundaries"]
REQUIRED_VERIFICATION_FIELDS = [
    "proposal_reviewed",
    "references_patched",
    "authoring_and_plugin_synced",
    "privacy_checked",
    "checks_run",
    "checks_passed",
]
REQUIRED_RELEASE_UPDATE_FIELDS = [
    "version_manifest_updated",
    "plugin_manifest_updated",
    "release_handoff_updated",
    "source_of_truth_updated",
    "promoted_record_path",
]


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def load_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, dict):
        raise ValueError(f"{path} must contain a JSON object")
    return data


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

    for field in ["id", "created_at", "feedback_record_id", "proposal_path", "maintainer"]:
        if field in data and not str(data.get(field, "")).strip():
            errors.append(f"{field} must be a non-empty string")

    result = data.get("result")
    if result not in ALLOWED_RESULTS:
        errors.append(f"result must be one of: {', '.join(sorted(ALLOWED_RESULTS))}")

    semver = data.get("semver")
    if semver not in ALLOWED_SEMVER:
        errors.append(f"semver must be one of: {', '.join(sorted(ALLOWED_SEMVER))}")

    evidence_label = data.get("evidence_label")
    if evidence_label not in ALLOWED_EVIDENCE_LABELS:
        errors.append(
            f"evidence_label must be one of: {', '.join(sorted(ALLOWED_EVIDENCE_LABELS))}"
        )

    for field in LIST_FIELDS:
        validate_string_list(data, field, errors)

    verification = data.get("verification")
    if not isinstance(verification, dict):
        errors.append("verification must be an object")
        verification = {}
    for field in REQUIRED_VERIFICATION_FIELDS:
        if field not in verification:
            errors.append(f"verification.{field} is required")
    for field in [
        "proposal_reviewed",
        "references_patched",
        "authoring_and_plugin_synced",
        "privacy_checked",
    ]:
        if field in verification and not isinstance(verification[field], bool):
            errors.append(f"verification.{field} must be boolean")
    for field in ["checks_run", "checks_passed"]:
        value = verification.get(field, [])
        if not isinstance(value, list):
            errors.append(f"verification.{field} must be a list")
        elif not all(isinstance(item, str) for item in value):
            errors.append(f"verification.{field} must contain only strings")

    release_updates = data.get("release_updates")
    if not isinstance(release_updates, dict):
        errors.append("release_updates must be an object")
        release_updates = {}
    for field in REQUIRED_RELEASE_UPDATE_FIELDS:
        if field not in release_updates:
            errors.append(f"release_updates.{field} is required")
    for field in [
        "version_manifest_updated",
        "plugin_manifest_updated",
        "release_handoff_updated",
        "source_of_truth_updated",
    ]:
        if field in release_updates and not isinstance(release_updates[field], bool):
            errors.append(f"release_updates.{field} must be boolean")

    target_references = data.get("target_references", [])
    if not isinstance(target_references, list):
        target_references = []
    checks_run = verification.get("checks_run", [])
    checks_passed = verification.get("checks_passed", [])
    if not isinstance(checks_run, list):
        checks_run = []
    if not isinstance(checks_passed, list):
        checks_passed = []

    if result in ACCEPTED_RESULTS:
        if semver == "NONE":
            errors.append("accepted promotion records require semver PATCH, MINOR, or MAJOR")
        if evidence_label == "unverified":
            errors.append("accepted promotion records cannot use evidence_label=unverified")
        if not any(str(path).startswith(AUTHOR_REF_PREFIX) for path in target_references):
            errors.append("accepted promotion records require an authoring reference target")
        if not any(str(path).startswith(PLUGIN_REF_PREFIX) for path in target_references):
            errors.append("accepted promotion records require a plugin-packaged reference target")
        for field in [
            "proposal_reviewed",
            "references_patched",
            "authoring_and_plugin_synced",
            "privacy_checked",
        ]:
            if verification.get(field) is not True:
                errors.append(f"accepted promotion records require verification.{field}=true")
        if not checks_run:
            errors.append("accepted promotion records require verification.checks_run")
        if not checks_passed:
            errors.append("accepted promotion records require verification.checks_passed")
        if set(str(item) for item in checks_run) - set(str(item) for item in checks_passed):
            errors.append("accepted promotion records require every check in checks_run to appear in checks_passed")
        for field in [
            "version_manifest_updated",
            "plugin_manifest_updated",
            "source_of_truth_updated",
        ]:
            if release_updates.get(field) is not True:
                errors.append(f"accepted promotion records require release_updates.{field}=true")
        if not str(release_updates.get("promoted_record_path", "")).strip():
            errors.append("accepted promotion records require release_updates.promoted_record_path")
        if not data.get("non_proof_boundaries"):
            errors.append("accepted promotion records require non_proof_boundaries")
        if result == "accepted-with-follow-up" and not data.get("follow_up_actions"):
            errors.append("accepted-with-follow-up records require follow_up_actions")

    if result in {"held", "rejected"}:
        if semver != "NONE":
            errors.append("held or rejected promotion records require semver=NONE")
        if verification.get("references_patched") is True:
            errors.append("held or rejected promotion records must not mark references_patched=true")

    return errors


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
        print("no reference promotion records found")
    for path in paths:
        try:
            data = load_json(path)
            errors = validate_record(data)
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

    result_counts = Counter(str(record.get("result", "unknown")) for record in records)
    semver_counts = Counter(str(record.get("semver", "unknown")) for record in records)

    lines = [
        "# Reference Promotion Records Aggregate",
        "",
        f"Generated: {now_iso()}",
        f"Input: `{input_dir}`",
        f"Records: {len(records)}",
        f"Invalid records: {len(invalid)}",
        "",
        "## Result Counts",
        "",
    ]
    if result_counts:
        for result in sorted(result_counts):
            lines.append(f"- `{result}`: {result_counts[result]}")
    else:
        lines.append("- none")
    lines.extend(["", "## SemVer Counts", ""])
    if semver_counts:
        for semver in sorted(semver_counts):
            lines.append(f"- `{semver}`: {semver_counts[semver]}")
    else:
        lines.append("- none")
    lines.extend(["", "## Records", ""])
    if records:
        for record in records:
            lines.append(f"- `{record.get('result')}` **{record.get('id')}**")
            lines.append(f"  - feedback: `{record.get('feedback_record_id')}`")
            lines.append(f"  - proposal: `{record.get('proposal_path')}`")
            lines.append(f"  - evidence label: `{record.get('evidence_label')}`")
            lines.append(f"  - semver: `{record.get('semver')}`")
            lines.append(f"  - file: `{record.get('_path')}`")
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
        "Reference promotion records prove maintainer process only. They do not prove the underlying NWN claim, fresh Codex answer quality, plugin installation, public marketplace behavior, or NWN runtime behavior.",
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

    validate_parser = subparsers.add_parser("validate", help="validate reference promotion records")
    validate_parser.add_argument("paths", nargs="+")
    validate_parser.set_defaults(func=command_validate)

    aggregate_parser = subparsers.add_parser("aggregate", help="write a markdown aggregate")
    aggregate_parser.add_argument("input")
    aggregate_parser.add_argument("--out", default="docs/nwn-skill-pack/knowledge-inbox/reference-promotions/aggregate.md")
    aggregate_parser.add_argument("--include-invalid", action="store_true")
    aggregate_parser.set_defaults(func=command_aggregate)

    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
