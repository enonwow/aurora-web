#!/usr/bin/env python3
"""Create, validate, and aggregate NWN skill-pack forward-test records."""

from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ALLOWED_RESULTS = {"pass", "partial", "fail", "not-run"}
ALLOWED_RECORD_TYPES = {"prompt-forward-test", "static-check", "install-smoke-test"}
TEST_ID_RE = re.compile(r"^(FT|PKG|INSTALL)-[0-9]{3}$")
REQUIRED_FIELDS = [
    "schema_version",
    "id",
    "created_at",
    "record_type",
    "test_id",
    "title",
    "result",
    "prompt_or_command",
    "skill_path",
    "evidence",
    "issues",
    "missing_evidence",
    "improvement_action",
]
LIST_FIELDS = [
    "expected_references",
    "observed_references",
    "evidence_labels",
    "evidence",
    "issues",
    "missing_evidence",
    "artifacts",
    "feedback_record_ids",
]
REQUIRED_IMPROVEMENT_FIELDS = ["needed", "summary"]
REQUIRED_INSTALL_VERIFICATION_FIELDS = [
    "registered_or_installed",
    "fresh_context_started",
    "skill_visible_or_invokable",
    "expected_references_routed",
    "runtime_boundary_preserved",
    "preparation_only",
]
REQUIRED_REVIEWER_ASSERTION_FIELDS = [
    "first_implementable_slice",
]
RETURNED_CAPTURE_ARTIFACT_TOKEN = "forward-test-return-captures"


def has_returned_capture_artifact(data: dict[str, Any]) -> bool:
    artifacts = data.get("artifacts", [])
    if not isinstance(artifacts, list):
        return False
    return any(RETURNED_CAPTURE_ARTIFACT_TOKEN in str(artifact) for artifact in artifacts)


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def slugify(value: str) -> str:
    value = value.lower().strip()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    value = re.sub(r"-{2,}", "-", value).strip("-")
    return value[:64] or "forward-test"


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

    if data.get("record_type") not in ALLOWED_RECORD_TYPES:
        errors.append(f"record_type must be one of: {', '.join(sorted(ALLOWED_RECORD_TYPES))}")

    test_id = data.get("test_id")
    if not isinstance(test_id, str) or not TEST_ID_RE.match(test_id):
        errors.append("test_id must match FT-000, PKG-000, or INSTALL-000 format")

    if data.get("result") not in ALLOWED_RESULTS:
        errors.append(f"result must be one of: {', '.join(sorted(ALLOWED_RESULTS))}")

    for list_field in LIST_FIELDS:
        value = data.get(list_field, [])
        if not isinstance(value, list):
            errors.append(f"{list_field} must be a list")
        elif not all(isinstance(item, str) for item in value):
            errors.append(f"{list_field} must contain only strings")

    improvement = data.get("improvement_action")
    if not isinstance(improvement, dict):
        errors.append("improvement_action must be an object")
    else:
        for field in REQUIRED_IMPROVEMENT_FIELDS:
            if field not in improvement:
                errors.append(f"improvement_action.{field} is required")
        if "needed" in improvement and not isinstance(improvement["needed"], bool):
            errors.append("improvement_action.needed must be boolean")

    if data.get("result") == "partial":
        if not isinstance(improvement, dict) or not improvement.get("needed"):
            errors.append("partial results require improvement_action.needed=true")

    if data.get("result") == "fail":
        if not data.get("issues"):
            errors.append("fail results require at least one issue")
        if not isinstance(improvement, dict) or not improvement.get("needed"):
            errors.append("fail results require improvement_action.needed=true")

    reviewer_assertions = data.get("reviewer_assertions")
    if reviewer_assertions is not None:
        if not isinstance(reviewer_assertions, dict):
            errors.append("reviewer_assertions must be an object")
        else:
            for field in REQUIRED_REVIEWER_ASSERTION_FIELDS:
                if field in reviewer_assertions and not isinstance(reviewer_assertions[field], bool):
                    errors.append(f"reviewer_assertions.{field} must be boolean")

    if (
        data.get("record_type") == "prompt-forward-test"
        and data.get("result") in {"pass", "partial"}
    ):
        if not isinstance(reviewer_assertions, dict):
            errors.append("prompt-forward-test pass/partial results require reviewer_assertions")
        else:
            for field in REQUIRED_REVIEWER_ASSERTION_FIELDS:
                if field not in reviewer_assertions:
                    errors.append(f"reviewer_assertions.{field} is required")
            if reviewer_assertions.get("first_implementable_slice") is not True:
                errors.append(
                    "prompt-forward-test pass/partial results require "
                    "reviewer_assertions.first_implementable_slice=true"
                )
        if not has_returned_capture_artifact(data):
            errors.append(
                "prompt-forward-test pass/partial results require an artifact path "
                "under forward-test-return-captures"
            )

    if data.get("record_type") == "install-smoke-test":
        if not str(data.get("test_id", "")).startswith("INSTALL-"):
            errors.append("install-smoke-test records require an INSTALL-### test_id")
        install_verification = data.get("install_verification")
        if data.get("result") == "pass":
            if not isinstance(install_verification, dict):
                errors.append("install-smoke-test pass results require install_verification")
            else:
                for field in REQUIRED_INSTALL_VERIFICATION_FIELDS:
                    if field not in install_verification:
                        errors.append(f"install_verification.{field} is required")
                true_fields = [
                    "registered_or_installed",
                    "fresh_context_started",
                    "skill_visible_or_invokable",
                    "expected_references_routed",
                    "runtime_boundary_preserved",
                ]
                for field in true_fields:
                    if install_verification.get(field) is not True:
                        errors.append(f"install-smoke-test pass requires install_verification.{field}=true")
                if install_verification.get("preparation_only") is not False:
                    errors.append("install-smoke-test pass requires install_verification.preparation_only=false")

    return errors


def command_new(args: argparse.Namespace) -> int:
    output_dir = Path(args.out)
    output_dir.mkdir(parents=True, exist_ok=True)
    record_id = args.id or f"{args.test_id.lower()}-{slugify(args.title)}"

    record = {
        "schema_version": "1",
        "id": record_id,
        "created_at": now_iso(),
        "record_type": args.record_type,
        "test_id": args.test_id,
        "title": args.title,
        "result": args.result,
        "tester": args.tester,
        "context": args.context,
        "prompt_or_command": args.prompt_or_command,
        "skill_path": args.skill_path,
        "expected_references": args.expected_reference,
        "observed_references": args.observed_reference,
        "evidence_labels": args.evidence_label,
        "evidence": args.evidence,
        "issues": args.issue,
        "missing_evidence": args.missing_evidence,
        "artifacts": args.artifact,
        "feedback_record_ids": args.feedback_record_id,
        "improvement_action": {
            "needed": args.improvement_needed,
            "summary": args.improvement_summary,
        },
        "notes": args.notes,
    }
    if args.record_type == "prompt-forward-test" or args.first_implementable_slice:
        record["reviewer_assertions"] = {
            "first_implementable_slice": args.first_implementable_slice,
        }
    if args.record_type == "install-smoke-test" or any([
        args.install_registered_or_installed,
        args.install_fresh_context,
        args.install_skill_visible,
        args.install_expected_references_routed,
        args.install_runtime_boundary_preserved,
        args.install_preparation_only,
    ]):
        record["install_verification"] = {
            "registered_or_installed": args.install_registered_or_installed,
            "fresh_context_started": args.install_fresh_context,
            "skill_visible_or_invokable": args.install_skill_visible,
            "expected_references_routed": args.install_expected_references_routed,
            "runtime_boundary_preserved": args.install_runtime_boundary_preserved,
            "preparation_only": args.install_preparation_only,
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
    ok = True
    for raw_path in args.paths:
        path = Path(raw_path)
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
    for path in sorted(input_dir.glob("*.json")):
        data = load_json(path)
        errors = validate_record(data)
        if errors and not args.include_invalid:
            continue
        records.append(data)

    counts = {result: 0 for result in sorted(ALLOWED_RESULTS)}
    for record in records:
        result = record.get("result")
        if result in counts:
            counts[result] += 1

    lines = [
        "# Forward Test Record Aggregate",
        "",
        f"Generated: {now_iso()}",
        f"Input: `{input_dir}`",
        f"Records: {len(records)}",
        "",
        "## Result Counts",
        "",
    ]
    for result in sorted(counts):
        lines.append(f"- `{result}`: {counts[result]}")
    lines.append("")

    lines.append("## Records")
    lines.append("")
    for record in sorted(records, key=lambda item: str(item.get("test_id", ""))):
        lines.append(f"- `{record.get('result')}` **{record.get('test_id')} {record.get('title')}**")
        lines.append(f"  - id: `{record.get('id')}`")
        lines.append(f"  - type: `{record.get('record_type')}`")
        improvement = record.get("improvement_action", {})
        if isinstance(improvement, dict):
            lines.append(f"  - improvement needed: `{improvement.get('needed')}`")
            if improvement.get("summary"):
                lines.append(f"  - improvement: {improvement.get('summary')}")
        lines.append("")

    output = Path(args.out)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text("\n".join(lines), encoding="utf-8")
    print(output)
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="command", required=True)

    new_parser = subparsers.add_parser("new", help="create a forward-test record")
    new_parser.add_argument("--out", default="docs/nwn-skill-pack/forward-tests/records")
    new_parser.add_argument("--id", default="")
    new_parser.add_argument("--record-type", required=True, choices=sorted(ALLOWED_RECORD_TYPES))
    new_parser.add_argument("--test-id", required=True)
    new_parser.add_argument("--title", required=True)
    new_parser.add_argument("--result", required=True, choices=sorted(ALLOWED_RESULTS))
    new_parser.add_argument("--tester", default="")
    new_parser.add_argument("--context", default="")
    new_parser.add_argument("--prompt-or-command", required=True)
    new_parser.add_argument("--skill-path", default="docs/nwn-skill-pack/draft-skills/nwn-server-gamedev")
    new_parser.add_argument("--expected-reference", action="append", default=[])
    new_parser.add_argument("--observed-reference", action="append", default=[])
    new_parser.add_argument("--evidence-label", action="append", default=[])
    new_parser.add_argument("--evidence", action="append", default=[])
    new_parser.add_argument("--issue", action="append", default=[])
    new_parser.add_argument("--missing-evidence", action="append", default=[])
    new_parser.add_argument("--artifact", action="append", default=[])
    new_parser.add_argument("--feedback-record-id", action="append", default=[])
    new_parser.add_argument("--install-registered-or-installed", action="store_true")
    new_parser.add_argument("--install-fresh-context", action="store_true")
    new_parser.add_argument("--install-skill-visible", action="store_true")
    new_parser.add_argument("--install-expected-references-routed", action="store_true")
    new_parser.add_argument("--install-runtime-boundary-preserved", action="store_true")
    new_parser.add_argument("--install-preparation-only", action="store_true")
    new_parser.add_argument("--first-implementable-slice", action="store_true")
    new_parser.add_argument("--improvement-needed", action="store_true")
    new_parser.add_argument("--improvement-summary", default="")
    new_parser.add_argument("--notes", default="")
    new_parser.set_defaults(func=command_new)

    validate_parser = subparsers.add_parser("validate", help="validate forward-test records")
    validate_parser.add_argument("paths", nargs="+")
    validate_parser.set_defaults(func=command_validate)

    aggregate_parser = subparsers.add_parser("aggregate", help="write a markdown aggregate")
    aggregate_parser.add_argument("input")
    aggregate_parser.add_argument("--out", default="docs/nwn-skill-pack/forward-tests/aggregate.md")
    aggregate_parser.add_argument("--include-invalid", action="store_true")
    aggregate_parser.set_defaults(func=command_aggregate)

    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
