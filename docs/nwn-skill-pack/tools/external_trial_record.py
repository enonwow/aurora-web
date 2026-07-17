#!/usr/bin/env python3
"""Create, validate, and aggregate external contributor trial records."""

from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ALLOWED_RESULTS = {"pass", "partial", "fail", "not-run"}
ALLOWED_PATHS = {"command", "form", "mixed", "not-run"}
TRIAL_ID_RE = re.compile(r"^EXT-[0-9]{3}$")
REQUIRED_FIELDS = [
    "schema_version",
    "id",
    "created_at",
    "trial_id",
    "title",
    "result",
    "packet_path",
    "result_template_path",
    "tester_role",
    "tester_environment",
    "path_used",
    "public_inputs",
    "returned_artifacts",
    "command_transcript",
    "friction",
    "privacy_confirmation",
    "maintainer_verification",
    "issues",
    "improvement_action",
]
LIST_FIELDS = [
    "public_inputs",
    "returned_artifacts",
    "command_transcript",
    "friction",
    "issues",
    "feedback_record_ids",
]
REQUIRED_PRIVACY_FIELDS = ["no_private_data", "quarantine_required", "summary"]
REQUIRED_VERIFICATION_FIELDS = [
    "packet_check",
    "result_template_check",
    "cleanroom_check",
    "independent_tester",
    "verify_bundle",
    "validate_records",
    "notes",
]
REQUIRED_IMPROVEMENT_FIELDS = ["needed", "summary"]


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def slugify(value: str) -> str:
    value = value.lower().strip()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    value = re.sub(r"-{2,}", "-", value).strip("-")
    return value[:64] or "external-trial"


def load_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, dict):
        raise ValueError(f"{path} must contain a JSON object")
    return data


def validate_record(data: dict[str, Any]) -> list[str]:
    errors: list[str] = []

    for field in REQUIRED_FIELDS:
        if field not in data:
            errors.append(f"missing required field: {field}")

    if data.get("schema_version") != "1":
        errors.append("schema_version must be '1'")

    trial_id = data.get("trial_id")
    if not isinstance(trial_id, str) or not TRIAL_ID_RE.match(trial_id):
        errors.append("trial_id must match EXT-000 format")

    if data.get("result") not in ALLOWED_RESULTS:
        errors.append(f"result must be one of: {', '.join(sorted(ALLOWED_RESULTS))}")

    if data.get("path_used") not in ALLOWED_PATHS:
        errors.append(f"path_used must be one of: {', '.join(sorted(ALLOWED_PATHS))}")

    for list_field in LIST_FIELDS:
        value = data.get(list_field, [])
        if not isinstance(value, list):
            errors.append(f"{list_field} must be a list")
        elif not all(isinstance(item, str) for item in value):
            errors.append(f"{list_field} must contain only strings")

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
        for field in [
            "packet_check",
            "result_template_check",
            "cleanroom_check",
            "independent_tester",
            "verify_bundle",
            "validate_records",
        ]:
            if field in verification and not isinstance(verification[field], bool):
                errors.append(f"maintainer_verification.{field} must be boolean")

    improvement = data.get("improvement_action")
    if not isinstance(improvement, dict):
        errors.append("improvement_action must be an object")
    else:
        for field in REQUIRED_IMPROVEMENT_FIELDS:
            if field not in improvement:
                errors.append(f"improvement_action.{field} is required")
        if "needed" in improvement and not isinstance(improvement["needed"], bool):
            errors.append("improvement_action.needed must be boolean")

    result = data.get("result")
    no_private_data = isinstance(privacy, dict) and privacy.get("no_private_data") is True
    quarantined = isinstance(privacy, dict) and privacy.get("quarantine_required") is True
    packet_checked = isinstance(verification, dict) and verification.get("packet_check") is True
    template_checked = isinstance(verification, dict) and verification.get("result_template_check") is True
    cleanroom_checked = isinstance(verification, dict) and verification.get("cleanroom_check") is True
    independent_tester = isinstance(verification, dict) and verification.get("independent_tester") is True
    bundle_verified = isinstance(verification, dict) and verification.get("verify_bundle") is True
    records_validated = isinstance(verification, dict) and verification.get("validate_records") is True

    if result == "pass":
        if data.get("path_used") != "command":
            errors.append("pass results require path_used=command")
        if not no_private_data or quarantined:
            errors.append("pass results require no private data and no quarantine")
        if not packet_checked or not template_checked or not cleanroom_checked:
            errors.append("pass results require packet, result-template, and cleanroom checks")
        if not independent_tester:
            errors.append("pass results require maintainer_verification.independent_tester=true")
        if not bundle_verified or not records_validated:
            errors.append("pass results require bundle verification and record validation")
        if not data.get("command_transcript"):
            errors.append("pass results require a command transcript")

    if result in {"partial", "fail"}:
        if not isinstance(improvement, dict) or not improvement.get("needed"):
            errors.append(f"{result} results require improvement_action.needed=true")

    if result == "fail":
        if not data.get("issues"):
            errors.append("fail results require at least one issue")

    return errors


def command_new(args: argparse.Namespace) -> int:
    output_dir = Path(args.out)
    output_dir.mkdir(parents=True, exist_ok=True)
    record_id = args.id or f"{args.trial_id.lower()}-{slugify(args.title)}"

    record = {
        "schema_version": "1",
        "id": record_id,
        "created_at": now_iso(),
        "trial_id": args.trial_id,
        "title": args.title,
        "result": args.result,
        "packet_path": args.packet_path,
        "result_template_path": args.result_template_path,
        "tester_role": args.tester_role,
        "tester_environment": args.tester_environment,
        "path_used": args.path_used,
        "public_inputs": args.public_input,
        "returned_artifacts": args.returned_artifact,
        "command_transcript": args.command_transcript,
        "friction": args.friction,
        "privacy_confirmation": {
            "no_private_data": args.no_private_data,
            "quarantine_required": args.quarantine_required,
            "summary": args.privacy_summary,
        },
        "maintainer_verification": {
            "packet_check": args.packet_check,
            "result_template_check": args.result_template_check,
            "cleanroom_check": args.cleanroom_check,
            "independent_tester": args.independent_tester,
            "verify_bundle": args.verify_bundle,
            "validate_records": args.validate_records,
            "notes": args.verification_notes,
        },
        "issues": args.issue,
        "feedback_record_ids": args.feedback_record_id,
        "improvement_action": {
            "needed": args.improvement_needed,
            "summary": args.improvement_summary,
        },
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


def command_validate(args: argparse.Namespace) -> int:
    paths: list[Path] = []
    for raw_path in args.paths:
        path = Path(raw_path)
        if path.is_dir():
            paths.extend(sorted(path.glob("*.json")))
        else:
            paths.append(path)

    ok = True
    if not paths:
        print("no trial records found")
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
            errors = [str(exc)]
            data = {}
        if errors:
            invalid.append((path, errors))
            if not args.include_invalid:
                continue
        data["_path"] = str(path)
        records.append(data)

    counts = {result: 0 for result in sorted(ALLOWED_RESULTS)}
    for record in records:
        result = record.get("result")
        if result in counts:
            counts[result] += 1

    lines = [
        "# External Contributor Trial Aggregate",
        "",
        f"Generated: {now_iso()}",
        f"Input: `{input_dir}`",
        f"Records: {len(records)}",
        f"Invalid records: {len(invalid)}",
        "",
        "## Result Counts",
        "",
    ]
    for result in sorted(counts):
        lines.append(f"- `{result}`: {counts[result]}")
    lines.extend(["", "## Records", ""])
    if records:
        for record in sorted(records, key=lambda item: str(item.get("trial_id", ""))):
            lines.append(f"- `{record.get('result')}` **{record.get('trial_id')} {record.get('title')}**")
            lines.append(f"  - id: `{record.get('id')}`")
            lines.append(f"  - path used: `{record.get('path_used')}`")
            verification = record.get("maintainer_verification", {})
            if isinstance(verification, dict):
                lines.append(f"  - cleanroom check: `{verification.get('cleanroom_check')}`")
                lines.append(f"  - independent tester: `{verification.get('independent_tester')}`")
            lines.append(f"  - file: `{record.get('_path')}`")
            improvement = record.get("improvement_action", {})
            if isinstance(improvement, dict):
                lines.append(f"  - improvement needed: `{improvement.get('needed')}`")
                if improvement.get("summary"):
                    lines.append(f"  - improvement: {improvement.get('summary')}")
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
        "This aggregate tracks contributor-intake usability only. It is not NWN runtime proof, not privacy proof, not install-smoke evidence, and not automatic skill improvement.",
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

    new_parser = subparsers.add_parser("new", help="create an external contributor trial record")
    new_parser.add_argument("--out", default="docs/nwn-skill-pack/knowledge-inbox/external-trials/records")
    new_parser.add_argument("--id", default="")
    new_parser.add_argument("--trial-id", required=True)
    new_parser.add_argument("--title", required=True)
    new_parser.add_argument("--result", required=True, choices=sorted(ALLOWED_RESULTS))
    new_parser.add_argument("--packet-path", default="knowledge-inbox/external-contributor-trial-packet.md")
    new_parser.add_argument("--result-template-path", default="knowledge-inbox/external-contributor-trial-result-template.md")
    new_parser.add_argument("--tester-role", default="")
    new_parser.add_argument("--tester-environment", default="")
    new_parser.add_argument("--path-used", required=True, choices=sorted(ALLOWED_PATHS))
    new_parser.add_argument("--public-input", action="append", default=[])
    new_parser.add_argument("--returned-artifact", action="append", default=[])
    new_parser.add_argument("--command-transcript", action="append", default=[])
    new_parser.add_argument("--friction", action="append", default=[])
    new_parser.add_argument("--no-private-data", action="store_true")
    new_parser.add_argument("--quarantine-required", action="store_true")
    new_parser.add_argument("--privacy-summary", default="")
    new_parser.add_argument("--packet-check", action="store_true")
    new_parser.add_argument("--result-template-check", action="store_true")
    new_parser.add_argument("--cleanroom-check", action="store_true")
    new_parser.add_argument("--independent-tester", action="store_true")
    new_parser.add_argument("--verify-bundle", action="store_true")
    new_parser.add_argument("--validate-records", action="store_true")
    new_parser.add_argument("--verification-notes", default="")
    new_parser.add_argument("--issue", action="append", default=[])
    new_parser.add_argument("--feedback-record-id", action="append", default=[])
    new_parser.add_argument("--improvement-needed", action="store_true")
    new_parser.add_argument("--improvement-summary", default="")
    new_parser.add_argument("--notes", default="")
    new_parser.set_defaults(func=command_new)

    validate_parser = subparsers.add_parser("validate", help="validate external contributor trial records")
    validate_parser.add_argument("paths", nargs="+")
    validate_parser.set_defaults(func=command_validate)

    aggregate_parser = subparsers.add_parser("aggregate", help="write a markdown aggregate")
    aggregate_parser.add_argument("input")
    aggregate_parser.add_argument("--out", default="docs/nwn-skill-pack/knowledge-inbox/external-trials/aggregate.md")
    aggregate_parser.add_argument("--include-invalid", action="store_true")
    aggregate_parser.set_defaults(func=command_aggregate)

    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
