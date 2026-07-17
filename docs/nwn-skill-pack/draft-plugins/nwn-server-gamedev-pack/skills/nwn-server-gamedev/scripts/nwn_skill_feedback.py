#!/usr/bin/env python3
"""Create, validate, and aggregate NWN skill-pack feedback records."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ALLOWED_DOMAINS = {
    "concept",
    "locations",
    "items",
    "creatures",
    "2da-hak-tlk",
    "nwscript",
    "nui",
    "quests",
    "economy",
    "persistence",
    "deployment",
    "testing",
    "ops",
    "other",
}

ALLOWED_STATUSES = {
    "unverified",
    "runtime-verified",
    "docs-verified",
    "project-specific",
    "promoted",
    "rejected",
    "superseded",
}

ALLOWED_SOURCE_TYPES = {
    "user-runtime-test",
    "maintainer-review",
    "docs-research",
    "model-suggestion",
    "claude-opus-import",
    "codex-session",
    "project-postmortem",
    "other",
}

ALLOWED_REVIEW_DECISIONS = {
    "accept-for-promotion",
    "needs-more-evidence",
    "reject",
    "project-specific-only",
    "supersede",
}

REQUIRED_FIELDS = [
    "schema_version",
    "id",
    "created_at",
    "domain",
    "title",
    "summary",
    "source_type",
    "status",
    "evidence",
    "proposed_skill_update",
]

REQUIRED_REVIEW_FIELDS = [
    "reviewed_at",
    "reviewer",
    "decision",
    "promotion_ready",
    "target_reference",
    "required_actions",
    "notes",
]

PRIVACY_SCAN_TERMS = [
    "password",
    "secret",
    "api key",
    "private key",
    "credential",
    "token",
    "ip address",
    "account name",
    "private player data",
    "private module",
    "private server log",
]


def slugify(value: str) -> str:
    value = value.lower().strip()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    value = re.sub(r"-{2,}", "-", value).strip("-")
    return value[:64] or "feedback"


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def load_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, dict):
        raise ValueError(f"{path} must contain a JSON object")
    return data


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def expand_record_paths(paths: list[str]) -> list[Path]:
    expanded: list[Path] = []
    for raw_path in paths:
        path = Path(raw_path)
        if path.is_dir():
            expanded.extend(sorted(path.glob("*.json")))
        else:
            expanded.append(path)
    return expanded


def scan_privacy_terms(data: dict[str, Any]) -> list[str]:
    text = json.dumps(data, ensure_ascii=False).lower()
    return [term for term in PRIVACY_SCAN_TERMS if term in text]


def validate_record(data: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    for field in REQUIRED_FIELDS:
        if field not in data:
            errors.append(f"missing required field: {field}")

    if data.get("schema_version") != "1":
        errors.append("schema_version must be '1'")
    if data.get("domain") not in ALLOWED_DOMAINS:
        errors.append(f"domain must be one of: {', '.join(sorted(ALLOWED_DOMAINS))}")
    if data.get("status") not in ALLOWED_STATUSES:
        errors.append(f"status must be one of: {', '.join(sorted(ALLOWED_STATUSES))}")
    if data.get("source_type") not in ALLOWED_SOURCE_TYPES:
        errors.append(f"source_type must be one of: {', '.join(sorted(ALLOWED_SOURCE_TYPES))}")

    evidence = data.get("evidence")
    if not isinstance(evidence, list) or not evidence:
        errors.append("evidence must be a non-empty list")
    elif not all(isinstance(item, str) and item.strip() for item in evidence):
        errors.append("each evidence entry must be a non-empty string")

    proposed = data.get("proposed_skill_update")
    if not isinstance(proposed, dict):
        errors.append("proposed_skill_update must be an object")
    else:
        if not proposed.get("file"):
            errors.append("proposed_skill_update.file is required")
        if not proposed.get("summary"):
            errors.append("proposed_skill_update.summary is required")

    review = data.get("review")
    if review is not None:
        if not isinstance(review, dict):
            errors.append("review must be an object when present")
        else:
            for field in REQUIRED_REVIEW_FIELDS:
                if field not in review:
                    errors.append(f"review.{field} is required")
            if review.get("decision") not in ALLOWED_REVIEW_DECISIONS:
                errors.append(
                    "review.decision must be one of: "
                    f"{', '.join(sorted(ALLOWED_REVIEW_DECISIONS))}"
                )
            if "promotion_ready" in review and not isinstance(review["promotion_ready"], bool):
                errors.append("review.promotion_ready must be boolean")
            actions = review.get("required_actions", [])
            if not isinstance(actions, list):
                errors.append("review.required_actions must be a list")
            elif not all(isinstance(item, str) for item in actions):
                errors.append("review.required_actions must contain only strings")

    return errors


def command_new(args: argparse.Namespace) -> int:
    output_dir = Path(args.out)
    output_dir.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    record_id = f"{timestamp}-{slugify(args.title)}"
    record = {
        "schema_version": "1",
        "id": record_id,
        "created_at": now_iso(),
        "domain": args.domain,
        "title": args.title,
        "summary": args.summary,
        "source_type": args.source_type,
        "status": args.status,
        "nwn_version": args.nwn_version,
        "server_context": args.server_context,
        "evidence": args.evidence,
        "files_or_scripts": args.files_or_scripts,
        "runtime_steps": args.runtime_steps,
        "failure_mode": args.failure_mode,
        "proposed_skill_update": {
            "file": args.proposed_file,
            "summary": args.proposed_summary,
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
    ok = True
    paths = expand_record_paths(args.paths)
    if not paths:
        print("No feedback records found", file=sys.stderr)
        return 1

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


def command_review(args: argparse.Namespace) -> int:
    source = Path(args.record)
    data = load_json(source)
    errors = validate_record(data)
    if errors:
        for error in errors:
            print(f"[ERROR] {error}", file=sys.stderr)
        return 1

    data["status"] = args.status
    data["review"] = {
        "reviewed_at": now_iso(),
        "reviewer": args.reviewer,
        "decision": args.decision,
        "promotion_ready": args.promotion_ready,
        "target_reference": args.target_reference or data.get("proposed_skill_update", {}).get("file", ""),
        "required_actions": args.required_action,
        "notes": args.notes,
    }

    errors = validate_record(data)
    if errors:
        for error in errors:
            print(f"[ERROR] {error}", file=sys.stderr)
        return 1

    output_dir = Path(args.out)
    output_dir.mkdir(parents=True, exist_ok=True)
    output = output_dir / source.name
    output.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(output)
    return 0


def command_aggregate(args: argparse.Namespace) -> int:
    input_dir = Path(args.input)
    records: list[tuple[Path, dict[str, Any]]] = []
    for path in sorted(input_dir.glob("*.json")):
        data = load_json(path)
        errors = validate_record(data)
        if errors and not args.include_invalid:
            continue
        records.append((path, data))

    grouped: dict[str, list[dict[str, Any]]] = {}
    for _, data in records:
        grouped.setdefault(str(data.get("domain", "other")), []).append(data)

    lines = [
        "# NWN Skill Feedback Aggregate",
        "",
        f"Generated: {now_iso()}",
        f"Input: `{input_dir}`",
        f"Records: {len(records)}",
        "",
    ]
    for domain in sorted(grouped):
        lines.append(f"## {domain}")
        lines.append("")
        for data in grouped[domain]:
            lines.append(f"- `{data.get('status')}` **{data.get('title')}** ({data.get('source_type')})")
            lines.append(f"  - id: `{data.get('id')}`")
            lines.append(f"  - summary: {data.get('summary')}")
            proposed = data.get("proposed_skill_update", {})
            if isinstance(proposed, dict):
                lines.append(f"  - proposed file: `{proposed.get('file')}`")
        lines.append("")

    output = Path(args.out)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text("\n".join(lines), encoding="utf-8")
    print(output)
    return 0


def command_bundle(args: argparse.Namespace) -> int:
    records: list[tuple[Path, dict[str, Any], list[str]]] = []
    invalid: list[tuple[Path, list[str]]] = []
    risky: list[tuple[Path, list[str]]] = []

    for path in expand_record_paths(args.paths):
        try:
            data = load_json(path)
            errors = validate_record(data)
        except Exception as exc:
            invalid.append((path, [str(exc)]))
            continue
        if errors:
            invalid.append((path, errors))
            continue
        hits = scan_privacy_terms(data)
        if hits:
            risky.append((path, hits))
        records.append((path, data, hits))

    if invalid:
        for path, errors in invalid:
            print(f"{path}: INVALID", file=sys.stderr)
            for error in errors:
                print(f"  - {error}", file=sys.stderr)
        return 1
    if not records:
        print("No valid feedback records found", file=sys.stderr)
        return 1
    if risky and args.fail_on_risky:
        for path, hits in risky:
            print(f"{path}: PRIVACY TERMS: {', '.join(hits)}", file=sys.stderr)
        return 1

    output_dir = Path(args.out)
    if output_dir.exists():
        if not args.force:
            print(f"Output exists; pass --force to replace: {output_dir}", file=sys.stderr)
            return 1
        shutil.rmtree(output_dir)
    records_dir = output_dir / "feedback-records"
    records_dir.mkdir(parents=True, exist_ok=True)

    bundle_id = args.bundle_id or datetime.now(timezone.utc).strftime(
        "nwn-feedback-bundle-%Y%m%dT%H%M%SZ"
    )
    entries: list[dict[str, Any]] = []

    for source, data, hits in records:
        destination = records_dir / source.name
        shutil.copy2(source, destination)
        entries.append({
            "source_path": str(source),
            "bundle_path": str(destination.relative_to(output_dir)).replace("\\", "/"),
            "id": data.get("id", ""),
            "domain": data.get("domain", ""),
            "title": data.get("title", ""),
            "status": data.get("status", ""),
            "source_type": data.get("source_type", ""),
            "sha256": sha256(destination),
            "privacy_scan_terms": hits,
        })

    manifest = {
        "schema_version": "1",
        "bundle_id": bundle_id,
        "created_at": now_iso(),
        "record_count": len(entries),
        "contains_official_skill_update": False,
        "review_required_before_promotion": True,
        "privacy_scan_terms": PRIVACY_SCAN_TERMS,
        "records": entries,
    }
    (output_dir / "manifest.json").write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )

    summary_lines = [
        "# NWN Feedback Contribution Bundle",
        "",
        f"Bundle id: `{bundle_id}`",
        f"Created: `{manifest['created_at']}`",
        f"Records: {len(entries)}",
        "",
        "This bundle is intake material. It does not update an installed skill or prove that a claim is reusable.",
        "A maintainer must validate, review, promote, version, and release accepted lessons.",
        "",
        "## Records",
        "",
    ]
    for entry in entries:
        summary_lines.append(
            f"- `{entry['id']}` {entry['domain']} {entry['status']} "
            f"({entry['source_type']})"
        )
        summary_lines.append(f"  - file: `{entry['bundle_path']}`")
        if entry["privacy_scan_terms"]:
            summary_lines.append(
                f"  - privacy scan terms: {', '.join(entry['privacy_scan_terms'])}"
            )
    if risky:
        summary_lines.extend([
            "",
            "## Privacy Review Needed",
            "",
            "The simple scanner found terms that may indicate private data. Review before sharing.",
        ])
    (output_dir / "SUMMARY.md").write_text("\n".join(summary_lines) + "\n", encoding="utf-8")

    print(output_dir)
    if risky:
        print(
            f"WARNING: privacy scan terms found in {len(risky)} record(s); review before sharing",
            file=sys.stderr,
        )
    return 0


def entry_bundle_path(bundle_dir: Path, entry: dict[str, Any]) -> Path | None:
    raw_path = entry.get("bundle_path")
    if not isinstance(raw_path, str) or not raw_path:
        return None
    relative = Path(raw_path)
    if relative.is_absolute() or ".." in relative.parts:
        return None
    return bundle_dir / relative


def command_verify_bundle(args: argparse.Namespace) -> int:
    bundle_dir = Path(args.bundle)
    manifest_path = bundle_dir / "manifest.json"
    errors: list[str] = []
    warnings: list[str] = []
    checks: list[str] = []

    if not manifest_path.exists():
        print(f"Missing manifest: {manifest_path}", file=sys.stderr)
        return 1

    try:
        manifest = load_json(manifest_path)
    except Exception as exc:
        print(f"Invalid manifest: {exc}", file=sys.stderr)
        return 1

    if manifest.get("schema_version") != "1":
        errors.append("manifest.schema_version must be '1'")
    else:
        checks.append("manifest schema_version is 1")
    if manifest.get("contains_official_skill_update") is not False:
        errors.append("manifest.contains_official_skill_update must be false")
    else:
        checks.append("bundle does not claim official skill updates")
    if manifest.get("review_required_before_promotion") is not True:
        errors.append("manifest.review_required_before_promotion must be true")
    else:
        checks.append("bundle requires review before promotion")

    records = manifest.get("records")
    if not isinstance(records, list) or not records:
        errors.append("manifest.records must be a non-empty list")
        records = []
    elif manifest.get("record_count") != len(records):
        errors.append(
            f"manifest.record_count mismatch: {manifest.get('record_count')!r} != {len(records)}"
        )
    else:
        checks.append(f"manifest record_count matches: {len(records)}")

    for index, entry in enumerate(records):
        if not isinstance(entry, dict):
            errors.append(f"manifest.records[{index}] must be an object")
            continue
        record_path = entry_bundle_path(bundle_dir, entry)
        if record_path is None:
            errors.append(f"manifest.records[{index}].bundle_path is missing or unsafe")
            continue
        if not record_path.exists():
            errors.append(f"record file is missing: {record_path}")
            continue

        recorded_hash = entry.get("sha256")
        current_hash = sha256(record_path)
        if recorded_hash != current_hash:
            errors.append(f"sha256 mismatch for {entry.get('bundle_path')}: manifest={recorded_hash!r}, current={current_hash!r}")
        else:
            checks.append(f"sha256 matches: {entry.get('bundle_path')}")

        try:
            data = load_json(record_path)
            record_errors = validate_record(data)
        except Exception as exc:
            record_errors = [str(exc)]
            data = {}
        if record_errors:
            for error in record_errors:
                errors.append(f"{entry.get('bundle_path')}: {error}")
            continue
        checks.append(f"record validates: {entry.get('bundle_path')}")

        for field in ["id", "domain", "status", "source_type"]:
            if entry.get(field) != data.get(field):
                errors.append(
                    f"{entry.get('bundle_path')}: manifest {field}={entry.get(field)!r} "
                    f"does not match record {field}={data.get(field)!r}"
                )

        hits = scan_privacy_terms(data)
        if hits:
            warnings.append(f"{entry.get('bundle_path')}: privacy scan terms: {', '.join(hits)}")
        manifest_hits = entry.get("privacy_scan_terms", [])
        if isinstance(manifest_hits, list) and sorted(manifest_hits) != sorted(hits):
            warnings.append(f"{entry.get('bundle_path')}: manifest privacy_scan_terms differ from current scan")

    report = {
        "bundle": str(bundle_dir),
        "checks": checks,
        "warnings": warnings,
        "errors": errors,
    }
    if args.json:
        print(json.dumps(report, indent=2, ensure_ascii=False))
    else:
        for check in checks:
            print(f"OK: {check}")
        for warning in warnings:
            print(f"WARN: {warning}")
        for error in errors:
            print(f"ERROR: {error}")
        if errors:
            print(f"Contribution bundle verification failed: {len(errors)} error(s)")
        else:
            suffix = f", {len(warnings)} warning(s)" if warnings else ""
            print(f"Contribution bundle verification passed{suffix}")

    if args.fail_on_risky and warnings:
        return 1
    return 1 if errors else 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="command", required=True)

    new_parser = subparsers.add_parser("new", help="create a feedback record")
    new_parser.add_argument("--out", default="docs/nwn-skill-pack/knowledge-inbox/incoming")
    new_parser.add_argument("--domain", required=True, choices=sorted(ALLOWED_DOMAINS))
    new_parser.add_argument("--title", required=True)
    new_parser.add_argument("--summary", required=True)
    new_parser.add_argument("--source-type", required=True, choices=sorted(ALLOWED_SOURCE_TYPES))
    new_parser.add_argument("--status", default="unverified", choices=sorted(ALLOWED_STATUSES))
    new_parser.add_argument("--nwn-version", default="")
    new_parser.add_argument("--server-context", default="")
    new_parser.add_argument("--evidence", action="append", required=True)
    new_parser.add_argument("--files-or-scripts", action="append", default=[])
    new_parser.add_argument("--runtime-steps", action="append", default=[])
    new_parser.add_argument("--failure-mode", default="")
    new_parser.add_argument("--proposed-file", required=True)
    new_parser.add_argument("--proposed-summary", required=True)
    new_parser.add_argument("--notes", default="")
    new_parser.set_defaults(func=command_new)

    validate_parser = subparsers.add_parser("validate", help="validate feedback records")
    validate_parser.add_argument("paths", nargs="+")
    validate_parser.set_defaults(func=command_validate)

    review_parser = subparsers.add_parser("review", help="write a reviewed copy with maintainer decision metadata")
    review_parser.add_argument("record")
    review_parser.add_argument("--out", default="docs/nwn-skill-pack/knowledge-inbox/reviewed")
    review_parser.add_argument("--reviewer", required=True)
    review_parser.add_argument(
        "--decision",
        required=True,
        choices=sorted(ALLOWED_REVIEW_DECISIONS),
    )
    review_parser.add_argument(
        "--status",
        required=True,
        choices=sorted(ALLOWED_STATUSES),
        help="reviewed record status after the decision",
    )
    review_parser.add_argument("--promotion-ready", action="store_true")
    review_parser.add_argument("--target-reference", default="")
    review_parser.add_argument("--required-action", action="append", default=[])
    review_parser.add_argument("--notes", default="")
    review_parser.set_defaults(func=command_review)

    aggregate_parser = subparsers.add_parser("aggregate", help="write a markdown aggregate")
    aggregate_parser.add_argument("input")
    aggregate_parser.add_argument("--out", default="docs/nwn-skill-pack/knowledge-inbox/reviewed/aggregate.md")
    aggregate_parser.add_argument("--include-invalid", action="store_true")
    aggregate_parser.set_defaults(func=command_aggregate)

    bundle_parser = subparsers.add_parser("bundle", help="copy validated feedback records into a sendable contribution bundle")
    bundle_parser.add_argument("paths", nargs="+", help="feedback record files or directories")
    bundle_parser.add_argument("--out", default="docs/nwn-skill-pack/.codex-tmp/contribution-bundle")
    bundle_parser.add_argument("--bundle-id", default="")
    bundle_parser.add_argument("--force", action="store_true", help="replace an existing output directory")
    bundle_parser.add_argument("--fail-on-risky", action="store_true", help="fail if simple privacy scan terms are present")
    bundle_parser.set_defaults(func=command_bundle)

    verify_bundle_parser = subparsers.add_parser("verify-bundle", help="verify a received contribution bundle manifest, hashes, and feedback records")
    verify_bundle_parser.add_argument("bundle", help="path to a contribution bundle directory")
    verify_bundle_parser.add_argument("--json", action="store_true", help="emit JSON report")
    verify_bundle_parser.add_argument("--fail-on-risky", action="store_true", help="fail if privacy scan warnings are present")
    verify_bundle_parser.set_defaults(func=command_verify_bundle)

    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
