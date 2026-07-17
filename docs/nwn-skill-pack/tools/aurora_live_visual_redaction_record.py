#!/usr/bin/env python3
"""Create, validate, and aggregate Aurora live visual redaction review records."""

from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ALLOWED_RESULTS = {"pass", "hold", "fail", "not-run"}
ALLOWED_ARTIFACT_KINDS = {
    "screenshot",
    "log",
    "saved-module-note",
    "external-evidence-bundle",
    "other",
}
ALLOWED_REDACTION_STATUSES = {"redacted", "not-private", "pending-redaction", "blocked"}
ALLOWED_REVIEW_RESULTS = {"passed", "held", "failed"}
SHA256_RE = re.compile(r"^[a-fA-F0-9]{64}$")
EXTERNAL_REF_PREFIXES = ("http://", "https://", "external:", "urn:")
EXTERNAL_NOTE_TOPIC_PATTERNS = {
    "immutable storage": re.compile(r"\b(immutable|permanent|stable|archived|pinned)\b", re.IGNORECASE),
    "access": re.compile(r"\b(access|accessible|reachable|opened|downloaded)\b", re.IGNORECASE),
    "hash check": re.compile(r"\b(hash|sha-?256|checksum|digest)\b", re.IGNORECASE),
}
REQUIRED_FIELDS = [
    "schema_version",
    "id",
    "created_at",
    "live_record_id",
    "evidence_manifest_path",
    "reviewer",
    "result",
    "artifacts_reviewed",
    "visual_review",
    "privacy_findings",
    "blocked_atoms",
    "checks_run",
    "checks_passed",
    "non_proof_boundaries",
    "notes",
]
REQUIRED_ARTIFACT_FIELDS = [
    "artifact_id",
    "atom",
    "kind",
    "path_or_external_ref",
    "redaction_status",
    "review_result",
]
REQUIRED_VISUAL_REVIEW_FIELDS = [
    "all_artifacts_opened",
    "screenshots_reviewed",
    "logs_reviewed",
    "no_private_data_visible",
    "redaction_irreversible",
    "hashes_or_external_notes_checked",
    "raw_reverse_excluded",
]
LIST_FIELDS = [
    "artifacts_reviewed",
    "privacy_findings",
    "blocked_atoms",
    "checks_run",
    "checks_passed",
    "non_proof_boundaries",
]


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def slugify(value: str) -> str:
    value = value.lower().strip()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    value = re.sub(r"-{2,}", "-", value).strip("-")
    return value[:64] or "visual-redaction"


def load_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, dict):
        raise ValueError(f"{path} must contain a JSON object")
    return data


def is_external_ref(value: Any) -> bool:
    return str(value or "").strip().lower().startswith(EXTERNAL_REF_PREFIXES)


def external_note_missing_topics(note: Any) -> list[str]:
    text = str(note or "")
    return [
        label
        for label, pattern in EXTERNAL_NOTE_TOPIC_PATTERNS.items()
        if not pattern.search(text)
    ]


def is_iso_datetime(value: Any) -> bool:
    text = str(value or "").strip()
    if not text:
        return False
    try:
        datetime.fromisoformat(text.replace("Z", "+00:00"))
    except ValueError:
        return False
    return True


def parse_artifact(raw: str) -> dict[str, str]:
    parts = raw.split("|", 11)
    if len(parts) not in {6, 7, 8, 9, 10, 11, 12}:
        raise ValueError(
            "--artifact must use artifact_id|atom|kind|path_or_external_ref|redaction_status|review_result"
            "[|source_artifact_ref[|source_artifact_sha256[|reviewed_artifact_sha256"
            "[|external_provenance_note[|external_storage_provider[|external_access_checked_at]]]]]]"
        )
    artifact = {
        "artifact_id": parts[0],
        "atom": parts[1],
        "kind": parts[2],
        "path_or_external_ref": parts[3],
        "redaction_status": parts[4],
        "review_result": parts[5],
        "notes": "",
    }
    if len(parts) == 7:
        artifact["source_artifact_ref"] = parts[6]
    if len(parts) == 8:
        artifact["source_artifact_ref"] = parts[6]
        artifact["source_artifact_sha256"] = parts[7]
    if len(parts) == 9:
        artifact["source_artifact_ref"] = parts[6]
        artifact["source_artifact_sha256"] = parts[7]
        artifact["reviewed_artifact_sha256"] = parts[8]
    if len(parts) == 10:
        artifact["source_artifact_ref"] = parts[6]
        artifact["source_artifact_sha256"] = parts[7]
        artifact["reviewed_artifact_sha256"] = parts[8]
        artifact["external_provenance_note"] = parts[9]
    if len(parts) == 11:
        artifact["source_artifact_ref"] = parts[6]
        artifact["source_artifact_sha256"] = parts[7]
        artifact["reviewed_artifact_sha256"] = parts[8]
        artifact["external_provenance_note"] = parts[9]
        artifact["external_storage_provider"] = parts[10]
    if len(parts) == 12:
        artifact["source_artifact_ref"] = parts[6]
        artifact["source_artifact_sha256"] = parts[7]
        artifact["reviewed_artifact_sha256"] = parts[8]
        artifact["external_provenance_note"] = parts[9]
        artifact["external_storage_provider"] = parts[10]
        artifact["external_access_checked_at"] = parts[11]
    return artifact


def validate_string_list(data: dict[str, Any], field: str, errors: list[str]) -> None:
    value = data.get(field, [])
    if not isinstance(value, list):
        errors.append(f"{field} must be a list")
    elif not all(isinstance(item, str) for item in value):
        errors.append(f"{field} must contain only strings")


def validate_artifact(value: Any, index: int, errors: list[str]) -> None:
    if not isinstance(value, dict):
        errors.append(f"artifacts_reviewed[{index}] must be an object")
        return
    for field in REQUIRED_ARTIFACT_FIELDS:
        if field not in value:
            errors.append(f"artifacts_reviewed[{index}].{field} is required")
    for field in ["artifact_id", "atom", "path_or_external_ref"]:
        if field in value and not str(value.get(field, "")).strip():
            errors.append(f"artifacts_reviewed[{index}].{field} must be a non-empty string")
    if "source_artifact_ref" in value and not str(value.get("source_artifact_ref", "")).strip():
        errors.append(f"artifacts_reviewed[{index}].source_artifact_ref must be a non-empty string when present")
    for field in ["source_artifact_sha256", "reviewed_artifact_sha256"]:
        if field in value:
            digest = str(value.get(field, "")).strip()
            if not SHA256_RE.fullmatch(digest):
                errors.append(f"artifacts_reviewed[{index}].{field} must be a 64-character SHA-256 hex digest")
    if "external_provenance_note" in value and not str(value.get("external_provenance_note", "")).strip():
        errors.append(f"artifacts_reviewed[{index}].external_provenance_note must be non-empty when present")
    if "external_storage_provider" in value and not str(value.get("external_storage_provider", "")).strip():
        errors.append(f"artifacts_reviewed[{index}].external_storage_provider must be non-empty when present")
    if "external_access_checked_at" in value and not is_iso_datetime(value.get("external_access_checked_at", "")):
        errors.append(f"artifacts_reviewed[{index}].external_access_checked_at must be an ISO-8601 datetime")
    if value.get("kind") not in ALLOWED_ARTIFACT_KINDS:
        errors.append(
            f"artifacts_reviewed[{index}].kind must be one of: "
            + ", ".join(sorted(ALLOWED_ARTIFACT_KINDS))
        )
    if value.get("redaction_status") not in ALLOWED_REDACTION_STATUSES:
        errors.append(
            f"artifacts_reviewed[{index}].redaction_status must be one of: "
            + ", ".join(sorted(ALLOWED_REDACTION_STATUSES))
        )
    if value.get("review_result") not in ALLOWED_REVIEW_RESULTS:
        errors.append(
            f"artifacts_reviewed[{index}].review_result must be one of: "
            + ", ".join(sorted(ALLOWED_REVIEW_RESULTS))
        )


def validate_record(data: dict[str, Any]) -> list[str]:
    errors: list[str] = []

    for field in REQUIRED_FIELDS:
        if field not in data:
            errors.append(f"missing required field: {field}")

    if data.get("schema_version") != "1":
        errors.append("schema_version must be '1'")

    for field in ["id", "created_at", "live_record_id", "evidence_manifest_path"]:
        if field in data and not str(data.get(field, "")).strip():
            errors.append(f"{field} must be a non-empty string")

    if data.get("result") not in ALLOWED_RESULTS:
        errors.append(f"result must be one of: {', '.join(sorted(ALLOWED_RESULTS))}")

    for field in LIST_FIELDS:
        if field == "artifacts_reviewed":
            continue
        validate_string_list(data, field, errors)

    artifacts = data.get("artifacts_reviewed", [])
    if not isinstance(artifacts, list):
        errors.append("artifacts_reviewed must be a list")
        artifacts = []
    for index, artifact in enumerate(artifacts):
        validate_artifact(artifact, index, errors)

    visual_review = data.get("visual_review")
    if not isinstance(visual_review, dict):
        errors.append("visual_review must be an object")
        visual_review = {}
    for field in REQUIRED_VISUAL_REVIEW_FIELDS:
        if field not in visual_review:
            errors.append(f"visual_review.{field} is required")
        elif not isinstance(visual_review[field], bool):
            errors.append(f"visual_review.{field} must be boolean")

    checks_run = data.get("checks_run", [])
    checks_passed = data.get("checks_passed", [])
    if not isinstance(checks_run, list):
        checks_run = []
    if not isinstance(checks_passed, list):
        checks_passed = []

    if data.get("result") == "pass":
        if not str(data.get("reviewer", "")).strip():
            errors.append("pass records require reviewer")
        if not artifacts:
            errors.append("pass records require artifacts_reviewed")
        for field in REQUIRED_VISUAL_REVIEW_FIELDS:
            if visual_review.get(field) is not True:
                errors.append(f"pass records require visual_review.{field}=true")
        for index, artifact in enumerate(artifacts):
            if not isinstance(artifact, dict):
                continue
            if artifact.get("review_result") != "passed":
                errors.append(f"pass records require artifacts_reviewed[{index}].review_result=passed")
            if artifact.get("redaction_status") not in {"redacted", "not-private"}:
                errors.append(
                    f"pass records require artifacts_reviewed[{index}].redaction_status redacted or not-private"
                )
            if str(artifact.get("source_artifact_ref", "")).strip():
                for field in ["source_artifact_sha256", "reviewed_artifact_sha256"]:
                    if not SHA256_RE.fullmatch(str(artifact.get(field, "")).strip()):
                        errors.append(
                            f"pass records with source_artifact_ref require artifacts_reviewed[{index}].{field}"
                        )
                source_hash = str(artifact.get("source_artifact_sha256", "")).strip().lower()
                reviewed_hash = str(artifact.get("reviewed_artifact_sha256", "")).strip().lower()
                if (
                    artifact.get("redaction_status") == "redacted"
                    and SHA256_RE.fullmatch(source_hash)
                    and SHA256_RE.fullmatch(reviewed_hash)
                    and source_hash == reviewed_hash
                ):
                    errors.append(
                        f"pass records with redaction_status=redacted require "
                        f"artifacts_reviewed[{index}].reviewed_artifact_sha256 to differ from source_artifact_sha256"
                    )
            if is_external_ref(artifact.get("path_or_external_ref")) and not str(
                artifact.get("external_provenance_note", "")
            ).strip():
                errors.append(
                    f"pass records with external path_or_external_ref require "
                    f"artifacts_reviewed[{index}].external_provenance_note"
                )
            if is_external_ref(artifact.get("path_or_external_ref")):
                missing_topics = external_note_missing_topics(artifact.get("external_provenance_note", ""))
                if missing_topics:
                    errors.append(
                        f"artifacts_reviewed[{index}].external_provenance_note must mention: "
                        + ", ".join(missing_topics)
                    )
                if not str(artifact.get("external_storage_provider", "")).strip():
                    errors.append(
                        f"pass records with external path_or_external_ref require "
                        f"artifacts_reviewed[{index}].external_storage_provider"
                    )
                if not is_iso_datetime(artifact.get("external_access_checked_at", "")):
                    errors.append(
                        f"pass records with external path_or_external_ref require "
                        f"artifacts_reviewed[{index}].external_access_checked_at ISO-8601 datetime"
                    )
        if data.get("privacy_findings"):
            errors.append("pass records require empty privacy_findings")
        if data.get("blocked_atoms"):
            errors.append("pass records require empty blocked_atoms")
        if not checks_run:
            errors.append("pass records require checks_run")
        if not checks_passed:
            errors.append("pass records require checks_passed")
        if set(str(item) for item in checks_run) - set(str(item) for item in checks_passed):
            errors.append("pass records require every check in checks_run to appear in checks_passed")
        if not data.get("non_proof_boundaries"):
            errors.append("pass records require non_proof_boundaries")

    if data.get("result") in {"hold", "fail"}:
        has_findings = bool(data.get("privacy_findings") or data.get("blocked_atoms"))
        has_held_artifact = any(
            isinstance(artifact, dict) and artifact.get("review_result") in {"held", "failed"}
            for artifact in artifacts
        )
        if not has_findings and not has_held_artifact:
            errors.append("hold or fail records require a finding, blocked atom, held artifact, or failed artifact")

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


def command_new(args: argparse.Namespace) -> int:
    output_dir = Path(args.out)
    output_dir.mkdir(parents=True, exist_ok=True)
    record_id = args.id or f"avr-{slugify(args.live_record_id)}"
    try:
        artifacts = [parse_artifact(raw) for raw in args.artifact]
    except ValueError as exc:
        print(f"[ERROR] {exc}", file=sys.stderr)
        return 1

    record = {
        "schema_version": "1",
        "id": record_id,
        "created_at": now_iso(),
        "live_record_id": args.live_record_id,
        "evidence_manifest_path": args.evidence_manifest_path,
        "reviewer": args.reviewer,
        "result": args.result,
        "artifacts_reviewed": artifacts,
        "visual_review": {
            "all_artifacts_opened": args.all_artifacts_opened,
            "screenshots_reviewed": args.screenshots_reviewed,
            "logs_reviewed": args.logs_reviewed,
            "no_private_data_visible": args.no_private_data_visible,
            "redaction_irreversible": args.redaction_irreversible,
            "hashes_or_external_notes_checked": args.hashes_or_external_notes_checked,
            "raw_reverse_excluded": args.raw_reverse_excluded,
        },
        "privacy_findings": args.privacy_finding,
        "blocked_atoms": args.blocked_atom,
        "checks_run": args.check_run,
        "checks_passed": args.check_passed,
        "non_proof_boundaries": args.non_proof_boundary,
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
    paths = iter_record_paths(args.paths)
    ok = True
    if not paths:
        print("no Aurora visual redaction records found")
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
        "# Aurora Live Visual Redaction Records Aggregate",
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
            lines.append(f"  - live record: `{record.get('live_record_id')}`")
            lines.append(f"  - evidence manifest: `{record.get('evidence_manifest_path')}`")
            lines.append(f"  - reviewer: `{record.get('reviewer')}`")
            lines.append(f"  - reviewed artifacts: `{len(record.get('artifacts_reviewed', []))}`")
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
        "Visual redaction records prove only that a maintainer recorded a human visual review decision. They do not OCR screenshots, inspect images automatically, prove artifact authenticity, prove Aurora Toolset behavior, prove NWN runtime behavior, or automatically update skill references.",
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

    new_parser = subparsers.add_parser("new", help="create a visual redaction review record")
    new_parser.add_argument("--out", default="docs/nwn-skill-pack/knowledge-inbox/aurora-live-visual-redaction-records/records")
    new_parser.add_argument("--id", default="")
    new_parser.add_argument("--live-record-id", required=True)
    new_parser.add_argument("--evidence-manifest-path", required=True)
    new_parser.add_argument("--reviewer", default="")
    new_parser.add_argument("--result", required=True, choices=sorted(ALLOWED_RESULTS))
    new_parser.add_argument("--artifact", action="append", default=[])
    new_parser.add_argument("--all-artifacts-opened", action="store_true")
    new_parser.add_argument("--screenshots-reviewed", action="store_true")
    new_parser.add_argument("--logs-reviewed", action="store_true")
    new_parser.add_argument("--no-private-data-visible", action="store_true")
    new_parser.add_argument("--redaction-irreversible", action="store_true")
    new_parser.add_argument("--hashes-or-external-notes-checked", action="store_true")
    new_parser.add_argument("--raw-reverse-excluded", action="store_true")
    new_parser.add_argument("--privacy-finding", action="append", default=[])
    new_parser.add_argument("--blocked-atom", action="append", default=[])
    new_parser.add_argument("--check-run", action="append", default=[])
    new_parser.add_argument("--check-passed", action="append", default=[])
    new_parser.add_argument("--non-proof-boundary", action="append", default=[])
    new_parser.add_argument("--notes", default="")
    new_parser.set_defaults(func=command_new)

    validate_parser = subparsers.add_parser("validate", help="validate visual redaction review records")
    validate_parser.add_argument("paths", nargs="+")
    validate_parser.set_defaults(func=command_validate)

    aggregate_parser = subparsers.add_parser("aggregate", help="write a markdown aggregate")
    aggregate_parser.add_argument("input")
    aggregate_parser.add_argument("--out", default="docs/nwn-skill-pack/knowledge-inbox/aurora-live-visual-redaction-records/aggregate.md")
    aggregate_parser.add_argument("--include-invalid", action="store_true")
    aggregate_parser.set_defaults(func=command_aggregate)

    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
